"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, EyeOff, Eye } from "lucide-react";
import { toggleJobStatus } from "./job-actions";

export default function JobStatusToggle({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);
  const isActive = status === "active";

  async function handleToggle() {
    setWorking(true);
    const result = await toggleJobStatus(jobId, status);
    setWorking(false);
    setConfirm(false);
    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }
    toast.success(isActive ? "Listing closed — it's no longer visible on the job board." : "Listing reopened.");
    router.refresh();
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Close this listing?</span>
        <button
          onClick={handleToggle}
          disabled={working}
          className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {working ? <Loader2 className="size-3 animate-spin inline" /> : "Yes, close it"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return isActive ? (
    <button
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
    >
      <EyeOff className="size-3.5" /> Close listing
    </button>
  ) : (
    <button
      onClick={handleToggle}
      disabled={working}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      {working ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} Reopen listing
    </button>
  );
}
