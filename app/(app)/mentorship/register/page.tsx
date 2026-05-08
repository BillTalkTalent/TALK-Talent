import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MentorshipRegisterForm from "./mentorship-register-form";
import type { MentorshipArea } from "@/lib/supabase/types";

export default async function MentorshipRegisterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [areasResult, profileResult, selectionsResult] = await Promise.all([
    db
      .from("mentorship_areas")
      .select("*")
      .order("sort_order", { ascending: true }),
    db
      .from("mentorship_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("mentorship_area_selections")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const areas: MentorshipArea[] = areasResult.data ?? [];
  const existingProfile = profileResult.data;
  const existingSelections = selectionsResult.data ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <MentorshipRegisterForm
        userId={user.id}
        areas={areas}
        existingProfile={existingProfile}
        existingSelections={existingSelections}
      />
    </div>
  );
}
