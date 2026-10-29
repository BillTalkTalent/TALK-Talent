import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Lightbulb, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import VoteButton from "./vote-button";

type SuggestionRow = {
  id: string;
  type: "idea" | "topic";
  title: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  founder_suggestion_votes: { voter_id: string }[];
  founder_suggestion_comments: { id: string }[];
};

const STATUS_STYLES: Record<string, string> = {
  new: "text-zinc-600 bg-zinc-100",
  under_review: "text-amber-700 bg-amber-50 border border-amber-100",
  planned: "text-blue-700 bg-blue-50 border border-blue-100",
  shipped: "text-emerald-700 bg-emerald-50 border border-emerald-100",
  declined: "text-zinc-400 bg-zinc-50 border border-zinc-100",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  under_review: "Under review",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

export default async function FounderSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("founder_suggestions")
    .select("id, type, title, status, created_at, profiles(full_name), founder_suggestion_votes(voter_id), founder_suggestion_comments(id)")
    .order("created_at", { ascending: false });
  if (type === "idea" || type === "topic") query = query.eq("type", type);

  const { data } = await query;
  const suggestions = (data ?? []) as SuggestionRow[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideas &amp; Topics</h1>
            <p className="text-sm text-muted-foreground">Submit, vote, and see what&apos;s being worked on</p>
          </div>
        </div>
        <Button className="shadow-sm" render={<Link href="/founders/suggestions/new" />}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { href: "/founders/suggestions", label: "All", active: !type },
          { href: "/founders/suggestions?type=idea", label: "Ideas", active: type === "idea" },
          { href: "/founders/suggestions?type=topic", label: "Topics", active: type === "topic" },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              t.active ? "bg-zinc-900 text-white" : "bg-muted text-muted-foreground hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <Lightbulb className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nothing here yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to submit one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => {
            const voteCount = s.founder_suggestion_votes?.length ?? 0;
            const hasVoted = !!s.founder_suggestion_votes?.some((v) => v.voter_id === user?.id);
            return (
              <li key={s.id} className="rounded-2xl bg-card border border-border shadow-sm p-4 flex items-center gap-4">
                <VoteButton suggestionId={s.id} initialCount={voteCount} initialVoted={hasVoted} />
                <Link href={`/founders/suggestions/${s.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{s.type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? STATUS_STYLES.new}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {s.profiles?.full_name ?? "Unknown"} · {format(new Date(s.created_at), "MMM d")}
                  </p>
                </Link>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <MessageCircle className="size-3.5" />
                  {s.founder_suggestion_comments?.length ?? 0}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
