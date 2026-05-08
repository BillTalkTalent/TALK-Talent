import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap, Users, ArrowRight, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MentorshipArea, MentorshipProfile, MentorshipAreaSelection } from "@/lib/supabase/types";
import type { Profile } from "@/lib/supabase/types";

type MentorWithProfile = MentorshipProfile & {
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url" | "title" | "company">;
  mentorship_area_selections: MentorshipAreaSelection[];
};

export default async function MentorshipPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [areasResult, mentorsResult, myProfileResult] = await Promise.all([
    db
      .from("mentorship_areas")
      .select("*")
      .order("sort_order", { ascending: true }),
    db
      .from("mentorship_profiles")
      .select(`
        *,
        profiles (id, full_name, avatar_url, title, company),
        mentorship_area_selections (*)
      `)
      .eq("is_mentor", true)
      .eq("is_active", true),
    user
      ? db
          .from("mentorship_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const areas: MentorshipArea[] = areasResult.data ?? [];
  const mentors: MentorWithProfile[] = (mentorsResult.data ?? []) as MentorWithProfile[];
  const myProfile = myProfileResult.data as MentorshipProfile | null;

  const areaMap = Object.fromEntries(areas.map((a) => [a.id, a]));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
          >
            <GraduationCap className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Mentorship</h1>
            <p className="text-sm text-zinc-500">Connect with experienced TA leaders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-[#7c3aed] hover:bg-[#8b5cf6]/10"
            render={<Link href="/mentorship/requests" />}
          >
            My Requests
          </Button>
          <Button
            size="sm"
            className="text-sm font-semibold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
            render={<Link href="/mentorship/register" />}
          >
            {myProfile ? "Edit Profile" : "Join as Mentor / Mentee"}
          </Button>
        </div>
      </div>

      {/* Areas strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {areas.map((area) => {
          const mentorCount = mentors.filter((m) =>
            m.mentorship_area_selections.some((s) => s.area_id === area.id && s.as_mentor)
          ).length;
          return (
            <div
              key={area.id}
              className="rounded-2xl border border-zinc-100 bg-white p-4 text-center shadow-sm hover:border-[#8b5cf6]/40 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-1.5">{area.icon}</div>
              <p className="text-xs font-semibold text-zinc-800 leading-tight">{area.name}</p>
              <p className="text-[11px] text-zinc-400 mt-1">{mentorCount} mentor{mentorCount !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>

      {/* Mentor grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Users className="size-4 text-[#8b5cf6]" />
            Available Mentors
            <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {mentors.length}
            </span>
          </h2>
        </div>

        {mentors.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-16 text-center">
            <GraduationCap className="size-10 text-zinc-200 mx-auto mb-3" />
            <p className="font-medium text-zinc-400">No mentors yet</p>
            <p className="text-sm text-zinc-400 mt-1">Be the first to offer mentorship to the community!</p>
            <Button
              size="sm"
              className="mt-4 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
              render={<Link href="/mentorship/register" />}
            >
              Become a Mentor
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => {
              const p = mentor.profiles;
              const mentorAreas = mentor.mentorship_area_selections
                .filter((s) => s.as_mentor)
                .map((s) => areaMap[s.area_id])
                .filter(Boolean);
              const initials = p.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() ?? "?";

              return (
                <div
                  key={mentor.id}
                  className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-[#8b5cf6]/30 transition-all flex flex-col"
                >
                  <div className="h-1" style={{ background: "linear-gradient(90deg, #7c3aed, #8b5cf6)" }} />
                  <div className="p-5 flex flex-col flex-1">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-3 mb-3">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.full_name ?? ""}
                          className="size-11 rounded-xl object-cover ring-2 ring-[#8b5cf6]/20 flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="size-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{p.full_name}</p>
                        {(p.title || p.company) && (
                          <p className="text-xs text-zinc-500 truncate">
                            {p.title}{p.title && p.company ? " · " : ""}{p.company}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="size-3 text-[#f97316] fill-[#f97316]" />
                          <span className="text-[11px] font-semibold text-zinc-600">Mentor</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    {mentor.bio && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3 flex-1">{mentor.bio}</p>
                    )}

                    {/* Areas */}
                    {mentorAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {mentorAreas.slice(0, 3).map((area) => (
                          <span
                            key={area.id}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7c3aed] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full"
                          >
                            {area.icon} {area.name}
                          </span>
                        ))}
                        {mentorAreas.length > 3 && (
                          <span className="text-[10px] font-medium text-zinc-400 px-1">
                            +{mentorAreas.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <Link
                      href={`/mentorship/request/${mentor.user_id}`}
                      className="mt-auto flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
                    >
                      Request Mentorship
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Being a mentee CTA */}
      {(!myProfile || !myProfile.is_mentee) && (
        <div
          className="rounded-2xl p-6 text-white flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="size-6 text-[#8b5cf6]" />
            </div>
            <div>
              <p className="font-bold text-base">Looking for a mentor?</p>
              <p className="text-white/60 text-sm mt-0.5">
                Register as a mentee to get matched with experienced TA leaders.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 font-semibold text-sm px-5"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)", color: "#0d0d0d" }}
            render={<Link href="/mentorship/register" />}
          >
            Get Started
          </Button>
        </div>
      )}
    </div>
  );
}
