"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquarePlus } from "lucide-react";

export default function SuggestTopicForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const topic = (fd.get("topic") as string)?.trim();
    if (!topic) return;

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error: insertError } = await supabase.from("topic_suggestions").insert({
        user_id: userId,
        topic,
        status: "pending",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push("/topics/suggest?submitted=true");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="topic">What should we cover? *</Label>
        <textarea
          id="topic"
          name="topic"
          rows={4}
          required
          maxLength={600}
          placeholder="e.g. How are people handling AI in candidate screening? Would love a session comparing approaches."
          className="flex w-full rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E8503A]/40 focus:border-[#E8503A] resize-none"
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
          <><Loader2 className="size-4 animate-spin" /> Submitting…</>
        ) : (
          <><MessageSquarePlus className="size-4" /> Submit Topic</>
        )}
      </button>
    </form>
  );
}
