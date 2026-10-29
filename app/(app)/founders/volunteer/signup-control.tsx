"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function SignupControl({
  opportunityId,
  initialSignedUp,
  initialNote,
}: {
  opportunityId: string;
  initialSignedUp: boolean;
  initialNote: string;
}) {
  const router = useRouter();
  const [signedUp, setSignedUp] = useState(initialSignedUp);
  const [addingNote, setAddingNote] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    await db.from("founder_volunteer_signups").insert({
      opportunity_id: opportunityId,
      member_id: user.id,
      note: note.trim() || null,
    });
    setSignedUp(true);
    setAddingNote(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleWithdraw() {
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    await db.from("founder_volunteer_signups").delete().eq("opportunity_id", opportunityId).eq("member_id", user.id);
    setSignedUp(false);
    setSubmitting(false);
    router.refresh();
  }

  if (signedUp) {
    return (
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-4" />
          You&apos;re signed up
        </span>
        <Button size="sm" variant="outline" onClick={handleWithdraw} disabled={submitting}>
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Withdraw"}
        </Button>
      </div>
    );
  }

  if (addingNote) {
    return (
      <div className="flex items-center gap-2 pt-1 border-t border-border/60">
        <Input
          placeholder="Anything to add? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSignUp} disabled={submitting}>
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm"}
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-1 border-t border-border/60">
      <Button size="sm" onClick={() => setAddingNote(true)}>
        Sign up
      </Button>
    </div>
  );
}
