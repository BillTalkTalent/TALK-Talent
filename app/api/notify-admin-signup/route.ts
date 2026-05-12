import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = await createClient();

    // Verify the user is real and pending
    const { data: newMember } = await supabase
      .from("profiles")
      .select("full_name, email, linkedin_url, status")
      .eq("id", userId)
      .single();

    if (!newMember || newMember.status !== "pending") {
      return NextResponse.json({ ok: true }); // Silently skip
    }

    // Fetch all admin users to notify
    const adminDb = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: admins } = await (adminDb as any)
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "admin")
      .eq("status", "approved");

    if (!admins || admins.length === 0) {
      // No admins found — also try the ADMIN_EMAIL env var
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return NextResponse.json({ ok: true });

      const resend = new Resend(process.env.RESEND_API_KEY);
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://talk-talent.vercel.app";
      const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";

      await resend.emails.send({
        from,
        to: adminEmail,
        subject: `New TALK application: ${newMember.full_name ?? newMember.email}`,
        html: buildAdminEmail(newMember, origin),
      });

      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://talk-talent.vercel.app";
    const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";

    await Promise.allSettled(
      admins.map((admin: { email: string }) =>
        resend.emails.send({
          from,
          to: admin.email,
          subject: `New TALK application: ${newMember.full_name ?? newMember.email}`,
          html: buildAdminEmail(newMember, origin),
        })
      )
    );

    // Also insert in-app notification for each admin
    await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admins as Array<{ id?: string; email: string }>).map((admin) => {
        if (!admin.id) return Promise.resolve();
        return (adminDb as any).from("notifications").insert({
          user_id: admin.id,
          type: "new_member",
          title: "New membership application",
          body: `${newMember.full_name ?? "Someone"} applied to join TALK.`,
          link: "/admin",
          is_read: false,
        });
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-admin-signup]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

type NewMember = {
  full_name: string | null;
  email: string | null;
  linkedin_url: string | null;
};

function buildAdminEmail(member: NewMember, origin: string): string {
  const reviewUrl = `${origin}/admin`;
  const name = member.full_name ?? "Unknown";
  const email = member.email ?? "—";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:24px 32px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
          <span style="display:inline-block;width:5px;height:5px;background:#00d4aa;border-radius:50%;vertical-align:super;margin-left:1px;"></span>
          <span style="margin-left:12px;font-size:12px;font-weight:600;color:#ffffff80;letter-spacing:0.05em;text-transform:uppercase;">Admin Alert</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0d0d0d;">New membership application 📋</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            A new user has applied to join the TALK community and is awaiting your review.
          </p>

          <!-- Member details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f3f4f6;">
                Applicant
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;">
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">${name}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${email}</p>
                ${member.linkedin_url
                  ? `<a href="${member.linkedin_url}" style="font-size:13px;color:#0077B5;text-decoration:none;">${member.linkedin_url.replace("https://", "")}</a>`
                  : '<p style="margin:0;font-size:13px;color:#d1d5db;font-style:italic;">No LinkedIn provided</p>'}
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#0d0d0d,#1a1a2e);border-radius:10px;">
              <a href="${reviewUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                Review in Admin Panel →
              </a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
            You're receiving this because you're an admin of the TALK community.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#d1d5db;">
            TALK Talent Community &bull; <a href="${origin}" style="color:#d1d5db;">${origin.replace("https://", "")}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
