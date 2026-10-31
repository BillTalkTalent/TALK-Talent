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

export default function NewVolunteerOpportunityPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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

    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    const { data: opportunity, error } = await db
      .from("founder_opportunities")
      .insert({ created_by: user.id, title: title.trim(), description: description.trim() || null, is_active: true })
      .select()
      .single();

    if (error || !opportunity) {
      toast.error("Failed to post. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Opportunity posted!");
    router.push(`/founders/volunteer/${(opportunity as { id: string }).id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/volunteer" className="hover:underline">Volunteer Options</Link>
        <span>/</span>
        <span>New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post a volunteer opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What's the task or role?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Details (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's involved, roughly how much time, anything helpful."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
