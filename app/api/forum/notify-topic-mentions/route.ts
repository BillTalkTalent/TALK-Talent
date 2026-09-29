import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractMentionedUserIds, mentionsToPlainText } from "@/lib/mentions";
import { notifyMentions } from "@/lib/forum-mention-notify";

// Counterpart to app/api/forum/notify-reply's mention handling, for a brand
// new topic instead of a reply — the async pending_topic_notifications
// pipeline (migration 090) already fans a generic "new topic" notice out
// to the whole audience, but that's not the same as "someone specifically
// tagged you," which deserves its own notification regardless.
export async function POST(req: NextRequest) {
  try {
    const { topicId, body, title, categorySlug } = await req.json();
    if (!topicId || !body || !title) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mentionedIds = extractMentionedUserIds(body).filter((id) => id !== user.id);
    if (mentionedIds.length === 0) return NextResponse.json({ ok: true, mentioned: 0 });

    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const actorName = authorProfile?.full_name ?? "A community member";
    const plainBody = mentionsToPlainText(body);
    const preview = plainBody.length > 100 ? plainBody.slice(0, 97) + "…" : plainBody;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any;
    await notifyMentions({
      adminDb,
      mentionedUserIds: mentionedIds,
      excludeUserId: user.id,
      actorName,
      contextTitle: title,
      relativeLink: `/forum/${categorySlug ?? ""}/${topicId}`,
      contentPreview: preview,
    });

    return NextResponse.json({ ok: true, mentioned: mentionedIds.length });
  } catch (err) {
    console.error("[notify-topic-mentions]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
