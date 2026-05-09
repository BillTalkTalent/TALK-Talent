"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

export default function InviteForm({ inviterId }: { inviterId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          name: fd.get("name") || null,
          message: fd.get("message") || null,
          inviterId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/invite?sent=true");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Their name</Label>
          <Input id="name" name="name" placeholder="Jane Smith" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address *</Label>
          <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Personal message
          <span className="text-zinc-400 font-normal ml-1">(optional)</span>
        </Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={400}
          placeholder="Hey, I thought you'd love this community of TA leaders…"
          className="flex w-full rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/40 focus:border-[#00d4aa] resize-none"
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0d0d0d] disabled:opacity-70 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
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
