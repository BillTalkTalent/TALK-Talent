import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import MembersGrid from "./members-grid";

export default async function MembersPage() {
  const supabase = await createClient();

  const [{ data: members }, { data: chapters }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name", { ascending: true }),
      supabase.from("chapters").select("*").order("sort_order"),
      supabase.from("chapter_memberships").select("*"),
    ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)" }}
        >
          <Users className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Members</h1>
          <p className="text-sm text-zinc-500">{members?.length ?? 0} approved members</p>
        </div>
      </div>
      <MembersGrid
        members={members ?? []}
        chapters={chapters ?? []}
        memberships={memberships ?? []}
      />
    </div>
  );
}
