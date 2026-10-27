import { createAdminClient } from "@/lib/supabase/admin";

// Shared by the admin "Invite manager" action (app/admin/vendors/page.tsx)
// and vendor claim-request approval: creates (or reuses) the auth user for
// an email, links it to the vendor via vendor_accounts, and emails a magic
// sign-in link straight into /vendor-portal.
export async function createVendorAccountAndInvite(vendorId: string, email: string, fullName: string) {
  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

  // vendor_accounts is deliberately NOT a profiles row (migration 076) — a
  // vendor contact isn't a TALK member. But generateLink on a brand-new
  // email fires handle_new_user (migration 095), which always inserts one
  // (pending, so it'd otherwise sit in the member-approval queue). Check
  // first so we know whether to clean that unwanted row up afterward,
  // without touching a real member's profile if this contact happens to
  // already be one.
  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

  // handle_new_user (migration 095) requires a name or LinkedIn URL on any
  // brand-new auth.users row — pass full_name through so a vendor contact
  // who isn't already a TALK member doesn't fail account creation outright.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/vendor-portal`, data: { full_name: fullName || email } },
  });
  if (linkError || !linkData?.user) {
    throw new Error(linkError?.message ?? "Could not create the vendor account");
  }

  if (!existingProfile) {
    await admin.from("profiles").delete().eq("id", linkData.user.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: acctError } = await (admin as any).from("vendor_accounts").upsert({
    id: linkData.user.id,
    vendor_id: vendorId,
    full_name: fullName || null,
    email,
  });
  if (acctError) throw new Error(acctError.message);

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
  const loginUrl = linkData.properties?.action_link ?? `${origin}/vendor-portal/login`;

  await resend.emails.send({
    from,
    replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
    to: email,
    subject: "You've been invited to manage your TALK vendor listing",
    html: `<p>Hi ${fullName || "there"},</p>
      <p>You've been invited to manage your company's listing in the TALK vendor directory — update your description, logo, contact info, and post updates members will see.</p>
      <p><a href="${loginUrl}">Click here to sign in</a> (this link works once and signs you straight in).</p>`,
  });
}
