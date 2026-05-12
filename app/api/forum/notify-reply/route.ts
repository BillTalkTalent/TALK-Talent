import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

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
    const notifTitle = `${replierName} replied to "${topic.title}"`;

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
          await resend.emails.send({
            from,
            to: recipient.email,
            subject: `${replierName} replied to a discussion on TALK`,
            html: buildReplyNotificationEmail(firstName, replierName, topic.title, replyBody, topicUrl, origin),
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

function buildReplyNotificationEmail(
  firstName: string,
  replierName: string,
  topicTitle: string,
  replyBody: string,
  topicUrl: string,
  origin: string,
): string {
  const truncatedBody =
    replyBody.length > 300 ? replyBody.slice(0, 297) + "…" : replyBody;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo header -->
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:24px 40px;text-align:center;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0d0d0d;">
            New reply on your post
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hi ${firstName}, <strong style="color:#0d0d0d;">${replierName}</strong> replied to your topic
            &ldquo;<em>${topicTitle}</em>&rdquo;.
          </p>

          <!-- Reply preview -->
          <div style="border-left:3px solid #00d4aa;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${truncatedBody}</p>
          </div>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#00b894,#00d4aa);border-radius:10px;">
              <a href="${topicUrl}"
                style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:10px;">
                View the conversation →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            You received this because you started a topic on the TALK community forum.<br>
            <a href="${origin}/profile" style="color:#9ca3af;">Manage your account</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace("https://", "")}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
