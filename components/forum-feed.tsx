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
        className="size-6 rounded-full object-cover flex-shrink-0 ring-1 ring-border"
      />
    );
  }
  return (
    <div className="size-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-muted-foreground">
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
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Tabs inline with header */}
          <button
            onClick={() => setTab("trending")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "trending"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
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
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <BookOpen className="size-3" />
              My Chapters
              {chapterTopics.length > 0 && (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                  tab === "chapters" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {chapterTopics.length}
                </span>
              )}
            </button>
          )}
        </div>
        <Link
          href="/forum"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          All discussions <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Empty states */}
      {tab === "chapters" && !hasChapters && (
        <div className="px-5 py-8 text-center">
          <BookOpen className="size-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">You haven&apos;t joined any chapters yet</p>
          <Link href="/chapters" className="text-xs text-[#8b5cf6] hover:underline mt-1 inline-block">
            Join a chapter
          </Link>
        </div>
      )}

      {tab === "chapters" && hasChapters && chapterTopics.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Users className="size-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent posts from your chapters.</p>
        </div>
      )}

      {tab === "trending" && trendingTopics.length === 0 && (
        <div className="px-5 py-8 text-center">
          <TrendingUp className="size-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No discussions yet.</p>
        </div>
      )}

      {/* Topic list */}
      {topics.length > 0 && (
        <ul className="divide-y divide-border/60">
          {topics.map((topic, i) => (
            <li key={topic.id}>
              <Link
                href={`/forum/${topic.category?.slug}/${topic.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 hover:bg-muted/60 transition-colors group",
                  compact ? "py-2" : "py-2.5"
                )}
              >
                {/* Rank */}
                {tab === "trending" && (
                  <span className={cn(
                    "shrink-0 w-4 text-center text-[10px] font-black",
                    i === 0 ? "text-amber-500" :
                    i === 1 ? "text-muted-foreground" :
                    i === 2 ? "text-orange-400" :
                    "text-muted-foreground/50"
                  )}>
                    {i + 1}
                  </span>
                )}

                {/* Author avatar — hidden in compact mode */}
                {!compact && <AuthorAvatar author={topic.author} />}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-medium text-foreground group-hover:text-accent transition-colors leading-snug line-clamp-1",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {topic.title}
                  </p>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
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
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{topic.category.name}</p>
                  )}
                </div>

                {/* Reply count */}
                {topic.replyCount > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground font-medium">
                    <MessageSquare className="size-3" />
                    {topic.replyCount}
                  </span>
                )}
                {!compact && topic.views > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
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
        <div className="px-4 py-2.5 border-t border-border/60">
          <Link href="/forum" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all {tab === "trending" ? "discussions" : "chapter posts"} →
          </Link>
        </div>
      )}
    </div>
  );
}
