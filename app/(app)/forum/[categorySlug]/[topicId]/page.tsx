import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Pin, Lock } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";
import ReplyForm from "./reply-form";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ categorySlug: string; topicId: string }>;
}) {
  const { categorySlug, topicId } = await params;
  const supabase = await createClient();

  const [topicResult, repliesResult, categoryResult] = await Promise.all([
    supabase.from("forum_topics").select("*, profiles(*)").eq("id", topicId).single(),
    supabase
      .from("forum_replies")
      .select("*, profiles(*)")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true }),
    supabase.from("forum_categories").select("*").eq("slug", categorySlug).single(),
  ]);

  if (!topicResult.data) notFound();

  const topic = topicResult.data;
  const replies = repliesResult.data ?? [];
  const category = categoryResult.data;
  const topicAuthor = topic.profiles as Profile | null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forum" className="hover:underline">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${categorySlug}`} className="hover:underline">
          {category?.name ?? categorySlug}
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs">{topic.title}</span>
      </div>

      {/* Topic */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{topic.title}</h1>
            {topic.is_pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="size-3" /> Pinned
              </Badge>
            )}
            {topic.is_locked && (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" /> Locked
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Avatar size="sm">
            {topicAuthor?.avatar_url && (
              <AvatarImage src={topicAuthor.avatar_url} alt={topicAuthor.full_name ?? ""} />
            )}
            <AvatarFallback>{getInitials(topicAuthor?.full_name ?? null)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{topicAuthor?.full_name ?? "Unknown"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {format(new Date(topic.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <div className="mt-2 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {topic.body}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </h2>
            {replies.map((reply) => {
              const author = reply.profiles as Profile | null;
              return (
                <div key={reply.id} className="flex items-start gap-3">
                  <Avatar size="sm">
                    {author?.avatar_url && (
                      <AvatarImage src={author.avatar_url} alt={author.full_name ?? ""} />
                    )}
                    <AvatarFallback>{getInitials(author?.full_name ?? null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="font-medium">{author?.full_name ?? "Unknown"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(reply.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reply form */}
      {!topic.is_locked && (
        <>
          <Separator />
          <ReplyForm topicId={topicId} categorySlug={categorySlug} />
        </>
      )}

      {topic.is_locked && (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
          <Lock className="size-4 inline mr-1.5 mb-0.5" />
          This topic is locked. No new replies can be added.
        </div>
      )}
    </div>
  );
}
