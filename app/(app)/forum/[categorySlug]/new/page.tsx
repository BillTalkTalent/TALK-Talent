"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewTopicPage() {
  const params = useParams<{ categorySlug: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to post.");
      setSubmitting(false);
      return;
    }

    // Get category id from slug
    const { data: category } = await supabase
      .from("forum_categories")
      .select("id")
      .eq("slug", params.categorySlug)
      .single();

    if (!category) {
      toast.error("Category not found.");
      setSubmitting(false);
      return;
    }

    const { data: topic, error } = await supabase
      .from("forum_topics")
      .insert({
        category_id: category.id,
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
        is_pinned: false,
        is_locked: false,
        views: 0,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create topic.");
      setSubmitting(false);
      return;
    }

    toast.success("Topic created!");
    router.push(`/forum/${params.categorySlug}/${topic.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forum" className="hover:underline">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${params.categorySlug}`} className="hover:underline capitalize">
          {params.categorySlug.replace(/-/g, " ")}
        </Link>
        <span>/</span>
        <span>New Topic</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a New Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What's your topic about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                placeholder="Share your thoughts, questions, or ideas..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                required
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? "Posting..." : "Post Topic"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
