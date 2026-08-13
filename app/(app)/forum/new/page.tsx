"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Category = { id: string; name: string; slug: string };

export default function NewTopicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const preselect = searchParams.get("category") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("forum_categories")
      .select("id, name, slug")
      .order("sort_order")
      .then(({ data }) => {
        setCategories(data ?? []);
        const match = (data ?? []).find((c) => c.slug === preselect);
        setCategoryId(match?.id ?? data?.[0]?.id ?? "");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !categoryId) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to post.");
      setSubmitting(false);
      return;
    }

    const { data: topic, error } = await supabase
      .from("forum_topics")
      .insert({
        category_id: categoryId,
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

    const categorySlug = categories.find((c) => c.id === categoryId)?.slug ?? "";
    toast.success("Topic created!");
    router.push(`/forum/${categorySlug}/${topic.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forum" className="hover:underline">Forum</Link>
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
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={submitting || categories.length === 0}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

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
              <Button type="submit" disabled={submitting || !title.trim() || !body.trim() || !categoryId}>
                {submitting ? "Posting..." : "Post Topic"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
