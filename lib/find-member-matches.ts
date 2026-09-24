import { createAdminClient } from "@/lib/supabase/admin";

export type MemberMatch = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
};

// Server-only — includes email, unlike the public find-matches API
// (app/api/signup/find-matches) that the signup form calls before an
// account exists. This is used from app/auth/duplicate-check, which runs
// after the person is already authenticated (via LinkedIn), so showing
// them a matched account's email just confirms what they already have
// access to via that inbox, not a new leak.
export async function findMemberMatchesByName(fullName: string, excludeId: string): Promise<MemberMatch[]> {
  const name = fullName.trim();
  if (!name) return [];

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("profiles")
    .select("id, full_name, avatar_url, company, title, email")
    .neq("status", "rejected")
    .neq("id", excludeId)
    .eq("is_bot", false)
    .ilike("full_name", name)
    .limit(5);

  return (data ?? []) as MemberMatch[];
}
