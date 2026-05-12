"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function ReplyForm({
  topicId,
  categorySlug,
}: {
  topicId: string;
  categorySlug: string;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to reply.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("forum_replies").insert({
      topic_id: topicId,
      author_id: user.id,
      body: body.trim(),
    });

    if (error) {
      toast.error("Failed to post reply.");
      setSubmitting(false);
      return;
    }

    toast.success("Reply posted!");
    const postedBody = body.trim();
    setBody("");
    setSubmitting(false);
    router.refresh();

    // Fire-and-forget: notify the topic author (won't block UX)
    fetch("/api/forum/notify-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, replyBody: postedBody, categorySlug }),
    }).catch(() => {/* silently ignore notification failures */});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label htmlFor="reply">Your Reply</Label>
      <Textarea
        id="reply"
        placeholder="Share your thoughts..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        disabled={submitting}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting || !body.trim()}>
          <Send className="size-4" />
          {submitting ? "Posting..." : "Post Reply"}
        </Button>
      </div>
    </form>
  );
}
