import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Plus } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", categorySlug)
    .single();

  if (!category) notFound();

  const { data: topics } = await supabase
    .from("forum_topics")
    .select("*, profiles(*)")
    .eq("category_id", category.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  // Single batch query for all reply counts — no more N+1
  const topicIds = (topics ?? []).map(t => t.id);
  const { data: replyRows } = topicIds.length > 0
    ? await supabase.from("forum_replies").select("topic_id").in("topic_id", topicIds)
    : { data: [] };

  const replyCountMap: Record<string, number> = {};
  for (const r of replyRows ?? []) {
    replyCountMap[r.topic_id] = (replyCountMap[r.topic_id] ?? 0) + 1;
  }

  const topicsWithCounts = (topics ?? []).map(topic => ({
    ...topic,
    replyCount: replyCountMap[topic.id] ?? 0,
  }));

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
        <Button render={<Link href={`/forum/${categorySlug}/new`} />}>
          <Plus className="size-4" />
          New Topic
        </Button>
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
    </div>
  );
}
