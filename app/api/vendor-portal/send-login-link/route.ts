import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMagicLink } from "@/lib/magic-link";
import { Resend } from "resend";

// The vendor-portal login form used to call supabase.auth.signInWithOtp()
// directly, which lands on /auth/callback — a route that consumes the
// single-use code the instant it's GET-requested. Corporate email security
// scanners (Microsoft Safe Links, Mimecast, Proofpoint) pre-fetch links
// before a human ever clicks, silently burning it within minutes. This
// mirrors the fix already applied to member/vendor-invite emails
// (lib/magic-link.ts): land on /auth/magic-link instead, which defers
// verification to a deliberate button click.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (admin as any)
    .from("vendor_accounts")
    .select("full_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  // Same response whether or not an account exists, so this can't be used
  // to enumerate vendor contacts' emails.
  if (account) {
    const loginUrl = await buildMagicLink(admin, normalizedEmail, `${origin}/vendor-portal`, origin);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
      to: normalizedEmail,
      subject: "Your TALK vendor portal sign-in link",
      html: `<p>Hi ${account.full_name?.split(" ")[0] ?? "there"},</p>
        <p><a href="${loginUrl}">Click here to sign in</a> to your TALK vendor portal (this link works once).</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
