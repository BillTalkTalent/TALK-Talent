"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lightbulb } from "lucide-react";

export default function SuggestVendorForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error: insertError } = await supabase.from("vendor_suggestions").insert({
        user_id: userId,
        name: fd.get("name") as string,
        website: (fd.get("website") as string) || null,
        category: (fd.get("category") as string) || null,
        description: (fd.get("description") as string) || null,
        reason: (fd.get("reason") as string) || null,
        status: "pending",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push("/vendors/suggest?submitted=true");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Vendor / Tool name *</Label>
          <Input id="name" name="name" required placeholder="e.g. Greenhouse, Gem" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" placeholder="e.g. ATS, Sourcing, Analytics" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          What does it do?
          <span className="text-zinc-400 font-normal ml-1">(optional)</span>
        </Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={400}
          placeholder="Brief description of the product or service…"
          className="flex w-full rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">
          Why do you recommend it? *
        </Label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          maxLength={600}
          placeholder="We've used this at my company for 2 years and it's been great for…"
          className="flex w-full rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6] resize-none"
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
        style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
      >
        {isPending ? (
          <><Loader2 className="size-4 animate-spin" /> Submitting…</>
        ) : (
          <><Lightbulb className="size-4" /> Submit Suggestion</>
        )}
      </button>
    </form>
  );
}
