"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Flag } from "lucide-react";

export default function ApplyForm({
  defaultName,
  defaultEmail,
  previouslyDeclined,
}: {
  defaultName: string;
  defaultEmail: string;
  previouslyDeclined: boolean;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    const { error } = await db.from("founder_nominations").insert({
      nominator_id: user.id,
      name: defaultName,
      email: defaultEmail,
      note: note.trim() || null,
      is_self: true,
    });

    if (error) {
      toast.error("Failed to submit. Please try again.");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="size-5 text-indigo-600" />
          Apply to join the founding group
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          TALK&apos;s founding members are helping rebuild the platform from the ground up — ideas, early access,
          and a say in what gets built next. This goes straight to Bill for review.
          {previouslyDeclined && " You've applied before — feel free to try again if something's changed."}
        </p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="text-center space-y-2 py-4">
            <CheckCircle2 className="size-8 mx-auto text-emerald-600" />
            <p className="text-sm font-medium text-foreground">Application sent</p>
            <p className="text-sm text-muted-foreground">Bill will follow up once it&apos;s been reviewed.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={defaultName} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={defaultEmail} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Why do you want to join? (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                disabled={submitting}
                placeholder="What would you bring to the founding group?"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
