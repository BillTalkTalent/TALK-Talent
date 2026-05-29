"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, TrendingUp, Users, ArrowRight, BookOpen, Flame, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTopic = {
  id: string;
  title: string;
  category: { name: string; slug: string } | null;
  author: { full_name: string | null; avatar_url: string | null } | null;
  created_at: string;
  views: number;
  replyCount: number;
};

interface ForumFeedProps {
  chapterTopics: FeedTopic[];
  trendingTopics: FeedTopic[];
  hasChapters: boolean;
  /** Compact mode: shorter rows, no author/meta, for use in dashboard grid */
  compact?: boolean;
}

function AuthorAvatar({ author }: { author: FeedTopic["author"] }) {
  const initials = author?.full_name
    ? author.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  if (author?.avatar_url) {
    return (
      <img
        src={author.avatar_url}
        alt={author.full_name ?? ""}
        className="size-6 rounded-full object-cover flex-shrink-0 ring-1 ring-zinc-100"
      />
    );
  }
  return (
    <div className="size-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-zinc-500">
      {initials}
    </div>
  );
}

export default function ForumFeed({ chapterTopics, trendingTopics, hasChapters, compact = false }: ForumFeedProps) {
  const [tab, setTab] = useState<"chapters" | "trending">(
    hasChapters && chapterTopics.length > 0 ? "chapters" : "trending"
  );

  const topics = tab === "chapters" ? chapterTopics : trendingTopics;

  return (
    <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          {/* Tabs inline with header */}
          <button
            onClick={() => setTab("trending")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "trending"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Flame className="size-3" />
            Hot
          </button>
          {hasChapters && (
            <button
              onClick={() => setTab("chapters")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === "chapters"
                  ? "bg-[#8b5cf6] text-white shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-100"
              )}
            >
              <BookOpen className="size-3" />
              My Chapters
              {chapterTopics.length > 0 && (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                  tab === "chapters" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                )}>
                  {chapterTopics.length}
                </span>
              )}
            </button>
          )}
        </div>
        <Link
          href="/forum"
          className="flex items-center gap-1 text-xs text-[#E8503A] hover:text-[#F07058] font-semibold transition-colors"
        >
          All discussions <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Empty states */}
      {tab === "chapters" && !hasChapters && (
        <div className="px-5 py-8 text-center">
          <BookOpen className="size-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-500">You haven't joined any chapters yet</p>
          <Link href="/chapters" className="text-xs text-[#8b5cf6] hover:underline mt-1 inline-block">
            Join a chapter
          </Link>
        </div>
      )}

      {tab === "chapters" && hasChapters && chapterTopics.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Users className="size-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No recent posts from your chapters.</p>
        </div>
      )}

      {tab === "trending" && trendingTopics.length === 0 && (
        <div className="px-5 py-8 text-center">
          <TrendingUp className="size-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No discussions yet.</p>
        </div>
      )}

      {/* Topic list */}
      {topics.length > 0 && (
        <ul className="divide-y divide-zinc-50">
          {topics.map((topic, i) => (
            <li key={topic.id}>
              <Link
                href={`/forum/${topic.category?.slug}/${topic.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 hover:bg-zinc-50 transition-colors group",
                  compact ? "py-2" : "py-2.5"
                )}
              >
                {/* Rank */}
                {tab === "trending" && (
                  <span className={cn(
                    "shrink-0 w-4 text-center text-[10px] font-black",
                    i === 0 ? "text-amber-500" :
                    i === 1 ? "text-zinc-400" :
                    i === 2 ? "text-orange-400" :
                    "text-zinc-300"
                  )}>
                    {i + 1}
                  </span>
                )}

                {/* Author avatar — hidden in compact mode */}
                {!compact && <AuthorAvatar author={topic.author} />}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-medium text-zinc-800 group-hover:text-[#1E4B82] transition-colors leading-snug line-clamp-1",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {topic.title}
                  </p>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                      <span className="truncate max-w-[100px]">{topic.author?.full_name ?? "Unknown"}</span>
                      {topic.category && (
                        <>
                          <span>·</span>
                          <span className="text-[#8b5cf6] font-medium truncate">{topic.category.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}</span>
                    </div>
                  )}
                  {compact && topic.category && (
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{topic.category.name}</p>
                  )}
                </div>

                {/* Reply count */}
                {topic.replyCount > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-[11px] text-zinc-400 font-medium">
                    <MessageSquare className="size-3" />
                    {topic.replyCount}
                  </span>
                )}
                {!compact && topic.views > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-[11px] text-zinc-400">
                    <Eye className="size-3" />
                    {topic.views}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Footer link */}
      {topics.length > 0 && (
        <div className="px-4 py-2.5 border-t border-zinc-50">
          <Link href="/forum" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            View all {tab === "trending" ? "discussions" : "chapter posts"} →
          </Link>
        </div>
      )}
    </div>
  );
}
