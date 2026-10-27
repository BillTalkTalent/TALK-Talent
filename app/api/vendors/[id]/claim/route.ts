import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

// Public — no TALK account needed. Anyone with a vendor's claim link
// (migration 107) can ask to manage that listing; nothing here creates a
// login or touches the vendor row — it only queues a request for an admin
// to review and approve from app/admin/vendors.
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: vendorId } = await params;
  const { fullName, email, title, note, company } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Honeypot: a hidden field no real visitor sees or fills, but a naive
  // form-filling bot will. Pretend success without touching the DB.
  if (typeof company === "string" && company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = (fullName ?? "").trim();
  const mail = (email ?? "").trim().toLowerCase();

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isEmail(mail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const { data: vendor } = await admin.from("vendors").select("id, name").eq("id", vendorId).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });

  // Rate limit: cap at 5 claim submissions per email per hour, across all
  // vendors — same fail-open approach as the guest-RSVP limiter, so a bug
  // here can never block a real request.
  try {
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await admin
      .from("vendor_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", mail)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  } catch {
    /* transient error — fail open and allow the request */
  }

  const { error } = await admin.from("vendor_claim_requests").insert({
    vendor_id: vendorId,
    full_name: name,
    email: mail,
    title: (title ?? "").trim() || null,
    note: (note ?? "").trim() || null,
  });
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

  // Best-effort confirmation to the submitter — a failed send shouldn't fail the request.
  try {
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
      to: mail,
      subject: `We got your request to claim ${vendor.name} on TALK`,
      html: `<p>Hi ${name.split(" ")[0]},</p><p>We got your request to manage <strong>${vendor.name}</strong>'s listing in the TALK vendor directory. We'll review it and email you login instructions once it's approved.</p>`,
    });
  } catch {
    /* notification failure shouldn't block the request */
  }

  // Best-effort admin alert so a pending claim doesn't just sit unreviewed.
  try {
    const { data: admins } = await admin
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .eq("status", "approved")
      .eq("receive_new_member_alerts", true);

    if (admins && admins.length > 0) {
      const reviewUrl = `${origin}/admin/vendors`;
      await Promise.allSettled(
        admins.map((a: { email: string }) =>
          resend.emails.send({
            from,
            replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
            to: a.email,
            subject: `Vendor claim request: ${vendor.name}`,
            html: `<p>${name} (${mail}) wants to claim and manage <strong>${vendor.name}</strong>'s listing.</p><p><a href="${reviewUrl}">Review in Admin Panel →</a></p>`,
          })
        )
      );
    }
  } catch {
    /* admin alert failure shouldn't block the request */
  }

  return NextResponse.json({ ok: true });
}
