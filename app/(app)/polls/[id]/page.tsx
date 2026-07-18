"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Users, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Poll, PollOption, PollVote, PollComment } from "@/lib/supabase/types";

type PollWithProfile = Poll & {
  profiles: { full_name: string | null } | null;
};

type CommentWithProfile = PollComment & {
  profiles: { full_name: string | null } | null;
};

export default function PollDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [poll, setPoll] = useState<PollWithProfile | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const [pollResult, optionsResult, votesResult, commentsResult] = await Promise.all([
      supabase
        .from("polls")
        .select("*, profiles(full_name)")
        .eq("id", params.id)
        .single(),
      supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", params.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", params.id)
        .eq("is_anonymous", false),
      supabase
        .from("poll_comments")
        .select("*, profiles(full_name)")
        .eq("poll_id", params.id)
        .order("created_at", { ascending: true }),
    ]);

    setPoll(pollResult.data as PollWithProfile | null);
    setOptions(optionsResult.data ?? []);
    setVotes(votesResult.data ?? []);
    setComments((commentsResult.data as unknown as CommentWithProfile[]) ?? []);
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const userVotes = votes.filter((v) => v.user_id === currentUserId);
  const hasVoted = userVotes.length > 0;
  const isClosed =
    poll?.status === "closed" ||
    (poll?.closes_at != null && new Date(poll.closes_at) < new Date());
  // Migrated polls carry aggregate tallies (no individual votes), so read counts
  // from legacy_vote_count and the stored respondent total.
  const isLegacyResults =
    !!poll?.is_legacy && options.some((o) => o.legacy_vote_count != null);
  const showResults = hasVoted || isClosed || isLegacyResults;
  const totalVotes = isLegacyResults
    ? poll?.legacy_total_votes ?? 0
    : votes.length;
  const optionCount = (opt: PollOption) =>
    isLegacyResults
      ? opt.legacy_vote_count ?? 0
      : votes.filter((v) => v.option_id === opt.id).length;

  async function postComment() {
    if (!currentUserId || !commentDraft.trim()) return;
    setPostingComment(true);
    const { error } = await supabase.from("poll_comments").insert({
      poll_id: params.id,
      user_id: currentUserId,
      content: commentDraft.trim(),
    });
    if (error) {
      toast.error("Failed to post comment.");
    } else {
      const body = commentDraft.trim();
      setCommentDraft("");
      await fetchData();
      // Alert the poll creator + prior commenters (fire-and-forget).
      fetch("/api/polls/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: params.id, kind: "comment", commentBody: body }),
      }).catch(() => {});
    }
    setPostingComment(false);
  }

  function toggleOption(optionId: string) {
    if (!poll) return;
    if (poll.is_multiple_choice) {
      setSelectedOptions((prev) => {
        const next = new Set(prev);
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
        return next;
      });
    } else {
      setSelectedOptions(new Set([optionId]));
    }
  }

  async function handleVote() {
    if (!currentUserId || !poll || selectedOptions.size === 0) return;
    setVoting(true);

    const inserts = Array.from(selectedOptions).map((optionId) => ({
      poll_id: poll.id,
      option_id: optionId,
      user_id: currentUserId,
    }));

    const { error } = await supabase.from("poll_votes").insert(inserts);
    if (error) {
      toast.error("Failed to submit vote. Please try again.");
      setVoting(false);
      return;
    }

    toast.success("Vote submitted!");
    await fetchData();
    // Nudge the poll creator that there's new activity (fire-and-forget).
    fetch("/api/polls/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId: poll.id, kind: "vote" }),
    }).catch(() => {});
    setVoting(false);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-8 w-3/4 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Poll not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link
        href="/polls"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Polls
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-snug">{poll.question}</h1>
          <div className="flex gap-1.5 shrink-0">
            {isClosed ? (
              <Badge variant="secondary">Closed</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
            )}
            {poll.is_multiple_choice && (
              <Badge variant="outline">Multi-choice</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </span>
          {poll.closes_at && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {isClosed
                ? `Closed ${format(new Date(poll.closes_at), "MMM d, yyyy")}`
                : `Closes ${format(new Date(poll.closes_at), "MMM d, yyyy 'at' h:mm a")}`}
            </span>
          )}
          <span>
            by {poll.profiles?.full_name ?? "Unknown"} ·{" "}
            {format(new Date(poll.created_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          {showResults ? (
            <>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {hasVoted ? "You voted — here are the results:" : "Results:"}
              </p>
              {options.map((opt) => {
                const optVotes = optionCount(opt);
                const pct = totalVotes === 0 ? 0 : Math.round((optVotes / totalVotes) * 100);
                const userPickedThis = userVotes.some((v) => v.option_id === opt.id);
                return (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={userPickedThis ? "font-semibold text-indigo-700" : ""}>
                        {userPickedThis && (
                          <CheckCircle2 className="size-4 inline mr-1.5 text-indigo-600" />
                        )}
                        {opt.text}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {optVotes} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          userPickedThis ? "bg-indigo-600" : "bg-indigo-300"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {poll.is_multiple_choice
                  ? "Select all that apply:"
                  : "Select one option:"}
              </p>
              <div className="space-y-2">
                {options.map((opt) => {
                  const selected = selectedOptions.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                          : "border-border hover:border-indigo-300 hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {selected && <CheckCircle2 className="size-4 text-indigo-600 shrink-0" />}
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleVote}
                  disabled={voting || selectedOptions.size === 0 || !currentUserId}
                >
                  {voting ? "Submitting..." : "Submit Vote"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <MessageSquare className="size-4" />
          Comments
          <span className="text-xs font-normal">({comments.length})</span>
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium">
                    {c.profiles?.full_name ?? c.author_name ?? "Member"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.created_at), "MMM d, yyyy")}
                  </span>
                  {c.is_legacy && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">migrated</Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Add a comment */}
        <div className="space-y-2 pt-1">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-indigo-400 placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end">
            <Button
              onClick={postComment}
              disabled={postingComment || !commentDraft.trim() || !currentUserId}
            >
              {postingComment ? "Posting…" : "Post Comment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
