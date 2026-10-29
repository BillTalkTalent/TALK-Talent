import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import ReplySection from "./reply-section";

export default async function DiscussionPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (supabase as any)
    .from("founder_posts")
    .select("id, title, body, created_at, author_id, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: replies } = await (supabase as any)
    .from("founder_post_replies")
    .select("id, body, created_at, author_id, profiles(full_name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/discussion" className="hover:underline">Discussion</Link>
        <span>/</span>
        <span className="truncate">{post.title}</span>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-2">
        <h1 className="text-lg font-bold text-foreground">{post.title}</h1>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{post.body}</p>
        <p className="text-xs text-muted-foreground">
          by {post.profiles?.full_name ?? "Unknown"} · {format(new Date(post.created_at), "MMM d, yyyy")}
        </p>
      </div>

      <ReplySection postId={post.id} replies={replies ?? []} currentUserId={user?.id ?? ""} />
    </div>
  );
}
