import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public teaser data for a shared event link — deliberately a narrow column
// list. virtual_url in particular must never appear here: the app only
// reveals it to paid/registered attendees, and this route bypasses RLS via
// the service-role client, so it has to enforce that itself.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, title, description, event_date, end_date, location, venue_name, is_virtual, image_url, is_paid, price, currency, timezone, visibility, allow_guest_rsvp")
    .eq("id", id)
    .single();

  if (!event || event.visibility === "leads_only") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id: eventId, title, description, event_date, end_date, location, venue_name, is_virtual, image_url, is_paid, price, currency, timezone, allow_guest_rsvp } = event;

  // "N going" social proof — a count only, no names/emails, so it's safe to
  // show anonymous visitors. Both tallies are cheap head-count queries.
  const [{ count: memberCount }, { count: guestCount }] = await Promise.all([
    admin.from("event_rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
    admin.from("event_guest_rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
  ]);

  // virtual_url deliberately excluded here (same as before) — even for a
  // guest-open event, the join link is only revealed after a successful
  // RSVP (see /api/events/[id]/guest-rsvp), not to anyone browsing the page.
  return NextResponse.json({
    id: eventId, title, description, event_date, end_date, location, venue_name, is_virtual,
    image_url, is_paid, price, currency, timezone, allow_guest_rsvp,
    going_count: (memberCount ?? 0) + (guestCount ?? 0),
  });
}
