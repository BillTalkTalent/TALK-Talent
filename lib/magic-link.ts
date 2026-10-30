import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Supabase's default magic-link action_link is single-use and gets silently
// burned by corporate email security scanners (Microsoft Safe Links,
// Mimecast, Proofpoint) that "detonate" links in a JS-less fetch before the
// real person ever clicks — leaving them a dead link within minutes of
// receiving it, not 24 hours later. lib/send-recovery-link.ts already
// solved exactly this for recovery/claim links by deferring verification to
// a deliberate user action (a form submit) instead of page load; this is
// the same fix applied to magic links (member welcome, vendor invite,
// profile nudge) — they land on /auth/magic-link, which defers to a button
// click instead of verifying on load.
export async function buildMagicLink(admin: AdminClient, email: string, redirectTo: string, origin: string) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error || !data?.properties?.hashed_token) return `${origin}/login`;
  // When the email belongs to a brand-new auth user (not an existing one),
  // Supabase classifies the token as "signup" regardless of the "magiclink"
  // type requested above — verifying it with the wrong type fails with
  // otp_expired even seconds after generation. verification_type is
  // whatever Supabase actually issued; /auth/magic-link must verify with
  // that, not assume "magiclink".
  const verificationType = data.properties.verification_type ?? "magiclink";
  return `${origin}/auth/magic-link?token_hash=${data.properties.hashed_token}&type=${verificationType}&redirect_to=${encodeURIComponent(redirectTo)}`;
}
