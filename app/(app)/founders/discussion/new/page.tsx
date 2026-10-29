"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewDiscussionPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post, error } = await (supabase as any)
      .from("founder_posts")
      .insert({ author_id: user.id, title: title.trim(), body: body.trim() })
      .select()
      .single();

    if (error || !post) {
      toast.error("Failed to post. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/founders/discussion/${post.id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/discussion" className="hover:underline">Discussion</Link>
        <span>/</span>
        <span>New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">
                Body <span className="text-destructive">*</span>
              </Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} required disabled={submitting} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
