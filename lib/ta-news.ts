import Anthropic from "@anthropic-ai/sdk";

export type TaNewsDraft = { title: string; body: string };

const PROMPT = (today: string) => `You're drafting a discussion-starter post for TALK, a private community for Talent Acquisition (TA) leaders and recruiters.

Use web search to find real Talent Acquisition, recruiting, hiring, and job-market news from the last 24 hours (today is ${today}). Prioritize: layoffs/hiring trends, new recruiting/HR-tech and AI tools, labor market data releases, notable TA leadership moves, and recruiting industry commentary. Only include items you actually found through search just now — never invent a story or a source.

Write the post in plain text (no markdown, no asterisks, no headers) with:
- One punchy title line
- 3-5 short items, each 1-2 sentences, each followed on its own line by "Source: <url>"
- One open-ended question at the end to spark discussion among TA leaders

Respond in exactly this format and nothing else:
TITLE: <title text>
BODY:
<body text>`;

/**
 * Researches the last 24h of TA/recruiting news via Claude's web_search tool
 * and returns a ready-to-post forum title + body. Shared by the automated
 * digest cron job and the admin-facing draft-for-review assistant.
 */
export async function researchTaNews(): Promise<TaNewsDraft> {
  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [{ role: "user", content: PROMPT(today) }],
  });

  const final = await stream.finalMessage();
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const titleMatch = text.match(/TITLE:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

  return {
    title: titleMatch?.[1]?.trim() || `TA News Roundup — ${today}`,
    body: bodyMatch?.[1]?.trim() || text || "No summary was generated.",
  };
}
