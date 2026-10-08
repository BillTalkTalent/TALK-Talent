"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Self-service close/reopen for the member who posted the job — the admin
// jobs page already had this (status toggle + delete), but a poster had no
// way to take their own listing down short of asking an admin.
export async function toggleJobStatus(
  jobId: string,
  currentStatus: string
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const next = currentStatus === "active" ? "closed" : "active";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("job_posts")
    .update({ status: next })
    .eq("id", jobId)
    .eq("poster_id", user.id)
    .select("id");

  if (error) return { ok: false, error: "Failed to update listing." };
  if (!data || data.length === 0) return { ok: false, error: "You can only manage your own listings." };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true, status: next };
}
