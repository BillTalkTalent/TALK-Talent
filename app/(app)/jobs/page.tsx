import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import JobsList from "./jobs-list";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("job_posts")
    .select("*, profiles(full_name, company)")
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
          >
            <Briefcase className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Job Board</h1>
            <p className="text-sm text-zinc-500">Opportunities posted by community members</p>
          </div>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl"
          render={<Link href="/jobs/new" />}
        >
          <Plus className="size-4" />
          Post a Job
        </Button>
      </div>

      <JobsList jobs={jobs ?? []} />
    </div>
  );
}
