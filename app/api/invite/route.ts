import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, name, message, inviterId } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // Check they haven't already invited this email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: existing } = await db
    .from("invitations")
    .select("id")
    .eq("inviter_id", user.id)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You've already sent an invite to this email address." },
      { status: 400 }
    );
  }

  // Get the inviter's profile so we can personalise the email
  const { data: inviterProfile } = await db
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const inviterName: string = inviterProfile?.full_name ?? "A member of the TALK community";
  const origin = req.headers.get("origin") ?? "https://talk-talent.vercel.app";

  // Generate an invite link via Supabase admin (no email sent by Supabase)
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  let inviteLink = `${origin}/signup`;

  const { data: linkData, error: linkError } = await adminAny.auth.admin.generateLink({
    type: "invite",
    email: email.toLowerCase(),
    options: {
      data: {
        invited_by: user.id,
        invitee_name: name ?? null,
      },
      redirectTo: `${origin}/dashboard`,
    },
  });

  console.log("generateLink result:", { linkData, linkError });

  if (linkError) {
    // If user already exists that's fine — just record and send a generic link
    if (!linkError.message?.includes("already been registered")) {
      console.error("generateLink error:", linkError);
      return NextResponse.json({ error: `generateLink failed: ${linkError.message}` }, { status: 500 });
    }
  } else if (linkData?.properties?.action_link) {
    inviteLink = linkData.properties.action_link;
  }

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  console.log("RESEND_API_KEY present:", !!resendKey);
  console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (resendKey) {
    const resend = new Resend(resendKey);
    const firstName = name ? name.split(" ")[0] : "there";
    const personalNote = message
      ? `<p style="margin:0 0 20px;color:#374151;line-height:1.6;font-style:italic;">"${message}"</p>`
      : "";

    const sendResult = await resend.emails.send({
      from: "TALK Community <noreply@resend.dev>",
      to: email,
      subject: `${inviterName} invited you to join TALK`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(90deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="display:inline-table;">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:34px;height:34px;background:#00d4aa;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="34" height="34" rx="9" fill="#00d4aa"/>
                    <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
                    <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
                  </svg>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">TALK</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">You're invited!</h1>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
            <strong style="color:#111827;">${inviterName}</strong> thinks you'd be a great fit for the TALK community — a private network for talent acquisition leaders.
          </p>

          ${personalNote}

          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:linear-gradient(135deg,#00b894,#00d4aa);border-radius:12px;padding:1px;">
              <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#00b894,#00d4aa);color:#0d0d0d;font-size:15px;font-weight:700;padding:14px 32px;border-radius:11px;text-decoration:none;">
                Accept your invitation →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;">Or copy and paste this link:</p>
          <p style="margin:0 0 28px;font-size:12px;color:#6b7280;word-break:break-all;">${inviteLink}</p>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            TALK is a curated community for TA leaders to connect, learn, and grow together.
            If you weren't expecting this invite, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TALK Community</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log("Resend send result:", sendResult);
  } else {
    // Fallback: try Supabase's built-in invite email
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invited_by: user.id, invitee_name: name ?? null },
      redirectTo: `${origin}/dashboard`,
    });
    if (inviteError && !inviteError.message.includes("already been registered")) {
      console.error("inviteUserByEmail error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
  }

  // Record the invite in the database
  await adminAny.from("invitations").insert({
    inviter_id: inviterId,
    email: email.toLowerCase(),
    name: name ?? null,
    message: message ?? null,
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
