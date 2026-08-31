import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// Search tools for the "Ask TALK" site-search chat (app/api/ai-search,
// app/(app)/search). Each tool runs against the *caller's own* session-scoped
// Supabase client (not the admin client) — every table here already has an
// "approved members only" RLS policy, so results are automatically limited
// to what that member could see browsing the site themselves. No extra
// visibility logic needed here.

const RESULT_LIMIT = 6;

// Escapes characters that would otherwise break PostgREST's or()/ilike
// pattern syntax (comma, parens act as filter-grammar delimiters; * and %
// are ilike wildcards). Keeps free-text member queries from mangling the
// query or matching more broadly than intended.
function sanitizeForIlike(q: string): string {
  return q.replace(/[,()%*]/g, " ").trim();
}

export function getSearchTools(): Anthropic.Tool[] {
  return [
    {
      name: "search_events",
      description:
        "Search TALK events (past and upcoming), both virtual and in-person, by title/description keywords.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for" },
        },
        required: ["query"],
      },
    },
    {
      name: "search_jobs",
      description: "Search active job postings on the TALK job board by title, company, or description keywords.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for" },
        },
        required: ["query"],
      },
    },
    {
      name: "search_forum",
      description: "Search TALK community forum discussions by title or body keywords.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for" },
        },
        required: ["query"],
      },
    },
    {
      name: "search_members",
      description: "Search the TALK member directory by name, company, or title.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for" },
        },
        required: ["query"],
      },
    },
    {
      name: "search_vendors",
      description: "Search the TALK vendor directory by name, category, or description.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for" },
        },
        required: ["query"],
      },
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runSearchTool(supabase: SupabaseClient<any>, name: string, input: unknown): Promise<string> {
  const query = typeof input === "object" && input && "query" in input ? String((input as { query: unknown }).query) : "";
  const like = `%${sanitizeForIlike(query)}%`;

  try {
    switch (name) {
      case "search_events": {
        const { data } = await supabase
          .from("events")
          .select("id,title,description,event_date,is_virtual,location,status")
          .eq("status", "published")
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order("event_date", { ascending: false })
          .limit(RESULT_LIMIT);
        return JSON.stringify(
          (data ?? []).map((e) => ({
            title: e.title,
            date: e.event_date,
            location: e.is_virtual ? "Virtual" : e.location,
            url: `/events/${e.id}`,
          })),
        );
      }
      case "search_jobs": {
        const { data } = await supabase
          .from("job_posts")
          .select("id,title,company,location,is_remote,status")
          .eq("status", "active")
          .or(`title.ilike.${like},company.ilike.${like},description.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(RESULT_LIMIT);
        return JSON.stringify(
          (data ?? []).map((j) => ({
            title: j.title,
            company: j.company,
            location: j.is_remote ? "Remote" : j.location,
            url: `/jobs/${j.id}`,
          })),
        );
      }
      case "search_forum": {
        const { data } = await supabase
          .from("forum_topics")
          .select("id,title,body,created_at,forum_categories(slug)")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(RESULT_LIMIT);
        return JSON.stringify(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data ?? []).map((t: any) => ({
            title: t.title,
            snippet: String(t.body ?? "").slice(0, 160),
            url: `/forum/${t.forum_categories?.slug ?? "general"}/${t.id}`,
          })),
        );
      }
      case "search_members": {
        const { data } = await supabase
          .from("profiles")
          .select("id,full_name,title,company")
          .eq("status", "approved")
          .eq("is_bot", false)
          .or(`full_name.ilike.${like},company.ilike.${like},title.ilike.${like}`)
          .limit(RESULT_LIMIT);
        return JSON.stringify(
          (data ?? []).map((m) => ({
            name: m.full_name,
            title: m.title,
            company: m.company,
            url: `/members/${m.id}`,
          })),
        );
      }
      case "search_vendors": {
        const { data } = await supabase
          .from("vendors")
          .select("id,name,description,category")
          .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
          .limit(RESULT_LIMIT);
        return JSON.stringify(
          (data ?? []).map((v) => ({
            name: v.name,
            category: v.category,
            url: `/vendors/${v.id}`,
          })),
        );
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "Search failed" });
  }
}
