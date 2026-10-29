import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import VoteButton from "../vote-button";
import CommentSection from "./comment-section";

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

export default async function SuggestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestion } = await (supabase as any)
    .from("founder_suggestions")
    .select("id, type, title, body, status, created_at, profiles(full_name), founder_suggestion_votes(voter_id)")
    .eq("id", id)
    .maybeSingle();

  if (!suggestion) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comments } = await (supabase as any)
    .from("founder_suggestion_comments")
    .select("id, body, created_at, author_id, profiles(full_name)")
    .eq("suggestion_id", id)
    .order("created_at", { ascending: true });

  const voteCount = suggestion.founder_suggestion_votes?.length ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasVoted = !!suggestion.founder_suggestion_votes?.some((v: any) => v.voter_id === user?.id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/suggestions" className="hover:underline">Ideas &amp; Topics</Link>
        <span>/</span>
        <span className="truncate">{suggestion.title}</span>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-sm p-5 flex gap-4">
        <VoteButton suggestionId={suggestion.id} initialCount={voteCount} initialVoted={hasVoted} />
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{suggestion.type}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[suggestion.status] ?? STATUS_STYLES.new}`}>
              {STATUS_LABELS[suggestion.status] ?? suggestion.status}
            </span>
          </div>
          <h1 className="text-lg font-bold text-foreground">{suggestion.title}</h1>
          {suggestion.body && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{suggestion.body}</p>}
          <p className="text-xs text-muted-foreground">
            by {suggestion.profiles?.full_name ?? "Unknown"} · {format(new Date(suggestion.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      <CommentSection suggestionId={suggestion.id} comments={comments ?? []} currentUserId={user?.id ?? ""} />
    </div>
  );
}
