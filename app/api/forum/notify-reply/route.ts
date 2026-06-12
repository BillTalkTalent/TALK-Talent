import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { emailShell, ctaButton, quoteBlock } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { topicId, replyBody, categorySlug } = await req.json();
    if (!topicId || !replyBody) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify caller is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch topic + its author's email
    const { data: topic } = await supabase
      .from("forum_topics")
      .select("id, title, author_id, profiles(id, full_name, email)")
      .eq("id", topicId)
      .single();

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    // Build the set of people to notify: topic author + all previous repliers
    // excluding the current user (who just posted)
    const topicAuthor = topic.profiles as { id: string; full_name: string | null; email: string | null } | null;

    // Fetch all previous replies to get unique replier IDs
    const { data: prevReplies } = await supabase
      .from("forum_replies")
      .select("author_id")
      .eq("topic_id", topicId);

    const prevReplierIds = [...new Set(
      (prevReplies ?? [])
        .map(r => r.author_id)
        .filter((id): id is string => !!id && id !== user.id)
    )];

    // Collect unique user IDs to notify (topic author + prior repliers, not the current replier)
    const notifyIds = [...new Set([
      ...(topicAuthor && topicAuthor.id !== user.id ? [topicAuthor.id] : []),
      ...prevReplierIds,
    ])];

    if (notifyIds.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no-recipients" });
    }

    // Fetch profiles of people to notify
    const { data: recipientProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", notifyIds);

    // Get replier's name
    const { data: replierProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const replierName = replierProfile?.full_name ?? "A community member";
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://talk-talent.vercel.app";
    const topicUrl = `${origin}/forum/${categorySlug ?? ""}/${topicId}`;
    const relativeLink = `/forum/${categorySlug ?? ""}/${topicId}`;
    const truncatedPreview = replyBody.length > 100 ? replyBody.slice(0, 97) + "…" : replyBody;
    const notifTitle = `${replierName} replied to "${topic.title.length > 60 ? topic.title.slice(0, 57) + "…" : topic.title}"`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any;

    // Insert in-app notifications + send emails to all recipients
    await Promise.allSettled(
      (recipientProfiles ?? []).map(async (recipient) => {
        const firstName = recipient.full_name?.split(" ")[0] ?? "there";

        // In-app notification — use admin client (service role) since RLS
        // restricts who can insert into notifications
        await adminDb.from("notifications").insert({
          user_id: recipient.id,
          type: "forum_reply",
          title: notifTitle,
          body: truncatedPreview,
          link: relativeLink,
          is_read: false,
        });

        // Email (only if they have an email)
        if (recipient.email) {
          const preview = replyBody.length > 300 ? replyBody.slice(0, 297) + "…" : replyBody;
          await resend.emails.send({
            from,
            replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
            to: recipient.email,
            subject: `${replierName} replied to a discussion on TALK`,
            html: emailShell(`
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">New reply on your post</p>
              <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
                Hi ${firstName}, <strong style="color:#0F1F35;">${replierName}</strong> replied to
                &ldquo;<em>${topic.title}</em>&rdquo;.
              </p>
              ${quoteBlock(preview)}
              ${ctaButton('View the conversation', topicUrl)}
            `),
          });
        }
      })
    );

    return NextResponse.json({ ok: true, notified: notifyIds.length });
  } catch (err) {
    console.error("[notify-reply]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

