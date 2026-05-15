import { createClient } from "@/lib/supabase/server";
import { Users, Mail } from "lucide-react";
import Link from "next/link";
import MembersGrid from "./members-grid";

const PAGE_SIZE = 48;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; letter?: string; chapter?: string; page?: string }>;
}) {
  const { q, letter, chapter, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Chapters are always small — fetch all upfront
  const [{ data: chapters }, { data: talentPool }] = await Promise.all([
    supabase.from("chapters").select("*").order("sort_order"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("talent_pool").select("user_id"),
  ]);

  // If chapter filter is active, resolve member IDs first
  let chapterMemberIds: string[] | null = null;
  if (chapter) {
    const { data: chapMems } = await supabase
      .from("chapter_memberships")
      .select("user_id")
      .eq("chapter_id", chapter);
    chapterMemberIds = chapMems?.map((m) => m.user_id) ?? [];
  }

  // Build main members query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let membersQuery = (supabase as any)
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("status", "approved")
    .order("full_name", { ascending: true });

  if (q?.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    membersQuery = membersQuery.or(
      `full_name.ilike.%${safe}%,title.ilike.%${safe}%,company.ilike.%${safe}%`
    );
  }

  if (letter && !q?.trim()) {
    membersQuery = membersQuery.ilike("full_name", `${letter}%`);
  }

  if (chapterMemberIds !== null) {
    if (chapterMemberIds.length === 0) {
      // Chapter exists but has no members — return nothing
      membersQuery = membersQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      membersQuery = membersQuery.in("id", chapterMemberIds);
    }
  }

  const { data: members, count: totalCount } = await membersQuery
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  // Fetch chapter memberships only for the visible page of members
  const memberIds = (members ?? []).map((m: { id: string }) => m.id);
  const { data: memberships } =
    memberIds.length > 0
      ? await supabase
          .from("chapter_memberships")
          .select("*")
          .in("user_id", memberIds)
      : { data: [] };

  const talentPoolIds = new Set<string>(
    (talentPool ?? []).map((t: { user_id: string }) => t.user_id as string)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
          >
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Members</h1>
            <p className="text-sm text-zinc-500">
              {totalCount?.toLocaleString() ?? 0} members
              {(q || letter || chapter) ? " matching filters" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/invite"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0d0d0d] hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
        >
          <Mail className="size-4" />
          Invite a Member
        </Link>
      </div>

      <MembersGrid
        members={members ?? []}
        chapters={chapters ?? []}
        memberships={memberships ?? []}
        talentPoolIds={talentPoolIds}
        totalCount={totalCount ?? 0}
        totalPages={totalPages}
        currentPage={page}
        currentQ={q ?? ""}
        currentLetter={letter ?? ""}
        currentChapter={chapter ?? ""}
      />
    </div>
  );
}
