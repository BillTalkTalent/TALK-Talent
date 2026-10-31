import { Resend } from "resend";
import { emailShell, ctaButton, quoteBlock } from "@/lib/email";
import { loadPrefs, wants } from "@/lib/notification-prefs";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any;

function sendEmail(adminDb: AdminDb, to: string, subject: string, title: string, body: string, relativeLink: string, firstName: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";
  return resend.emails.send({
    from,
    replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
    to,
    subject,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">${title}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">Hi ${firstName},</p>
      ${quoteBlock(body)}
      ${ctaButton("View it on TALK", `${origin}${relativeLink}`)}
    `),
  });
}

// Broadcasts "something new happened" to everyone else with Founders Hub
// access (founding members + admins) — the low-signal "activity" category:
// in-app by default, email off by default (migration 115).
export async function notifyFoundersActivity(opts: {
  actorId: string;
  type: string;
  title: string;
  body: string;
  relativeLink: string;
}) {
  const adminDb = createAdminClient() as AdminDb;

  const { data: recipients } = await adminDb
    .from("profiles")
    .select("id, full_name, email")
    .eq("status", "approved")
    .neq("id", opts.actorId)
    .or("is_founding_member.eq.true,role.eq.admin");
  if (!recipients || recipients.length === 0) return;

  const ids = (recipients as { id: string }[]).map((r) => r.id);
  const prefs = await loadPrefs(adminDb, ids);

  await Promise.allSettled(
    (recipients as { id: string; full_name: string | null; email: string | null }[]).map(async (r) => {
      if (wants(prefs, r.id, "push_founders_activity")) {
        await adminDb.from("notifications").insert({
          user_id: r.id,
          type: opts.type,
          title: opts.title,
          body: opts.body,
          link: opts.relativeLink,
          is_read: false,
        });
      }
      if (r.email && wants(prefs, r.id, "email_founders_activity", false)) {
        const firstName = r.full_name?.split(" ")[0] ?? "there";
        await sendEmail(adminDb, r.email, opts.title, opts.title, opts.body, opts.relativeLink, firstName);
      }
    }),
  );
}

// Notifies ONE specific person that someone replied/commented on (or
// changed the status of) their own Founders Hub post — the "replies"
// category: higher signal than general activity, so on by default for
// both in-app and email (migration 115).
export async function notifyFoundersReply(opts: {
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  body: string;
  relativeLink: string;
}) {
  if (opts.recipientId === opts.actorId) return;
  const adminDb = createAdminClient() as AdminDb;

  const { data: recipient } = await adminDb
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", opts.recipientId)
    .maybeSingle();
  if (!recipient) return;

  const prefs = await loadPrefs(adminDb, [opts.recipientId]);

  if (wants(prefs, opts.recipientId, "push_founders_replies")) {
    await adminDb.from("notifications").insert({
      user_id: opts.recipientId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      link: opts.relativeLink,
      is_read: false,
    });
  }
  if (recipient.email && wants(prefs, opts.recipientId, "email_founders_replies")) {
    const firstName = recipient.full_name?.split(" ")[0] ?? "there";
    await sendEmail(adminDb, recipient.email, opts.title, opts.title, opts.body, opts.relativeLink, firstName);
  }
}
