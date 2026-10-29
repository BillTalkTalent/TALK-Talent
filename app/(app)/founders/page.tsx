import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Lightbulb, MessageSquare, FolderOpen, HeartHandshake, Users, Flag, ArrowRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  under_review: "Under review",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

export default async function FoundersHubPage() {
  const supabase = await createClient();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const [{ data: suggestions }, { count: postCount }, { count: fileCount }, { count: opportunityCount }, { count: memberCount }] =
    await Promise.all([
      db.from("founder_suggestions").select("status").order("created_at", { ascending: false }),
      db.from("founder_posts").select("id", { count: "exact", head: true }),
      db.from("founder_files").select("id", { count: "exact", head: true }),
      db.from("founder_opportunities").select("id", { count: "exact", head: true }).eq("is_active", true),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true).eq("status", "approved"),
    ]);

  const counts = (suggestions ?? []).reduce(
    (acc: Record<string, number>, s: { status: string }) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const total = suggestions?.length ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
        >
          <Flag className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Founders Hub</h1>
          <p className="text-sm text-muted-foreground">A space for the founding members helping rebuild TALK</p>
        </div>
      </div>

      <Link
        href="/founders/suggestions"
        className="block rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Ideas &amp; Topics</h2>
              <p className="text-sm text-muted-foreground">Submit, vote, and track where each one stands</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
        {total > 0 && (
          <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border/60">
            {Object.entries(STATUS_LABELS).map(([key, label]) =>
              counts[key] ? (
                <span
                  key={key}
                  className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full"
                >
                  {counts[key]} {label}
                </span>
              ) : null,
            )}
          </div>
        )}
      </Link>

      <Link
        href="/founders/discussion"
        className="block rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Discussion</h2>
              <p className="text-sm text-muted-foreground">
                {postCount ? `${postCount} post${postCount === 1 ? "" : "s"}` : "General back-and-forth"}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
      </Link>

      <Link
        href="/founders/files"
        className="block rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Files &amp; Recordings</h2>
              <p className="text-sm text-muted-foreground">
                {fileCount ? `${fileCount} shared` : "Shared resources and meeting recordings"}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
      </Link>

      <Link
        href="/founders/volunteer"
        className="block rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Volunteer Options</h2>
              <p className="text-sm text-muted-foreground">
                {opportunityCount ? `${opportunityCount} open` : "Ways to pitch in"}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
      </Link>

      <Link
        href="/founders/members"
        className="block rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Users className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Founding Members</h2>
              <p className="text-sm text-muted-foreground">{memberCount ?? 0} people</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
      </Link>
    </div>
  );
}
