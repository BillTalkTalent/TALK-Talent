import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getSearchTools, runSearchTool } from "@/lib/ai-search-tools";

// Answers, streamed, can legitimately take a few tool round-trips.
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the "Ask TALK" search assistant for TALK, a private community for Talent Acquisition (TA) leaders.

You help members find things across the site: events (past and upcoming), job postings, forum discussions, other members, and vendors. Use the search tools to look things up before answering — never invent an event, job, member, forum post, vendor, or link. If nothing relevant turns up, say so plainly and suggest they try different terms, rather than guessing.

Keep answers short and skimmable. When you reference something you found, include its relative link (e.g. /events/{id}) so the member can click straight through. If a query could mean more than one content type (e.g. "AI" could be a job, an event, or a forum thread), search the relevant tools and summarize across them rather than picking just one.`;

// A member typing garbage or an extremely long paste shouldn't turn into a
// giant/slow request — same order-of-magnitude cap the newsletter/signup
// text fields use elsewhere in this app.
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 6;

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile?.status !== "approved") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => null);
  const rawMessages = Array.isArray(body?.messages) ? (body.messages as ChatTurn[]) : null;
  if (!rawMessages || rawMessages.length === 0) {
    return new Response("Missing messages", { status: 400 });
  }

  const turns = rawMessages
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return new Response("Last message must be from the user", { status: 400 });
  }

  const client = new Anthropic();
  const tools = getSearchTools();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        const messages: Anthropic.MessageParam[] = turns.map((t) => ({ role: t.role, content: t.content }));

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const anthropicStream = client.messages.stream({
            model: "claude-opus-5",
            max_tokens: 2048,
            // Retrieval Q&A over a handful of small lookups doesn't need deep
            // reasoning — low effort keeps answers fast and cheap without
            // hurting quality here.
            output_config: { effort: "low" },
            system: SYSTEM_PROMPT,
            tools,
            messages,
          });

          anthropicStream.on("text", (delta) => send(delta));

          const message = await anthropicStream.finalMessage();
          messages.push({ role: "assistant", content: message.content });

          if (message.stop_reason === "pause_turn") continue;
          if (message.stop_reason !== "tool_use") break;

          const toolUseBlocks = message.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (tool) => ({
              type: "tool_result" as const,
              tool_use_id: tool.id,
              content: await runSearchTool(supabase, tool.name, tool.input),
            })),
          );

          messages.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        console.error("[ai-search] error:", err);
        send("\n\nSomething went wrong on my end — please try again.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
