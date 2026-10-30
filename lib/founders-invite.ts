import { createClient } from "@/lib/supabase/server";

// The email alone, with no DB write and no guard — lets an admin resend the
// welcome note to someone already granted access (e.g. the flag was flipped
// before this email existed) without touching their access either way.
export async function sendFoundingMemberWelcomeEmail(profileId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", profileId).single();
  if (!profile) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";
  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  await resend.emails.send({
    from,
    replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
    to: profile.email,
    subject: "You've been added to the TALK Founders Hub",
    html: `<p>Hi ${firstName},</p>
      <p>You're now part of the TALK Founders Hub — the group helping Bill rebuild and relaunch TALK. Submit ideas, vote on priorities, join the discussion, pick up a volunteer task, and see who else is helping out.</p>
      <p><a href="${origin}/founders">Check it out →</a></p>`,
  });
}

// Shared by the admin flag toggle (app/admin/members/page.tsx) and
// nomination approval (app/admin/founders/page.tsx) — both grant the same
// thing, so both should notify the same way. Guarded on the CURRENT value
// so re-clicking an already-granted flag (or re-approving a nomination for
// someone already in) never sends a duplicate email.
export async function grantFoundingMemberAccess(profileId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = await db.from("profiles").select("is_founding_member").eq("id", profileId).single();
  if (!profile || profile.is_founding_member) return;

  await db.from("profiles").update({ is_founding_member: true }).eq("id", profileId);

  try {
    await sendFoundingMemberWelcomeEmail(profileId);
  } catch {
    // notification failure shouldn't block granting access
  }
}
