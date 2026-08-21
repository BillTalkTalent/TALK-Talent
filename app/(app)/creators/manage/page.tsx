import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CreatorManageClient from "./creator-manage-client";

export default async function CreatorManagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.is_superadmin) redirect("/dashboard");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: creator } = await db
    .from("creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: materials } = creator
    ? await db
        .from("creator_materials")
        .select("*")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> All Creators
      </Link>
      <CreatorManageClient
        userId={user.id}
        initialCreator={creator ?? null}
        initialMaterials={materials ?? []}
        defaultName={profile.full_name ?? ""}
        defaultAvatar={profile.avatar_url ?? ""}
      />
    </div>
  );
}
