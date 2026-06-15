import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, name, message, inviterId } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const cleanEmail = String(email).toLowerCase().trim();

  // Check they haven't already invited this email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: existing } = await db
    .from("invitations")
    .select("id")
    .eq("inviter_id", user.id)
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You've already sent an invite to this email address." },
      { status: 400 }
    );
  }

  // Create the account directly (email pre-confirmed, no password). The profile
  // trigger sets status = 'pending', so the invitee lands in the admin "Pending
  // Approvals" queue. Approving them there sends the branded magic-link login
  // email via Resend. We deliberately do NOT use Supabase's built-in invite
  // email — it's rate-limited (~3/hr), unbranded, and skips the approval gate.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    email_confirm: true,
    user_metadata: {
      full_name: name ?? null,
      invited_by: user.id,
    },
  });

  if (createError) {
    if (/already.*registered|already.*exists/i.test(createError.message)) {
      return NextResponse.json(
        { error: "That email already has a TALK account." },
        { status: 400 }
      );
    }
    console.error("invite createUser error:", createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Record the invite so it shows in the inviter's history.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;
  await adminDb.from("invitations").insert({
    inviter_id: inviterId,
    email: cleanEmail,
    name: name ?? null,
    message: message ?? null,
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
