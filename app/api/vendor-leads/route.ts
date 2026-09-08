import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

// Public — called from the /partners landing page, which has no session
// (a prospective vendor isn't a TALK member). Same shape as
// /api/notify-admin-signup: write with the service-role client, then email
// every admin so this doesn't just sit unseen in a queue.
export async function POST(request: Request) {
  const { companyName, contactName, contactEmail, website, message } = await request.json();

  if (!companyName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: "Company name and email are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("vendor_leads").insert({
    company_name: companyName.trim(),
    contact_name: contactName?.trim() || null,
    contact_email: contactEmail.trim(),
    website: website?.trim() || null,
    message: message?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Best-effort notification — a failed email shouldn't fail the submission.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: admins } = await (admin as any)
      .from("profiles")
      .select("email")
      .eq("role", "admin")
      .eq("status", "approved");

    const recipients = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);
    if (recipients.length === 0 && process.env.ADMIN_EMAIL) recipients.push(process.env.ADMIN_EMAIL);

    if (recipients.length > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

      await Promise.allSettled(
        recipients.map((to: string) =>
          resend.emails.send({
            from,
            replyTo: contactEmail.trim(),
            to,
            subject: `New vendor partner application: ${companyName.trim()}`,
            html: `
              <p>A new vendor partner application came in from the TALK homepage.</p>
              <p><strong>Company:</strong> ${companyName.trim()}</p>
              ${contactName?.trim() ? `<p><strong>Contact:</strong> ${contactName.trim()}</p>` : ""}
              <p><strong>Email:</strong> ${contactEmail.trim()}</p>
              ${website?.trim() ? `<p><strong>Website:</strong> ${website.trim()}</p>` : ""}
              ${message?.trim() ? `<p><strong>Message:</strong><br/>${message.trim().replace(/\n/g, "<br/>")}</p>` : ""}
              <p><a href="${origin}/admin/suggestions">Review it in the admin panel</a></p>
            `,
          })
        )
      );
    }
  } catch {
    // Notification failure shouldn't block the applicant seeing a success state.
  }

  return NextResponse.json({ ok: true });
}
