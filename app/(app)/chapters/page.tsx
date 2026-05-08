"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Check, Users } from "lucide-react";
import type { Chapter } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ChapterWithCount = Chapter & { memberCount: number };

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<ChapterWithCount[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [{ data: chaptersData }, { data: membershipsData }, { data: allMemberships }] =
        await Promise.all([
          supabase.from("chapters").select("*").order("sort_order"),
          supabase.from("chapter_memberships").select("chapter_id").eq("user_id", user.id),
          supabase.from("chapter_memberships").select("chapter_id"),
        ]);

      const countMap: Record<string, number> = {};
      for (const m of allMemberships ?? []) {
        countMap[m.chapter_id] = (countMap[m.chapter_id] ?? 0) + 1;
      }

      setChapters(
        (chaptersData ?? []).map((c) => ({ ...c, memberCount: countMap[c.id] ?? 0 }))
      );
      setJoinedIds(new Set((membershipsData ?? []).map((m) => m.chapter_id)));
      setLoading(false);
    }
    load();
  }, []);

  async function toggleChapter(chapterId: string) {
    if (!currentUserId) return;
    const supabase = createClient();
    const isJoined = joinedIds.has(chapterId);

    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (isJoined) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? { ...c, memberCount: c.memberCount + (isJoined ? -1 : 1) }
          : c
      )
    );

    if (isJoined) {
      await supabase
        .from("chapter_memberships")
        .delete()
        .eq("chapter_id", chapterId)
        .eq("user_id", currentUserId);
    } else {
      await supabase
        .from("chapter_memberships")
        .insert({ chapter_id: chapterId, user_id: currentUserId });
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-zinc-100 rounded-2xl w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-44 bg-zinc-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const joinedCount = joinedIds.size;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <BookOpen className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Chapters</h1>
          <p className="text-sm text-zinc-500">
            Join the topics that matter to you
            {joinedCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-[#8b5cf6] font-semibold">
                · {joinedCount} joined
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => {
          const joined = joinedIds.has(chapter.id);
          return (
            <div
              key={chapter.id}
              className={cn(
                "group rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col",
                joined
                  ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                  : "border-zinc-100 bg-white hover:border-[#8b5cf6] hover:shadow-sm"
              )}
              onClick={() => toggleChapter(chapter.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl leading-none">{chapter.icon}</span>
                {joined && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8b5cf6] bg-white border border-[#5FA8A3] px-2 py-0.5 rounded-full shadow-sm">
                    <Check className="size-3" /> Joined
                  </span>
                )}
              </div>

              <p className={cn("font-bold text-base", joined ? "text-[#003d2e]" : "text-zinc-900")}>
                {chapter.name}
              </p>
              {chapter.description && (
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2 flex-1">
                  {chapter.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Users className="size-3" />
                  {chapter.memberCount} {chapter.memberCount === 1 ? "member" : "members"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleChapter(chapter.id); }}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                    joined
                      ? "bg-white text-[#8b5cf6] border border-[#5FA8A3] hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                      : "bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-sm"
                  )}
                >
                  {joined ? "Leave" : "Join"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
