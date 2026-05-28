import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { Lightbulb, Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

async function updateSuggestionStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("vendor_suggestions").update({ status }).eq("id", id);
  revalidatePath("/admin/suggestions");
}

type Suggestion = {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  description: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export default async function AdminSuggestionsPage() {
  const adminDb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [suggestionsResult, invitationsResult] = await Promise.all([
    adminDb
      .from("vendor_suggestions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    adminDb
      .from("invitations")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  const suggestions: Suggestion[] = suggestionsResult.data ?? [];
  const invitations: Invitation[] = invitationsResult.data ?? [];

  const pending = suggestions.filter((s) => s.status === "pending");
  const reviewed = suggestions.filter((s) => s.status !== "pending");

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
      reviewed: { label: "Reviewed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      added:    { label: "Added ✓",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      rejected: { label: "Rejected", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8">

      {/* Vendor Suggestions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-[#8b5cf6]" />
          <h2 className="text-base font-bold text-zinc-900">
            Vendor Suggestions
            {pending.length > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-[#8b5cf6] px-2 py-0.5 rounded-full">
                {pending.length} new
              </span>
            )}
          </h2>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No suggestions yet.</p>
        ) : (
          <div className="space-y-3">
            {[...pending, ...reviewed].map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-100 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-zinc-900">{s.name}</p>
                      {s.category && (
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                      )}
                      {statusBadge(s.status)}
                    </div>
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">
                        {s.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">
                    {s.profiles?.full_name ?? "Unknown"} · {format(new Date(s.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                {s.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.description}</p>
                )}
                {s.reason && (
                  <p className="text-sm text-zinc-600 italic leading-relaxed">
                    &ldquo;{s.reason}&rdquo;
                  </p>
                )}

                {s.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    <form action={updateSuggestionStatus.bind(null, s.id, "added")}>
                      <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="size-3.5" /> Mark as Added
                      </Button>
                    </form>
                    <form action={updateSuggestionStatus.bind(null, s.id, "reviewed")}>
                      <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                        <Clock className="size-3.5" /> Mark as Reviewed
                      </Button>
                    </form>
                    <form action={updateSuggestionStatus.bind(null, s.id, "rejected")}>
                      <Button size="sm" type="submit" variant="ghost" className="gap-1.5 text-zinc-400 hover:text-red-500">
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invitations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-[#E8503A]" />
          <h2 className="text-base font-bold text-zinc-900">
            Member Invitations
            <span className="ml-2 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {invitations.length}
            </span>
          </h2>
        </div>

        {invitations.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No invitations sent yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Invited</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Invited by</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{inv.name ?? inv.email}</p>
                      {inv.name && <p className="text-xs text-zinc-400">{inv.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      {inv.profiles?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {format(new Date(inv.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inv.status === "accepted"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : inv.status === "expired"
                          ? "bg-zinc-100 text-zinc-400 border-zinc-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {inv.status === "accepted" ? "Joined ✓" : inv.status === "expired" ? "Expired" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
