"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "🔥", "💡"] as const;
export type Emoji = (typeof EMOJIS)[number];

export type ReactionCounts = Partial<Record<Emoji, number>>;

interface ReactionBarProps {
  targetType: "topic" | "reply";
  targetId: string;
  currentUserId: string;
  initialCounts: ReactionCounts;
  initialMine: Emoji | null;
}

export default function ReactionBar({
  targetType,
  targetId,
  currentUserId,
  initialCounts,
  initialMine,
}: ReactionBarProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState(initialMine);
  const [isPending, startTransition] = useTransition();

  if (!currentUserId) return null;

  function bump(emoji: Emoji, delta: number) {
    setCounts(prev => {
      const next = { ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 0) + delta) };
      if (next[emoji] === 0) delete next[emoji];
      return next;
    });
  }

  function toggle(emoji: Emoji) {
    if (isPending) return;
    const supabase = createClient();
    const wasMine = mine;

    // Optimistic update, then reconcile with the real write.
    if (wasMine === emoji) {
      setMine(null);
      bump(emoji, -1);
    } else {
      if (wasMine) bump(wasMine, -1);
      setMine(emoji);
      bump(emoji, 1);
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      if (wasMine === emoji) {
        await db.from("forum_reactions").delete()
          .eq("target_type", targetType).eq("target_id", targetId).eq("user_id", currentUserId);
      } else {
        await db.from("forum_reactions").upsert(
          { target_type: targetType, target_id: targetId, user_id: currentUserId, emoji },
          { onConflict: "target_type,target_id,user_id" }
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              active
                ? "border-[#E8503A]/40 bg-[#E8503A]/10 text-[#E8503A]"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-medium tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
