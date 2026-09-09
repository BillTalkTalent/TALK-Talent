import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

// Public — no TALK account needed. Only works for an event an admin has
// explicitly opted into guest RSVPs (events.allow_guest_rsvp), which is the
// per-event toggle that keeps this from quietly opening every event to
// non-members. See migration 083.
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isLinkedIn = (s: string) => /linkedin\.com\//i.test(s);

function icsFor(event: { title: string; description: string | null; event_date: string; end_date: string | null; is_virtual: boolean; virtual_url: string | null; venue_name: string | null; location: string | null }): string {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location = event.is_virtual ? (event.virtual_url ?? "Online") : [event.venue_name, event.location].filter(Boolean).join(", ");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:${event.title}\r\nDTSTART:${fmt(event.event_date)}\r\nDTEND:${fmt(event.end_date ?? event.event_date)}\r\nDESCRIPTION:${(event.description ?? "").slice(0, 400).replace(/\r?\n/g, "\\n")}\r\nLOCATION:${location}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { fullName, email, linkedinUrl } = await req.json();

  const name = (fullName ?? "").trim();
  const mail = (email ?? "").trim().toLowerCase();
  const li = (linkedinUrl ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isEmail(mail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!isLinkedIn(li)) return NextResponse.json({ error: "Enter a valid LinkedIn profile URL." }, { status: 400 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;

  const { data: event } = await adminDb
    .from("events")
    .select("id, title, description, event_date, end_date, is_virtual, virtual_url, venue_name, location, allow_guest_rsvp, status")
    .eq("id", eventId)
    .single();

  if (!event || !event.allow_guest_rsvp || event.status === "cancelled") {
    return NextResponse.json({ error: "This event isn't accepting guest RSVPs." }, { status: 404 });
  }
  if (new Date(event.event_date) < new Date()) {
    return NextResponse.json({ error: "This event has already happened." }, { status: 400 });
  }

  const { error } = await adminDb
    .from("event_guest_rsvps")
    .upsert(
      { event_id: eventId, full_name: name, email: mail, linkedin_url: li, status: "going" },
      { onConflict: "event_id,email" }
    );

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });

  // Best-effort confirmation — a failed email shouldn't fail the RSVP.
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL ?? "TALK Community <onboarding@resend.dev>";
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";
    const when = new Date(event.event_date).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? "bill@talktalent.com",
      to: mail,
      subject: `You're going: ${event.title}`,
      html: `
        <p>Hi ${name.split(" ")[0]},</p>
        <p>You're confirmed for <strong>${event.title}</strong> — ${when}.</p>
        <p><a href="${origin}/events/${eventId}">View event details</a></p>
        <p>A calendar invite is attached.</p>
      `,
      attachments: [{ filename: "event.ics", content: icsFor(event) }],
    });
  } catch {
    // Notification failure shouldn't block the RSVP itself.
  }

  // Only revealed now, post-RSVP — not to anyone browsing the public page.
  return NextResponse.json({
    ok: true,
    is_virtual: event.is_virtual,
    virtual_url: event.is_virtual ? event.virtual_url : null,
    venue_name: event.venue_name,
    location: event.location,
  });
}
