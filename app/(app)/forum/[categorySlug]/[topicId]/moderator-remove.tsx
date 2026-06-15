"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ModeratorRemoveProps {
  table: "forum_topics" | "forum_replies";
  id: string;
  label?: string;            // e.g. "post" or "reply"
  onDeleted?: () => void;    // for replies — remove from list
  redirectTo?: string;       // for topics — navigate away after removal
}

export default function ModeratorRemove({
  table,
  id,
  label = "post",
  onDeleted,
  redirectTo,
}: ModeratorRemoveProps) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    const supabase = createClient();
    // .select() returns the deleted rows — if RLS blocks it, data is empty
    // (no error), so we can distinguish a real removal from a silent no-op.
    const { data, error } = await supabase.from(table).delete().eq("id", id).select();
    if (error || !data || data.length === 0) {
      toast.error("Couldn't remove — moderator permissions aren't active yet.");
      setRemoving(false);
      setConfirm(false);
      return;
    }
    toast.success(`${label[0].toUpperCase()}${label.slice(1)} removed.`);
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    } else {
      onDeleted?.();
    }
    setRemoving(false);
    setConfirm(false);
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Remove this {label}?</span>
        <button
          onClick={remove}
          disabled={removing}
          className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {removing ? <Loader2 className="size-3 animate-spin inline" /> : "Yes, remove"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-red-600 transition-colors"
      title="Remove as moderator"
    >
      <ShieldAlert className="size-3" /> Remove
    </button>
  );
}
