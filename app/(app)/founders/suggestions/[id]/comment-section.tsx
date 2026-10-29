"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  profiles: { full_name: string | null } | null;
};

export default function CommentSection({
  suggestionId,
  comments,
  currentUserId,
}: {
  suggestionId: string;
  comments: Comment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("founder_suggestion_comments")
      .insert({ suggestion_id: suggestionId, author_id: currentUserId, body: body.trim() });
    setBody("");
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("founder_suggestion_comments").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-foreground">
        Comments <span className="text-muted-foreground font-normal">({comments.length})</span>
      </h2>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {c.profiles?.full_name ?? "Unknown"}{" "}
                  <span className="font-normal text-muted-foreground">· {format(new Date(c.created_at), "MMM d")}</span>
                </p>
                {c.author_id === currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          disabled={submitting}
          className="flex-1"
        />
        <Button type="submit" disabled={submitting || !body.trim()}>
          Post
        </Button>
      </form>
    </div>
  );
}
