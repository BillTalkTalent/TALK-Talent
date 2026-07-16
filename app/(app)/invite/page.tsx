import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InviteForm from "./invite-form";
import { Mail, Users, CheckCircle2 } from "lucide-react";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load this member's sent invites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: invites } = await db
    .from("invitations")
    .select("*")
    .eq("inviter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
        >
          <Mail className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Invite a Member</h1>
          <p className="text-sm text-zinc-500">Grow the TALK community</p>
        </div>
      </div>

      {/* Success banner — message depends on what happened */}
      {sent && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3 text-white"
          style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
        >
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-sm font-semibold">
            {sent === "claim_sent"
              ? "They're already a TALK member — we've emailed them a link to jump straight in."
              : sent === "already_active"
              ? "They're already an active member — nothing else needed."
              : "Thanks! Your invite's in — we'll review them and send an invitation to join TALK."}
          </p>
        </div>
      )}

      {/* Invite form */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
        <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
          Know a TA leader who should be part of TALK Talent? Invite them using the form below!
        </p>
        <InviteForm inviterId={user.id} />
      </div>

      {/* Sent invites history */}
      {invites && invites.length > 0 && (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <Users className="size-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900">Your Invites</span>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full ml-1">
              {invites.length}
            </span>
          </div>
          <ul className="divide-y divide-zinc-50">
            {invites.map((invite: {
              id: string;
              email: string;
              name: string | null;
              status: string;
              created_at: string;
            }) => (
              <li key={invite.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {invite.name ?? invite.email}
                  </p>
                  {invite.name && (
                    <p className="text-xs text-zinc-400">{invite.email}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  invite.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invite.status === "expired"
                    ? "bg-zinc-100 text-zinc-400 border-zinc-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {invite.status === "accepted" ? "Joined ✓" : invite.status === "expired" ? "Expired" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
