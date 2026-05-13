import { createClient } from "@/lib/supabase/server";
import { Users, Mail } from "lucide-react";
import Link from "next/link";
import MembersGrid from "./members-grid";

export default async function MembersPage() {
  const supabase = await createClient();

  const [{ data: members }, { data: chapters }, { data: memberships }, { data: talentPool }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name", { ascending: true }),
      supabase.from("chapters").select("*").order("sort_order"),
      supabase.from("chapter_memberships").select("*"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("talent_pool").select("user_id"),
    ]);

  const talentPoolIds = new Set<string>((talentPool ?? []).map((t: { user_id: string }) => t.user_id as string));

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
            <p className="text-sm text-zinc-500">{members?.length ?? 0} approved members</p>
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
      />
    </div>
  );
}
