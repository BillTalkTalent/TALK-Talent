import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public — no auth. The rsvp row's own uuid is the capability token: it's
// only ever handed out in the confirmation email/page sent to that guest,
// same trust model as an unsubscribe link, so no extra secret is needed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { rsvpId } = await req.json();

  if (!rsvpId || typeof rsvpId !== "string") {
    return NextResponse.json({ error: "Missing RSVP." }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;

  const { data, error } = await adminDb
    .from("event_guest_rsvps")
    .update({ status: "cancelled" })
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .select("id, full_name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "RSVP not found." }, { status: 404 });

  return NextResponse.json({ ok: true, fullName: data.full_name });
}
