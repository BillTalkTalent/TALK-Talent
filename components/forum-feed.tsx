"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, TrendingUp, Users, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTopic = {
  id: string;
  title: string;
  category: { name: string; slug: string } | null;
  author: { full_name: string | null } | null;
  created_at: string;
  views: number;
  replyCount: number;
};

interface ForumFeedProps {
  chapterTopics: FeedTopic[];   // posts from people in your chapters
  trendingTopics: FeedTopic[];  // top discussions this week
  hasChapters: boolean;         // whether the user has joined any chapters
}

export default function ForumFeed({ chapterTopics, trendingTopics, hasChapters }: ForumFeedProps) {
  const [tab, setTab] = useState<"chapters" | "trending">(
    hasChapters && chapterTopics.length > 0 ? "chapters" : "trending"
  );

  const topics = tab === "chapters" ? chapterTopics : trendingTopics;

  return (
    <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
              <MessageSquare className="size-3.5 text-[#8b5cf6]" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">Community Activity</span>
          </div>
          <Link
            href="/forum"
            className="flex items-center gap-1 text-xs text-[#00b894] hover:text-[#00d4aa] font-semibold transition-colors"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3">
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
          <button
            onClick={() => setTab("trending")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "trending"
                ? "bg-[#8b5cf6] text-white shadow-sm"
                : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <TrendingUp className="size-3" />
            Trending
          </button>
        </div>
      </div>

      {/* Empty states */}
      {tab === "chapters" && !hasChapters && (
        <div className="px-5 py-10 text-center">
          <BookOpen className="size-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-500">You haven't joined any chapters yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            <Link href="/chapters" className="text-[#8b5cf6] hover:underline">Join a chapter</Link>
            {" "}to see activity from your groups here.
          </p>
        </div>
      )}

      {tab === "chapters" && hasChapters && chapterTopics.length === 0 && (
        <div className="px-5 py-10 text-center">
          <Users className="size-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No recent posts from your chapters yet.</p>
        </div>
      )}

      {tab === "trending" && trendingTopics.length === 0 && (
        <div className="px-5 py-10 text-center">
          <TrendingUp className="size-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Nothing trending yet this week.</p>
        </div>
      )}

      {/* Topic list */}
      {topics.length > 0 && (
        <div className="divide-y divide-zinc-50">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              href={`/forum/${topic.category?.slug}/${topic.id}`}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
            >
              {/* Rank number for trending */}
              {tab === "trending" && (
                <span className={cn(
                  "shrink-0 mt-0.5 size-5 rounded-md flex items-center justify-center text-[10px] font-black",
                  i === 0 ? "bg-amber-100 text-amber-600" :
                  i === 1 ? "bg-zinc-100 text-zinc-500" :
                  i === 2 ? "bg-orange-50 text-orange-400" :
                  "bg-zinc-50 text-zinc-400"
                )}>
                  {i + 1}
                </span>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                {topic.category && (
                  <span className="inline-block text-[10px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full border border-[#8b5cf6]/15">
                    {topic.category.name}
                  </span>
                )}
                <p className="font-semibold text-sm text-zinc-900 leading-snug group-hover:text-[#8b5cf6] transition-colors line-clamp-1">
                  {topic.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>{topic.author?.full_name ?? "Unknown"}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}</span>
                  {topic.replyCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[#8b5cf6] font-semibold">
                        <MessageSquare className="size-3" />
                        {topic.replyCount} {topic.replyCount === 1 ? "reply" : "replies"}
                      </span>
                    </>
                  )}
                  {tab === "trending" && topic.views > 0 && (
                    <>
                      <span>·</span>
                      <span>{topic.views} views</span>
                    </>
                  )}
                </div>
              </div>

              <ArrowRight className="size-3.5 text-zinc-200 group-hover:text-[#8b5cf6] transition-colors shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
