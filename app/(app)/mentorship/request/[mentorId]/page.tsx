import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MentorshipRequestForm from "./mentorship-request-form";
import type { MentorshipArea, MentorshipAreaSelection } from "@/lib/supabase/types";
import type { Profile } from "@/lib/supabase/types";

export default async function RequestMentorshipPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.id === mentorId) redirect("/mentorship");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [mentorProfileResult, mentorUserResult, areasResult, myPendingResult] =
    await Promise.all([
      db
        .from("mentorship_profiles")
        .select("*, mentorship_area_selections(*)")
        .eq("user_id", mentorId)
        .eq("is_mentor", true)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, title, company")
        .eq("id", mentorId)
        .single(),
      db
        .from("mentorship_areas")
        .select("*")
        .order("sort_order", { ascending: true }),
      // Existing pending requests from me to this mentor
      db
        .from("mentorship_requests")
        .select("area_id")
        .eq("requester_id", user.id)
        .eq("mentor_id", mentorId)
        .eq("status", "pending"),
    ]);

  if (!mentorProfileResult.data) notFound();

  const mentor = mentorProfileResult.data as {
    mentorship_area_selections: MentorshipAreaSelection[];
  };
  const mentorUser = mentorUserResult.data as Profile;
  const allAreas: MentorshipArea[] = areasResult.data ?? [];
  const pendingAreaIds = new Set(((myPendingResult.data ?? []) as { area_id: string }[]).map((r) => r.area_id));

  // Only show areas this mentor offers
  const mentorAreaIds = new Set(
    mentor.mentorship_area_selections
      .filter((s) => s.as_mentor)
      .map((s) => s.area_id)
  );
  const availableAreas = allAreas.filter((a) => mentorAreaIds.has(a.id));

  return (
    <div className="p-6 max-w-xl mx-auto">
      <MentorshipRequestForm
        requesterId={user.id}
        mentorId={mentorId}
        mentorUser={mentorUser}
        availableAreas={availableAreas}
        pendingAreaIds={Array.from(pendingAreaIds)}
      />
    </div>
  );
}
