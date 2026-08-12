"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { generateDraft, postDraftToForum } from "./actions";

type Category = { id: string; name: string; slug: string };

export default function NewsBriefComposer({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const defaultCategoryId = categories.find((c) => c.slug === "industry-news")?.id ?? categories[0]?.id ?? "";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const draft = await generateDraft();
      setTitle(draft.title);
      setBody(draft.body);
      setHasDraft(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePost() {
    if (!title.trim() || !body.trim() || !categoryId) return;
    setPosting(true);
    try {
      const { topicId, categorySlug } = await postDraftToForum(categoryId, title, body);
      toast.success("Posted to the forum.");
      router.push(`/forum/${categorySlug}/${topicId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post.");
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button type="button" onClick={handleGenerate} disabled={generating}>
        {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {generating ? "Researching TA news…" : hasDraft ? "Regenerate Draft" : "Generate Draft"}
      </Button>

      {hasDraft && (
        <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-400">
            Review and edit before posting — this goes out under your own name, not automatically.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="category">Post to</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={posting} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              disabled={posting}
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handlePost} disabled={posting || !title.trim() || !body.trim()}>
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {posting ? "Posting…" : "Post to Forum"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
