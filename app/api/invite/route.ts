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

  // Send the actual invite email via Supabase Auth (triggers signup email)
  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      invited_by: user.id,
      invitee_name: name ?? null,
    },
    redirectTo: `${req.headers.get("origin") ?? "https://talk-talent.vercel.app"}/dashboard`,
  });

  if (inviteError && !inviteError.message.includes("already been registered")) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Record the invite
  const adminDb = admin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await adminDb.from("invitations").insert({
    inviter_id: inviterId,
    email: email.toLowerCase(),
    name: name ?? null,
    message: message ?? null,
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
