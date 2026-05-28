"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MentorshipArea } from "@/lib/supabase/types";
import type { Profile } from "@/lib/supabase/types";

interface Props {
  requesterId: string;
  mentorId: string;
  mentorUser: Pick<Profile, "id" | "full_name" | "avatar_url" | "title" | "company">;
  availableAreas: MentorshipArea[];
  pendingAreaIds: string[];
}

export default function MentorshipRequestForm({
  requesterId,
  mentorId,
  mentorUser,
  availableAreas,
  pendingAreaIds,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initials =
    mentorUser.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedAreaId) {
      setError("Please select a focus area.");
      return;
    }
    if (message.trim().length < 20) {
      setError("Please write a message of at least 20 characters.");
      return;
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error: insertError } = await supabase
        .from("mentorship_requests")
        .insert({
          requester_id: requesterId,
          mentor_id: mentorId,
          area_id: selectedAreaId,
          message: message.trim(),
          status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("You already have a pending request to this mentor for that area.");
        } else {
          setError(insertError.message);
        }
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/mentorship/requests"), 1600);
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-12 text-center">
        <CheckCircle2 className="size-12 mx-auto mb-3 text-[#F07058]" />
        <p className="text-lg font-bold text-zinc-900">Request sent!</p>
        <p className="text-sm text-zinc-500 mt-1">
          {mentorUser.full_name?.split(" ")[0]} will be notified. Redirecting…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <GraduationCap className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Request Mentorship</h1>
          <p className="text-sm text-zinc-500">Send a request to your chosen mentor</p>
        </div>
      </div>

      {/* Mentor card */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-4 flex items-center gap-3">
        {mentorUser.avatar_url ? (
          <img
            src={mentorUser.avatar_url}
            alt={mentorUser.full_name ?? ""}
            className="size-12 rounded-xl object-cover ring-2 ring-[#8b5cf6]/20 flex-shrink-0"
          />
        ) : (
          <div
            className="size-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
          >
            {initials}
          </div>
        )}
        <div>
          <p className="font-bold text-sm text-zinc-900">{mentorUser.full_name}</p>
          {(mentorUser.title || mentorUser.company) && (
            <p className="text-xs text-zinc-500">
              {mentorUser.title}
              {mentorUser.title && mentorUser.company ? " · " : ""}
              {mentorUser.company}
            </p>
          )}
          <span className="inline-block mt-1 text-[10px] font-bold text-white bg-[#7c3aed] px-2 py-0.5 rounded-full">
            Mentor
          </span>
        </div>
      </div>

      {/* Area selection */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-900">What would you like help with?</p>
        <div className="space-y-2">
          {availableAreas.map((area) => {
            const alreadyPending = pendingAreaIds.includes(area.id);
            const selected = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                type="button"
                disabled={alreadyPending}
                onClick={() => !alreadyPending && setSelectedAreaId(area.id)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  alreadyPending
                    ? "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
                    : selected
                    ? "border-[#7c3aed] bg-[#8b5cf6]/5"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <span className="text-xl">{area.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">{area.name}</p>
                  {alreadyPending && (
                    <p className="text-[11px] text-amber-600">Request pending</p>
                  )}
                </div>
                {selected && !alreadyPending && (
                  <div className="size-4 rounded-full bg-[#7c3aed] flex items-center justify-center shrink-0">
                    <div className="size-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 space-y-3">
        <label htmlFor="message" className="block text-sm font-semibold text-zinc-900">
          Introduce yourself
        </label>
        <p className="text-xs text-zinc-500 -mt-2">
          Tell {mentorUser.full_name?.split(" ")[0]} about yourself and what you&apos;re hoping to learn.
        </p>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={800}
          placeholder="Hi! I'm a senior recruiter at... I'd love guidance on..."
          className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6] resize-none"
        />
        <p className="text-xs text-zinc-400 text-right">{message.length}/800</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          {isPending ? "Sending…" : "Send Request"}
        </button>
      </div>
    </form>
  );
}
