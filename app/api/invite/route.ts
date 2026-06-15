import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { buildClaimEmail } from "@/lib/email";

// "Add a beta tester" — one action that does the right thing automatically:
//   • already a member, never claimed (dormant) → email them a branded claim link
//   • already a member, already active          → no-op, tell the inviter
//   • brand new                                 → create a pending account that
//                                                 lands in the admin approval queue
type Outcome = "claim_sent" | "already_active" | "queued";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, name, message, inviterId } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const cleanEmail = String(email).toLowerCase().trim();

  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const redirectTo = `${origin}/auth/reset-password?claim=1`;

  // Probe whether the account already exists. generateLink(type:'recovery')
  // succeeds for existing users — and hands back a ready-to-use claim link —
  // and errors for non-members. So this one call is both the existence check
  // and the claim link, no separate user lookup needed.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo },
  });

  let outcome: Outcome;

  if (!linkErr && linkData?.properties?.action_link) {
    // ── Already has an account ──
    const existing = linkData.user;
    if (existing?.last_sign_in_at) {
      // They've already claimed and signed in before — nothing to send.
      outcome = "already_active";
    } else {
      // Dormant (imported but never claimed) — send the branded claim link.
      const fullName: string | null =
        existing?.user_metadata?.full_name ?? name ?? null;
      const firstName = fullName?.split(" ")[0] ?? "there";

      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
        to: cleanEmail,
        subject: "Welcome to the new TALK — claim your account",
        html: buildClaimEmail({ toFirstName: firstName, claimUrl: linkData.properties.action_link }),
      });
      outcome = "claim_sent";
    }
  } else {
    // ── Brand new — create a pending account for the approval queue ──
    const { error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { full_name: name ?? null, invited_by: user.id },
    });
    if (createError) {
      console.error("invite createUser error:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    outcome = "queued";
  }

  // Record it in the inviter's history.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;
  await adminDb.from("invitations").insert({
    inviter_id: inviterId,
    email: cleanEmail,
    name: name ?? null,
    message: message ?? null,
    status: outcome === "already_active" ? "accepted" : "sent",
  });

  return NextResponse.json({ success: true, outcome });
}
