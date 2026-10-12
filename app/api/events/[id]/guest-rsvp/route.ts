import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { buildGuestPendingEmail } from "@/lib/guest-rsvp-email";

// Public — no TALK account needed. Only works for an event an admin has
// explicitly opted into guest RSVPs (events.allow_guest_rsvp), which is the
// per-event toggle that keeps this from quietly opening every event to
// non-members. See migration 083.
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isLinkedIn = (s: string) => /linkedin\.com\//i.test(s);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { fullName, email, linkedinUrl, company } = await req.json();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

  // Rate limit: cap at 8 guest RSVP submissions per IP per 10 minutes,
  // across all events — guest RSVP now defaults to on everywhere (migration
  // 086), so this endpoint is reachable from every event page, not just the
  // few that opted in before. Fails OPEN if the tracking table or query
  // errors, same as the existing recovery-endpoint rate limit, so a bug here
  // can never block a real RSVP.
  try {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await adminDb
      .from("guest_rsvp_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if (ip && (count ?? 0) >= 8) {
      return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
    }
    await adminDb.from("guest_rsvp_attempts").insert({ ip, event_id: eventId });
  } catch {
    /* table missing or transient error — fail open and allow the RSVP */
  }

  // Honeypot: a hidden field no real visitor sees or fills, but a naive
  // form-filling bot will. Pretend success without touching the DB or
  // sending an email — don't tip the bot off that it was caught.
  if (typeof company === "string" && company.trim()) {
    return NextResponse.json({ ok: true, rsvpId: "00000000-0000-0000-0000-000000000000", status: "pending" });
  }

  const name = (fullName ?? "").trim();
  const mail = (email ?? "").trim().toLowerCase();
  const li = (linkedinUrl ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isEmail(mail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!isLinkedIn(li)) return NextResponse.json({ error: "Enter a valid LinkedIn profile URL." }, { status: 400 });

  const { data: event } = await adminDb
    .from("events")
    .select("id, title, allow_guest_rsvp, status, event_date")
    .eq("id", eventId)
    .single();

  if (!event || !event.allow_guest_rsvp || event.status === "cancelled") {
    return NextResponse.json({ error: "This event isn't accepting guest RSVPs." }, { status: 404 });
  }
  if (new Date(event.event_date) < new Date()) {
    return NextResponse.json({ error: "This event has already happened." }, { status: 400 });
  }

  // Starts as 'pending' — an admin has to approve it before it's a real
  // "going" RSVP. See migration 099.
  const { data: rsvpRow, error } = await adminDb
    .from("event_guest_rsvps")
    .upsert(
      { event_id: eventId, full_name: name, email: mail, linkedin_url: li, status: "pending" },
      { onConflict: "event_id,email" }
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

  // Best-effort holding email — a failed send shouldn't fail the RSVP.
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
      to: mail,
      subject: `We got your RSVP: ${event.title}`,
      html: buildGuestPendingEmail({ firstName: name.split(" ")[0], eventTitle: event.title, eventId, origin }),
    });
  } catch {
    // Notification failure shouldn't block the RSVP itself.
  }

  // Best-effort admin alert so a pending RSVP doesn't just sit unreviewed —
  // same opt-in flag used for new-member alerts, since both are "someone
  // new wants in and needs your review."
  try {
    const { data: admins } = await adminDb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .eq("status", "approved")
      .eq("receive_new_member_alerts", true);

    if (admins && admins.length > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
      const reviewUrl = `${origin}/admin/guest-rsvps`;

      await Promise.allSettled(
        admins.map((a: { email: string }) =>
          resend.emails.send({
            from,
            replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
            to: a.email,
            subject: `New guest RSVP to review: ${event.title}`,
            html: `<p>${name} (${mail}) just RSVPed to <strong>${event.title}</strong> and is waiting on your review.</p><p><a href="${reviewUrl}">Review in Admin Panel →</a></p>`,
          })
        )
      );

      await Promise.allSettled(
        admins.map((a: { id: string }) =>
          adminDb.from("notifications").insert({
            user_id: a.id,
            type: "guest_rsvp_pending",
            title: "New guest RSVP to review",
            body: `${name} RSVPed to ${event.title}.`,
            link: "/admin/guest-rsvps",
            is_read: false,
          })
        )
      );
    }
  } catch {
    // Admin alert failure shouldn't block the RSVP itself.
  }

  // Location/virtual-link details are withheld until an admin approves —
  // revealing them here, before review, would defeat the point of the gate.
  return NextResponse.json({ ok: true, rsvpId: rsvpRow.id, status: "pending" });
}
