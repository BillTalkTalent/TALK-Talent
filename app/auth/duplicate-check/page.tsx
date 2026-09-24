import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findMemberMatchesByName } from "@/lib/find-member-matches";
import { sendRecoveryLink } from "@/lib/send-recovery-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MailCheck } from "lucide-react";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// Reached right after a brand-new "Sign in with LinkedIn" account is
// created (app/auth/callback), before it ever gets to /dashboard. LinkedIn
// OAuth has no way to know the person already has a TALK account under a
// different email (e.g. LinkedIn tied to a personal address, TALK account
// under a work one) — that's exactly what created a confusing duplicate
// pending account for a real member. This gives them one chance to say
// "that's actually me" before the duplicate goes any further.
async function confirmMatch(formData: FormData) {
  "use server";
  const candidateId = formData.get("candidateId") as string;
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  if (!profile?.full_name) redirect(next);

  // Re-run the match server-side rather than trusting the posted id —
  // the candidate must still be a real match for this exact account.
  const matches = await findMemberMatchesByName(profile.full_name, user.id);
  const candidate = matches.find((m) => m.id === candidateId);
  if (!candidate?.email) redirect(next);

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";
  // Confirming doesn't log them straight in — it emails a login link to the
  // matched account's own inbox, which is the actual security control here.
  await sendRecoveryLink(candidate.email, "duplicate", origin);

  // Clean up the duplicate shell this LinkedIn sign-in just created.
  await supabase.auth.signOut();
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id);

  redirect("/auth/duplicate-check?sent=1");
}

async function dismissMatch(formData: FormData) {
  "use server";
  const next = (formData.get("next") as string) || "/dashboard";
  redirect(next);
}

export default async function DuplicateCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";

  if (sp.sent === "1") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <MailCheck className="size-8 mx-auto text-[#E8503A]" />
          <h1 className="text-lg font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a login link to your existing TALK account. Click it to get straight in.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  if (!profile?.full_name) redirect(next);

  const matches = await findMemberMatchesByName(profile.full_name, user.id);
  if (matches.length === 0) redirect(next);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Is one of these your account?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We found an existing TALK account with the same name as yours — signing in with LinkedIn
            just created a new one instead of finding it.
          </p>
        </div>

        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Avatar size="sm">
                {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ""} />}
                <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{m.full_name ?? "TALK Member"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[m.title, m.company].filter(Boolean).join(" · ") || m.email}
                </p>
              </div>
              <form action={confirmMatch}>
                <input type="hidden" name="candidateId" value={m.id} />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
                >
                  That&apos;s me
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={dismissMatch}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            None of these are me — continue as a new member
          </button>
        </form>
      </div>
    </div>
  );
}
