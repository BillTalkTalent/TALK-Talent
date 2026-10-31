import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyFoundersActivity } from "@/lib/founders-notify";

// Called client-side right after a successful RLS insert (same pattern as
// app/api/forum/notify-topic-mentions) — the actor is read from the
// server's own session, never trusted from the request body.
const KIND_META: Record<string, { type: string; verb: string }> = {
  suggestion: { type: "founders_suggestion", verb: "posted a new idea" },
  topic: { type: "founders_suggestion", verb: "posted a new topic" },
  discussion: { type: "founders_discussion", verb: "started a new discussion" },
  opportunity: { type: "founders_opportunity", verb: "posted a volunteer opportunity" },
  file: { type: "founders_file", verb: "shared a file" },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kind, title, link } = await req.json();
  const meta = KIND_META[kind];
  if (!meta || typeof title !== "string" || typeof link !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const actorName = profile?.full_name ?? "A founding member";

  await notifyFoundersActivity({
    actorId: user.id,
    type: meta.type,
    title: `${actorName} ${meta.verb}: "${title}"`,
    body: title,
    relativeLink: link,
  });

  return NextResponse.json({ ok: true });
}
