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
    .select("id, title, description, event_date, end_date, location, is_virtual, image_url, is_paid, price, currency, timezone, visibility")
    .eq("id", id)
    .single();

  if (!event || event.visibility === "leads_only") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id: eventId, title, description, event_date, end_date, location, is_virtual, image_url, is_paid, price, currency, timezone } = event;
  return NextResponse.json({ id: eventId, title, description, event_date, end_date, location, is_virtual, image_url, is_paid, price, currency, timezone });
}
