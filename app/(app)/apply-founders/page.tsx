import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import ApplyForm from "./apply-form";

export default async function ApplyFoundersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email, is_founding_member, role")
    .eq("id", user.id)
    .single();

  const p = profile as { full_name: string | null; email: string; is_founding_member: boolean; role: string };

  if (p.is_founding_member || p.role === "admin") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-card border border-border shadow-sm p-10 text-center space-y-2">
          <CheckCircle2 className="size-10 mx-auto text-emerald-600" />
          <p className="font-semibold text-foreground">You&apos;re already in the Founders Hub</p>
          <Link href="/founders" className="text-sm text-indigo-600 hover:underline">
            Go to the Founders Hub →
          </Link>
        </div>
      </div>
    );
  }

  const { data: existing } = await db
    .from("founder_nominations")
    .select("status, created_at")
    .eq("nominator_id", user.id)
    .eq("is_self", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const e = existing as { status: string } | null;

  if (e?.status === "pending") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-card border border-border shadow-sm p-10 text-center space-y-2">
          <Clock className="size-10 mx-auto text-amber-500" />
          <p className="font-semibold text-foreground">Your application is under review</p>
          <p className="text-sm text-muted-foreground">Bill will follow up once it&apos;s been reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ApplyForm defaultName={p.full_name ?? ""} defaultEmail={p.email} previouslyDeclined={e?.status === "declined"} />
    </div>
  );
}
