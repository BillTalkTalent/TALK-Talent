"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function RsvpControl({
  eventId,
  initialGoing,
}: {
  eventId: string;
  initialGoing: boolean;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [submitting, setSubmitting] = useState(false);

  async function handleRsvp() {
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    await db.from("founder_event_rsvps").insert({ event_id: eventId, member_id: user.id });
    setGoing(true);
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
    await db.from("founder_event_rsvps").delete().eq("event_id", eventId).eq("member_id", user.id);
    setGoing(false);
    setSubmitting(false);
    router.refresh();
  }

  if (going) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-4" />
          You&apos;re going
        </span>
        <Button size="sm" variant="outline" onClick={handleWithdraw} disabled={submitting}>
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Can't make it"}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={handleRsvp} disabled={submitting}>
      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "I'm going"}
    </Button>
  );
}
