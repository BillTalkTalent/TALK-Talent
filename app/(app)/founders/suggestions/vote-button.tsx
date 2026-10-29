"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function VoteButton({
  suggestionId,
  initialCount,
  initialVoted,
}: {
  suggestionId: string;
  initialCount: number;
  initialVoted: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    // Optimistic — flips immediately, server state wins on refresh if it
    // ever disagrees (e.g. a double-click race with itself).
    const next = !voted;
    setVoted(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      if (next) {
        await db.from("founder_suggestion_votes").insert({ suggestion_id: suggestionId, voter_id: user.id });
      } else {
        await db
          .from("founder_suggestion_votes")
          .delete()
          .eq("suggestion_id", suggestionId)
          .eq("voter_id", user.id);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl border shrink-0 transition-colors disabled:opacity-60",
        voted ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-border text-muted-foreground hover:border-indigo-200",
      )}
      title={voted ? "Remove vote" : "Vote"}
    >
      <ChevronUp className="size-4" />
      <span className="text-xs font-bold">{count}</span>
    </button>
  );
}
