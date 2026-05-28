"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface Props {
  requestId: string;
  isRequester?: boolean;
}

export default function RequestActions({ requestId, isRequester = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  async function updateStatus(status: "accepted" | "declined" | "withdrawn") {
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      await supabase
        .from("mentorship_requests")
        .update({ status })
        .eq("id", requestId);
      setDone(true);
      router.refresh();
    });
  }

  if (done) return null;

  if (isRequester) {
    return (
      <button
        onClick={() => updateStatus("withdrawn")}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <RotateCcw className="size-3" />
        Withdraw
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateStatus("declined")}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <XCircle className="size-3.5" />
        Decline
      </button>
      <button
        onClick={() => updateStatus("accepted")}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
      >
        <CheckCircle2 className="size-3.5" />
        Accept
      </button>
    </div>
  );
}
