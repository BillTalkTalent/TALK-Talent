import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, MapPin, Calendar, Mail, Zap } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const workPrefLabel: Record<string, string> = {
  remote:   "Remote",
  hybrid:   "Hybrid",
  onsite:   "On-site",
  flexible: "Flexible",
};

const workPrefColor: Record<string, string> = {
  remote:   "bg-blue-50 text-blue-700 border-blue-100",
  hybrid:   "bg-violet-50 text-violet-700 border-violet-100",
  onsite:   "bg-orange-50 text-orange-700 border-orange-100",
  flexible: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default async function TalentPoolPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("talent_pool")
    .select("*, profiles(id, full_name, avatar_url, title, company)")
    .order("updated_at", { ascending: false });

  const pool = (entries ?? []) as {
    id: string;
    user_id: string;
    headline: string;
    seeking: string;
    work_pref: string;
    available_from: string | null;
    updated_at: string;
    profiles: { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null } | null;
  }[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}>
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Talent Pool</h1>
            <p className="text-sm text-zinc-500">
              {pool.length} member{pool.length !== 1 ? "s" : ""} open to new opportunities
            </p>
          </div>
        </div>
        <Link
          href="/profile#talent"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0d0d0d] hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
        >
          <Zap className="size-4" />
          Update my status
        </Link>
      </div>

      {pool.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Zap className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No one in the talent pool yet</p>
          <p className="text-sm text-zinc-400 mt-1">
            If you&apos;re open to new opportunities,{" "}
            <Link href="/profile#talent" className="text-[#00b894] hover:underline font-semibold">
              add yourself
            </Link>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pool.map((entry) => {
            const p = entry.profiles;
            return (
              <div key={entry.id} className="rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-[#00d4aa] transition-all p-5 flex flex-col gap-4">
                {/* Top: avatar + name */}
                <div className="flex items-start gap-3">
                  <Link href={`/members/${entry.user_id}`} className="shrink-0">
                    <Avatar className="size-12 ring-2 ring-offset-1 ring-[#00d4aa]/30">
                      {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />}
                      <AvatarFallback
                        className="text-sm font-bold"
                        style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)", color: "white" }}
                      >
                        {getInitials(p?.full_name ?? null)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/members/${entry.user_id}`}>
                      <p className="font-bold text-zinc-900 hover:text-[#00d4aa] transition-colors truncate">
                        {p?.full_name ?? "Member"}
                      </p>
                    </Link>
                    {(p?.title || p?.company) && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {[p.title, p.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${workPrefColor[entry.work_pref] ?? workPrefColor.flexible}`}>
                    {workPrefLabel[entry.work_pref] ?? entry.work_pref}
                  </span>
                </div>

                {/* Headline */}
                {entry.headline && (
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    &ldquo;{entry.headline}&rdquo;
                  </p>
                )}

                {/* Seeking */}
                {entry.seeking && (
                  <div className="flex items-start gap-2 text-xs text-zinc-500">
                    <Briefcase className="size-3.5 shrink-0 mt-0.5 text-zinc-400" />
                    <span>{entry.seeking}</span>
                  </div>
                )}

                {/* Available from */}
                {entry.available_from && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="size-3.5 text-zinc-400" />
                    <span>Available {format(new Date(entry.available_from), "MMM d, yyyy")}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-50 mt-auto">
                  <span className="text-[11px] text-zinc-400">
                    Updated {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                  </span>
                  <Link
                    href={`/messages?with=${entry.user_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
                  >
                    <Mail className="size-3" />
                    Message
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
