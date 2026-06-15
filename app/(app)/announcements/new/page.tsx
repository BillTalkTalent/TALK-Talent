import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnnouncementForm from "./announcement-form";

export default async function NewAnnouncementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isModerator = profile?.role === "admin" || profile?.role === "board_member";
  if (!isModerator) redirect("/dashboard");

  return <AnnouncementForm />;
}
