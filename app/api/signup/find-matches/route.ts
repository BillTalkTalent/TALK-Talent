import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findMatchCandidates } from "@/lib/signup/match-candidates";

// Public — called from the signup form before an account is created, to
// surface "is this you?" candidates for someone signing up with a
// different email than whatever's already on file (a prior TALK profile,
// migrated-but-unclaimed, etc). Never exposes email or auth state.
export async function POST(req: NextRequest) {
  const { fullName, linkedinUrl } = await req.json();
  const admin = createAdminClient();

  const candidates = await findMatchCandidates(admin, { fullName, linkedinUrl });

  return NextResponse.json({ candidates });
}
