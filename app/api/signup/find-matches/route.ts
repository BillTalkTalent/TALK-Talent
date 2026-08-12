import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function extractLinkedInSlug(url: string): string | null {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

const SAFE_FIELDS = "id, full_name, avatar_url, company, title, linkedin_url";

// Public — called from the signup form before an account is created, to
// surface "is this you?" candidates for someone signing up with a
// different email than whatever's already on file (a prior TALK profile,
// migrated-but-unclaimed, etc). Never exposes email or auth state.
export async function POST(req: NextRequest) {
  const { fullName, linkedinUrl } = await req.json();
  const admin = createAdminClient();

  const slug = typeof linkedinUrl === "string" && linkedinUrl.trim() ? extractLinkedInSlug(linkedinUrl) : null;
  const name = typeof fullName === "string" ? fullName.trim() : "";

  const queries = [];
  if (slug) {
    queries.push(
      admin.from("profiles").select(SAFE_FIELDS).neq("status", "rejected").ilike("linkedin_url", `%${slug}%`).limit(5)
    );
  }
  if (name) {
    queries.push(
      admin.from("profiles").select(SAFE_FIELDS).neq("status", "rejected").ilike("full_name", name).limit(5)
    );
  }

  if (queries.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  const results = await Promise.all(queries);
  const seen = new Map<string, Record<string, unknown>>();
  for (const { data } of results) {
    for (const row of data ?? []) {
      seen.set(row.id, row);
    }
  }

  return NextResponse.json({ candidates: Array.from(seen.values()).slice(0, 5) });
}
