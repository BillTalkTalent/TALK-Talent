import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Plus, ChevronLeft, ChevronRight, Eye, Flame, Clock } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

const PAGE_SIZE = 25;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hotScore(replies: number, views: number, createdAt: string): number {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return (replies * 4 + views) / Math.pow(hoursOld + 2, 1.2);
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { categorySlug } = await params;
  const { page: pageParam, sort = "recent" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", categorySlug)
    .single();

  if (!category) notFound();

  // Count pinned topics (always shown, not paginated)
  const { data: pinnedTopics } = await supabase
    .from("forum_topics")
    .select("*, profiles(*)")
    .eq("category_id", category.id)
    .eq("is_pinned", true)
    .order("updated_at", { ascending: false });

  // Count total unpinned for pagination
  const { count: totalUnpinned } = await supabase
    .from("forum_topics")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.id)
    .eq("is_pinned", false);

  // For "hot" sort, fetch more and re-rank; for "recent" use DB ordering + pagination
  const isHot = sort === "hot";

  const { data: unpinnedTopics } = await supabase
    .from("forum_topics")
    .select("*, profiles(*)")
    .eq("category_id", category.id)
    .eq("is_pinned", false)
    .order("updated_at", { ascending: false })
    // Fetch more rows for hot so we can re-rank before slicing
    .range(isHot ? 0 : offset, isHot ? Math.min((totalUnpinned ?? 0) - 1, 199) : offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((totalUnpinned ?? 0) / PAGE_SIZE);

  // Single batch query for all reply counts
  const allTopicIds = [...(pinnedTopics ?? []), ...(unpinnedTopics ?? [])].map(t => t.id);
  const { data: replyRows } =
    allTopicIds.length > 0
      ? await supabase.from("forum_replies").select("topic_id").in("topic_id", allTopicIds)
      : { data: [] };

  const replyCountMap: Record<string, number> = {};
  for (const r of replyRows ?? []) {
    replyCountMap[r.topic_id] = (replyCountMap[r.topic_id] ?? 0) + 1;
  }

  let unpinned = (unpinnedTopics ?? []).map((topic) => ({
    ...topic,
    replyCount: replyCountMap[topic.id] ?? 0,
  }));

  if (isHot) {
    unpinned = unpinned
      .sort((a, b) => hotScore(b.replyCount, b.views ?? 0, b.created_at) - hotScore(a.replyCount, a.views ?? 0, a.created_at))
      .slice(offset, offset + PAGE_SIZE);
  }

  const topicsWithCounts = [
    ...(pinnedTopics ?? []).map(t => ({ ...t, replyCount: replyCountMap[t.id] ?? 0 })),
    ...unpinned,
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/forum" className="hover:underline">Forum</Link>
            <span>/</span>
            <span>{category.name}</span>
          </div>
          <h1 className="text-2xl font-semibold">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <Link
              href={`/forum/${categorySlug}?sort=recent`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sort !== "hot" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Clock className="size-3" /> Recent
            </Link>
            <Link
              href={`/forum/${categorySlug}?sort=hot`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sort === "hot" ? "bg-white shadow-sm text-orange-600" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Flame className="size-3" /> Hot
            </Link>
          </div>
          <Button render={<Link href={`/forum/${categorySlug}/new`} />}>
            <Plus className="size-4" />
            New Topic
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {topicsWithCounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No topics yet. Be the first to start a discussion!
          </div>
        ) : (
          <ul>
            {topicsWithCounts.map((topic, i) => {
              const author = topic.profiles as Profile | null;
              return (
                <li key={topic.id}>
                  {i > 0 && <Separator />}
                  <Link
                    href={`/forum/${categorySlug}/${topic.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted transition-colors"
                  >
                    <Avatar size="sm">
                      {author?.avatar_url && (
                        <AvatarImage src={author.avatar_url} alt={author.full_name ?? ""} />
                      )}
                      <AvatarFallback>{getInitials(author?.full_name ?? null)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {topic.is_pinned && (
                          <Pin className="size-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium truncate">{topic.title}</span>
                        {topic.is_pinned && (
                          <Badge variant="secondary" className="shrink-0 text-xs">Pinned</Badge>
                        )}
                        {topic.is_locked && (
                          <Badge variant="outline" className="shrink-0 text-xs">Locked</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {author?.full_name ?? "Unknown"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3.5" />
                        {topic.replyCount}
                      </span>
                      {topic.views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" />
                          {topic.views}
                        </span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(topic.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Page {page} of {totalPages} · {totalUnpinned ?? 0} topics
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/forum/${categorySlug}?page=${page - 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-100 text-sm font-medium text-zinc-300 cursor-not-allowed">
                <ChevronLeft className="size-4" />
                Previous
              </span>
            )}

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                // Show first, last, current ±1, and ellipsis
                const pageNum = i + 1;
                if (totalPages <= 7) {
                  return pageNum;
                }
                if (pageNum === 1 || pageNum === totalPages) return pageNum;
                if (Math.abs(pageNum - page) <= 1) return pageNum;
                return null;
              })
                .filter(Boolean)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof p === "number" && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) {
                    acc.push("…");
                  }
                  acc.push(p as number);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-zinc-400 text-sm">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={`/forum/${categorySlug}?page=${p}`}
                      className={`size-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-primary text-primary-foreground"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
            </div>

            {page < totalPages ? (
              <Link
                href={`/forum/${categorySlug}?page=${page + 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-100 text-sm font-medium text-zinc-300 cursor-not-allowed">
                Next
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
