import { Resend } from "resend";
import { emailShell, ctaButton, quoteBlock } from "@/lib/email";
import { loadPrefs, wants } from "@/lib/notification-prefs";

// Shared by app/api/forum/notify-reply (reply mentions) and
// app/api/forum/notify-topic-mentions (new-topic mentions) — same
// in-app + email shape, gated by its own push_mentions/email_mentions
// preference (migration 097) rather than push_forum_replies/
// push_forum_topics, since someone can want "tell me when I'm tagged"
// independently of general topic/reply notifications.
export async function notifyMentions(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminDb: any;
  mentionedUserIds: string[];
  excludeUserId: string;
  actorName: string;
  contextTitle: string;
  relativeLink: string;
  contentPreview: string;
}): Promise<void> {
  const ids = [...new Set(opts.mentionedUserIds)].filter((id) => id !== opts.excludeUserId);
  if (ids.length === 0) return;

  const { data: recipients } = await opts.adminDb
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  if (!recipients || recipients.length === 0) return;

  const prefs = await loadPrefs(opts.adminDb, ids);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";
  const shortTitle = opts.contextTitle.length > 60 ? `${opts.contextTitle.slice(0, 57)}…` : opts.contextTitle;

  await Promise.allSettled(
    (recipients as { id: string; full_name: string | null; email: string | null }[]).map(async (r) => {
      const firstName = r.full_name?.split(" ")[0] ?? "there";

      if (wants(prefs, r.id, "push_mentions")) {
        await opts.adminDb.from("notifications").insert({
          user_id: r.id,
          type: "forum_mention",
          title: `${opts.actorName} mentioned you in "${shortTitle}"`,
          body: opts.contentPreview,
          link: opts.relativeLink,
          is_read: false,
        });
      }

      if (r.email && wants(prefs, r.id, "email_mentions")) {
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
          to: r.email,
          subject: `${opts.actorName} mentioned you on TALK`,
          html: emailShell(`
            <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">You were mentioned</p>
            <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
              Hi ${firstName}, <strong style="color:#0F1F35;">${opts.actorName}</strong> mentioned you in
              &ldquo;<em>${opts.contextTitle}</em>&rdquo;.
            </p>
            ${quoteBlock(opts.contentPreview)}
            ${ctaButton("View it on TALK", `${origin}${opts.relativeLink}`)}
          `),
        });
      }
    })
  );
}
