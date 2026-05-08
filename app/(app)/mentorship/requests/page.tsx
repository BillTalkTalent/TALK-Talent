import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Inbox, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import RequestActions from "./request-actions";
import type { MentorshipArea } from "@/lib/supabase/types";
import type { Profile } from "@/lib/supabase/types";

type RequestRow = {
  id: string;
  requester_id: string;
  mentor_id: string;
  area_id: string;
  message: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  area: MentorshipArea | null;
  requester: Pick<Profile, "id" | "full_name" | "avatar_url" | "title" | "company"> | null;
  mentor: Pick<Profile, "id" | "full_name" | "avatar_url" | "title" | "company"> | null;
};

export default async function MentorshipRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: requests } = await db
    .from("mentorship_requests")
    .select(`
      *,
      area:mentorship_areas (*),
      requester:profiles!requester_id (id, full_name, avatar_url, title, company),
      mentor:profiles!mentor_id (id, full_name, avatar_url, title, company)
    `)
    .or(`requester_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const allRequests: RequestRow[] = (requests ?? []) as RequestRow[];

  const incoming = allRequests.filter((r) => r.mentor_id === user.id);
  const outgoing = allRequests.filter((r) => r.requester_id === user.id);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
      accepted:  { label: "Accepted",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      declined:  { label: "Declined",  cls: "bg-red-50 text-red-600 border-red-200" },
      withdrawn: { label: "Withdrawn", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const RequestCard = ({
    req,
    perspective,
  }: {
    req: RequestRow;
    perspective: "mentor" | "requester";
  }) => {
    const person = perspective === "mentor" ? req.requester : req.mentor;
    const initials =
      person?.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "?";

    return (
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: "linear-gradient(90deg, #7c3aed, #8b5cf6)" }} />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {person?.avatar_url ? (
                <img
                  src={person.avatar_url}
                  alt={person.full_name ?? ""}
                  className="size-10 rounded-xl object-cover ring-2 ring-[#8b5cf6]/20 flex-shrink-0"
                />
              ) : (
                <div
                  className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
                >
                  {initials}
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-zinc-900">{person?.full_name ?? "Unknown"}</p>
                {(person?.title || person?.company) && (
                  <p className="text-xs text-zinc-500 truncate">
                    {person?.title}
                    {person?.title && person?.company ? " · " : ""}
                    {person?.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusBadge(req.status)}
            </div>
          </div>

          {/* Area */}
          {req.area && (
            <div className="flex items-center gap-2">
              <span className="text-base">{req.area.icon}</span>
              <span className="text-xs font-semibold text-[#7c3aed] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full">
                {req.area.name}
              </span>
            </div>
          )}

          {/* Message */}
          <p className="text-sm text-zinc-600 bg-zinc-50 rounded-xl px-3.5 py-2.5 italic leading-relaxed">
            &ldquo;{req.message}&rdquo;
          </p>

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
            </p>
            {perspective === "mentor" && req.status === "pending" && (
              <RequestActions requestId={req.id} />
            )}
            {perspective === "requester" && req.status === "pending" && (
              <RequestActions requestId={req.id} isRequester />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
          >
            <Inbox className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Mentorship Requests</h1>
            <p className="text-sm text-zinc-500">Manage incoming and outgoing requests</p>
          </div>
        </div>
        <Link
          href="/mentorship"
          className="text-sm font-semibold text-[#7c3aed] hover:underline"
        >
          ← Back to Mentors
        </Link>
      </div>

      {/* Incoming */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-zinc-500" />
          <h2 className="text-sm font-bold text-zinc-900">
            Incoming Requests
            <span className="ml-2 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {incoming.length}
            </span>
          </h2>
        </div>
        {incoming.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-10 text-center">
            <Inbox className="size-8 text-zinc-200 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No incoming requests yet.</p>
          </div>
        ) : (
          incoming.map((req) => (
            <RequestCard key={req.id} req={req} perspective="mentor" />
          ))
        )}
      </section>

      {/* Outgoing */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-zinc-500" />
          <h2 className="text-sm font-bold text-zinc-900">
            Sent Requests
            <span className="ml-2 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {outgoing.length}
            </span>
          </h2>
        </div>
        {outgoing.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-10 text-center">
            <Send className="size-8 text-zinc-200 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">You haven&apos;t sent any requests yet.</p>
            <Link
              href="/mentorship"
              className="inline-block mt-3 text-sm font-semibold text-[#7c3aed] hover:underline"
            >
              Browse mentors →
            </Link>
          </div>
        ) : (
          outgoing.map((req) => (
            <RequestCard key={req.id} req={req} perspective="requester" />
          ))
        )}
      </section>
    </div>
  );
}
