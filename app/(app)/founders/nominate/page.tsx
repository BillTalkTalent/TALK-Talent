"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, UserPlus } from "lucide-react";

export default function NominateFounderPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
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
      name: name.trim(),
      email: email.trim().toLowerCase(),
      note: note.trim() || null,
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders" className="hover:underline">Founders Hub</Link>
        <span>/</span>
        <span>Nominate</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-indigo-600" />
            Nominate a founding member
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Know someone who should be helping rebuild TALK as part of this group? This goes straight to Bill for
            review — it&apos;s not visible to anyone else, including you, once submitted.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-2 py-4">
              <CheckCircle2 className="size-8 mx-auto text-emerald-600" />
              <p className="text-sm font-medium text-foreground">Nomination sent</p>
              <p className="text-sm text-muted-foreground">Bill will review it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Their name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Their email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Doesn't need to be a TALK member yet"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Why them? (optional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={submitting} />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting || !name.trim() || !email.trim()}>
                  {submitting ? "Submitting…" : "Submit nomination"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
