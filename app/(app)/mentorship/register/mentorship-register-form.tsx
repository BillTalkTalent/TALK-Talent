"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MentorshipArea, MentorshipProfile, MentorshipAreaSelection } from "@/lib/supabase/types";

interface Props {
  userId: string;
  areas: MentorshipArea[];
  existingProfile: MentorshipProfile | null;
  existingSelections: MentorshipAreaSelection[];
}

export default function MentorshipRegisterForm({
  userId,
  areas,
  existingProfile,
  existingSelections,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [isMentor, setIsMentor] = useState(existingProfile?.is_mentor ?? false);
  const [isMentee, setIsMentee] = useState(existingProfile?.is_mentee ?? false);
  const [bio, setBio] = useState(existingProfile?.bio ?? "");

  // area selections: areaId -> { asMentor, asMentee }
  const initialSelections: Record<string, { asMentor: boolean; asMentee: boolean }> = {};
  for (const sel of existingSelections) {
    initialSelections[sel.area_id] = {
      asMentor: sel.as_mentor,
      asMentee: sel.as_mentee,
    };
  }
  const [areaSelections, setAreaSelections] = useState(initialSelections);

  function toggleArea(areaId: string, role: "asMentor" | "asMentee") {
    setAreaSelections((prev) => {
      const cur = prev[areaId] ?? { asMentor: false, asMentee: false };
      return { ...prev, [areaId]: { ...cur, [role]: !cur[role] } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isMentor && !isMentee) {
      setError("Please select at least one role (Mentor or Mentee).");
      return;
    }

    const hasArea = Object.values(areaSelections).some(
      (s) => (isMentor && s.asMentor) || (isMentee && s.asMentee)
    );
    if (!hasArea) {
      setError("Please select at least one focus area for your chosen role.");
      return;
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      // Upsert mentorship_profiles
      const { error: profileError } = await supabase
        .from("mentorship_profiles")
        .upsert(
          {
            user_id: userId,
            is_mentor: isMentor,
            is_mentee: isMentee,
            bio: bio.trim() || null,
            is_active: true,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        setError(profileError.message);
        return;
      }

      // Delete old selections then re-insert
      await supabase
        .from("mentorship_area_selections")
        .delete()
        .eq("user_id", userId);

      const selections = Object.entries(areaSelections)
        .filter(([, s]) => s.asMentor || s.asMentee)
        .map(([areaId, s]) => ({
          user_id: userId,
          area_id: areaId,
          as_mentor: s.asMentor,
          as_mentee: s.asMentee,
        }));

      if (selections.length > 0) {
        const { error: selError } = await supabase
          .from("mentorship_area_selections")
          .insert(selections);
        if (selError) {
          setError(selError.message);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => router.push("/mentorship"), 1500);
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-12 text-center">
        <CheckCircle2 className="size-12 mx-auto mb-3 text-[#00d4aa]" />
        <p className="text-lg font-bold text-zinc-900">Profile saved!</p>
        <p className="text-sm text-zinc-500 mt-1">Redirecting you back to Mentorship…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <GraduationCap className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {existingProfile ? "Edit Mentorship Profile" : "Join the Mentorship Program"}
          </h1>
          <p className="text-sm text-zinc-500">Set up your mentor or mentee profile</p>
        </div>
      </div>

      {/* Role selection */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-900">What role(s) would you like?</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Mentor */}
          <button
            type="button"
            onClick={() => setIsMentor(!isMentor)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              isMentor
                ? "border-[#7c3aed] bg-[#8b5cf6]/5"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="text-2xl mb-2">🎓</div>
            <p className="font-bold text-sm text-zinc-900">Mentor</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Share your expertise and guide others
            </p>
            {isMentor && (
              <span className="inline-block mt-2 text-[10px] font-bold text-white bg-[#7c3aed] px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </button>

          {/* Mentee */}
          <button
            type="button"
            onClick={() => setIsMentee(!isMentee)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              isMentee
                ? "border-[#00b894] bg-[#00d4aa]/5"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="text-2xl mb-2">📚</div>
            <p className="font-bold text-sm text-zinc-900">Mentee</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Learn from experienced TA leaders
            </p>
            {isMentee && (
              <span className="inline-block mt-2 text-[10px] font-bold text-white bg-[#00b894] px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Focus areas */}
      {(isMentor || isMentee) && (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-900">Focus areas</p>
          <p className="text-xs text-zinc-500 -mt-2">
            Select the areas you want to{" "}
            {isMentor && isMentee
              ? "mentor or be mentored in"
              : isMentor
              ? "mentor others in"
              : "learn about"}
            .
          </p>
          <div className="space-y-3">
            {areas.map((area) => {
              const sel = areaSelections[area.id] ?? { asMentor: false, asMentee: false };
              return (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{area.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{area.name}</p>
                      {area.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1">{area.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {isMentor && (
                      <button
                        type="button"
                        onClick={() => toggleArea(area.id, "asMentor")}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          sel.asMentor
                            ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                            : "bg-white text-zinc-400 border-zinc-200 hover:border-[#7c3aed] hover:text-[#7c3aed]"
                        }`}
                      >
                        Mentor
                      </button>
                    )}
                    {isMentee && (
                      <button
                        type="button"
                        onClick={() => toggleArea(area.id, "asMentee")}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          sel.asMentee
                            ? "bg-[#00b894] text-white border-[#00b894]"
                            : "bg-white text-zinc-400 border-zinc-200 hover:border-[#00b894] hover:text-[#00b894]"
                        }`}
                      >
                        Mentee
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bio */}
      {(isMentor || isMentee) && (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 space-y-3">
          <label htmlFor="bio" className="block text-sm font-semibold text-zinc-900">
            {isMentor ? "Mentor bio" : "About you"}
            <span className="text-zinc-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder={
              isMentor
                ? "Tell potential mentees about your background, experience, and what you can help with..."
                : "Share a bit about yourself and what you're looking to learn..."
            }
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6] resize-none"
          />
          <p className="text-xs text-zinc-400 text-right">{bio.length}/600</p>
        </div>
      )}

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
          {isPending ? "Saving…" : existingProfile ? "Save Changes" : "Create Profile"}
        </button>
      </div>
    </form>
  );
}
