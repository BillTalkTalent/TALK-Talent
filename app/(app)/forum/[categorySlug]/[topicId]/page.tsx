import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pin, Lock } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";
import ReplyForm from "./reply-form";
import TopicView from "./topic-view";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ categorySlug: string; topicId: string }>;
}) {
  const { categorySlug, topicId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, topicResult, repliesResult, categoryResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("forum_topics").select("*, profiles(id, full_name, avatar_url, title, company)").eq("id", topicId).single(),
    supabase
      .from("forum_replies")
      .select("*, profiles(id, full_name, avatar_url)")
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
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/forum" className="hover:text-zinc-600">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${categorySlug}`} className="hover:text-zinc-600">
          {category?.name ?? categorySlug}
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs text-zinc-600">{topic.title}</span>
      </div>

      {/* Pinned / locked badges */}
      {(topic.is_pinned || topic.is_locked) && (
        <div className="flex items-center gap-2">
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
      )}

      {/* Topic + replies (client component handles edit state) */}
      <TopicView
        topicId={topicId}
        initialTitle={topic.title}
        initialBody={topic.body}
        createdAt={topic.created_at}
        topicAuthor={topicAuthor ? {
          id: topicAuthor.id,
          full_name: topicAuthor.full_name,
          avatar_url: topicAuthor.avatar_url ?? null,
        } : null}
        replies={replies.map(r => ({
          id: r.id,
          body: r.body,
          created_at: r.created_at,
          author_id: r.author_id ?? null,
          profiles: r.profiles ? {
            id: (r.profiles as Profile).id,
            full_name: (r.profiles as Profile).full_name,
            avatar_url: (r.profiles as Profile).avatar_url ?? null,
          } : null,
        }))}
        currentUserId={user?.id ?? ""}
      />

      {/* Reply form */}
      {!topic.is_locked && (
        <>
          <Separator />
          <ReplyForm topicId={topicId} categorySlug={categorySlug} />
        </>
      )}

      {topic.is_locked && (
        <div className="text-sm text-zinc-400 text-center py-4 border rounded-lg">
          <Lock className="size-4 inline mr-1.5 mb-0.5" />
          This topic is locked. No new replies can be added.
        </div>
      )}
    </div>
  );
}
