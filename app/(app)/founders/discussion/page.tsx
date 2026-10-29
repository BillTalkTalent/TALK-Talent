import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, MessageCircle } from "lucide-react";
import { format } from "date-fns";

type PostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  founder_post_replies: { id: string }[];
};

export default async function FounderDiscussionPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("founder_posts")
    .select("id, title, body, created_at, profiles(full_name), founder_post_replies(id)")
    .order("created_at", { ascending: false });

  const posts = (data ?? []) as PostRow[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Discussion</h1>
            <p className="text-sm text-muted-foreground">General back-and-forth that isn&apos;t a structured idea</p>
          </div>
        </div>
        <Button className="shadow-sm" render={<Link href="/founders/discussion/new" />}>
          <Plus className="size-4" />
          New post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <MessageSquare className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start the first conversation.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/founders/discussion/${p.id}`}
                className="block rounded-2xl bg-card border border-border shadow-sm p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{p.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{p.body}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      by {p.profiles?.full_name ?? "Unknown"} · {format(new Date(p.created_at), "MMM d")}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <MessageCircle className="size-3.5" />
                    {p.founder_post_replies?.length ?? 0}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
