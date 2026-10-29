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

export default function NewSuggestionPage() {
  const router = useRouter();
  const [type, setType] = useState<"idea" | "topic">("idea");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: suggestion, error } = await (supabase as any)
      .from("founder_suggestions")
      .insert({ author_id: user.id, type, title: title.trim(), body: body.trim() || null })
      .select()
      .single();

    if (error || !suggestion) {
      toast.error("Failed to submit. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success(`${type === "idea" ? "Idea" : "Topic"} submitted!`);
    router.push(`/founders/suggestions/${suggestion.id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/suggestions" className="hover:underline">Ideas &amp; Topics</Link>
        <span>/</span>
        <span>New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit an idea or topic</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["idea", "topic"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    disabled={submitting}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors ${
                      type === t ? "bg-zinc-900 text-white" : "bg-muted text-muted-foreground hover:bg-zinc-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder={type === "idea" ? "What's the idea?" : "What should we discuss?"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Details (optional)</Label>
              <Textarea
                id="body"
                placeholder="Add any context that'll help others understand and vote on it."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim()}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
