import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Always use the canonical production URL — never the request origin,
  // which could be localhost if someone triggers this from a local dev environment.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://talk-talent.vercel.app";

  // Send invite via Supabase Auth (uses Supabase's built-in email)
  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      invited_by: user.id,
      invitee_name: name ?? null,
    },
    redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
  });

  if (inviteError && !inviteError.message.includes("already been registered")) {
    console.error("inviteUserByEmail error:", inviteError);
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Record the invite in the database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;
  await adminDb.from("invitations").insert({
    inviter_id: inviterId,
    email: email.toLowerCase(),
    name: name ?? null,
    message: message ?? null,
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
