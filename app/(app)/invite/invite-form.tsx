"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, AlertTriangle } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  title: string | null;
  status: "pending" | "approved" | "rejected";
};

export default function InviteForm({ inviterId }: { inviterId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  async function sendInvite(fd: FormData, force: boolean) {
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        name: fd.get("name") || null,
        message: fd.get("message") || null,
        inviterId,
        force,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === "possible_duplicate" && data.candidates?.length) {
        setCandidates(data.candidates);
        setPendingForm(fd);
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(`/invite?sent=${data.outcome ?? "queued"}`);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCandidates(null);
    const fd = new FormData(e.currentTarget);
    startTransition(() => sendInvite(fd, false));
  }

  function handleSendAnyway() {
    if (!pendingForm) return;
    startTransition(() => sendInvite(pendingForm, true));
  }

  if (candidates) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-900">
              This might already be a TALK member — invite them anyway?
            </p>
          </div>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-white rounded-lg border border-amber-100 px-3 py-2">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt="" className="size-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-9 rounded-full bg-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.full_name ?? "TALK Member"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.title, c.company].filter(Boolean).join(" · ") || " "}
                    {" — "}{c.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSendAnyway}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-70 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
          >
            {isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="size-4" /> Not them — send invite anyway</>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setCandidates(null); setPendingForm(null); }}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Their name *</Label>
          <Input id="name" name="name" required placeholder="Jane Smith" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address *</Label>
          <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Personal message
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={400}
          placeholder="Hey, I thought you'd love this community of TA leaders…"
          className="flex w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-70 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
      >
        {isPending ? (
          <><Loader2 className="size-4 animate-spin" /> Sending invite…</>
        ) : (
          <><Send className="size-4" /> Send Invite</>
        )}
      </button>
    </form>
  );
}
