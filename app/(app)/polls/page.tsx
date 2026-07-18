import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, BarChart2, Users, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { Poll, PollOption, PollVote } from "@/lib/supabase/types";

type PollWithRelations = Poll & {
  profiles: { full_name: string | null } | null;
  poll_options: PollOption[];
  poll_votes: PollVote[];
};

function OptionBar({ text, votes, total, isTop }: { text: string; votes: number; total: number; isTop: boolean }) {
  const pct = total === 0 ? 0 : Math.round((votes / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`truncate max-w-[70%] font-medium ${isTop ? "text-[#7c3aed]" : "text-zinc-600"}`}>{text}</span>
        <span className={`font-bold ${isTop ? "text-[#7c3aed]" : "text-zinc-500"}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isTop ? "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6]" : "bg-zinc-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function PollsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: pollsRaw } = await supabase
    .from("polls")
    // Only real member votes are needed for counting; legacy polls render from
    // legacy_vote_count, so exclude the thousands of anonymous migration rows.
    .select("*, profiles(full_name), poll_options(*), poll_votes(option_id)")
    .eq("poll_votes.is_anonymous", false)
    .order("created_at", { ascending: false });

  const polls = (pollsRaw ?? []) as unknown as PollWithRelations[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
          >
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Polls</h1>
            <p className="text-sm text-zinc-500">Vote and share your perspective</p>
          </div>
        </div>
        {user && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl"
            render={<Link href="/polls/new" />}
          >
            <Plus className="size-4" />
            Create Poll
          </Button>
        )}
      </div>

      {polls.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <BarChart2 className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No polls yet</p>
          <p className="text-sm text-zinc-400 mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            // Migrated polls carry aggregate tallies instead of individual votes.
            const isLegacy = poll.is_legacy && poll.poll_options.some((o) => o.legacy_vote_count != null);
            const totalVotes = isLegacy ? (poll.legacy_total_votes ?? 0) : poll.poll_votes.length;
            const votesPerOption = poll.poll_options.map((opt) => ({
              ...opt,
              count: isLegacy
                ? (opt.legacy_vote_count ?? 0)
                : poll.poll_votes.filter((v) => v.option_id === opt.id).length,
            }));
            const sorted = [...votesPerOption].sort((a, b) => b.count - a.count);
            const topOptions = sorted.slice(0, 3);
            const topId = sorted[0]?.id;
            const isClosed =
              poll.status === "closed" ||
              (poll.closes_at != null && new Date(poll.closes_at) < new Date());

            return (
              <div key={poll.id} className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Status strip */}
                <div className={`h-1 ${isClosed ? "bg-zinc-200" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold text-zinc-900 leading-snug">{poll.question}</h2>
                    <div className="flex gap-1.5 shrink-0">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="size-3" /> Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                          Active
                        </span>
                      )}
                      {poll.is_multiple_choice && (
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
                          Multi-choice
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {topOptions.map((opt) => (
                      <OptionBar
                        key={opt.id}
                        text={opt.text}
                        votes={opt.count}
                        total={totalVotes}
                        isTop={opt.id === topId && opt.count > 0}
                      />
                    ))}
                    {poll.poll_options.length > 3 && (
                      <p className="text-xs text-zinc-400 pt-1">
                        +{poll.poll_options.length - 3} more options
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-50">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                      </span>
                      {poll.closes_at && !isClosed && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Closes {format(new Date(poll.closes_at), "MMM d")}
                        </span>
                      )}
                      <span>by {poll.profiles?.full_name ?? "Unknown"} · {format(new Date(poll.created_at), "MMM d")}</span>
                    </div>
                    <Link
                      href={`/polls/${poll.id}`}
                      className="text-xs font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                    >
                      {isClosed ? "View Results →" : "Vote →"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
