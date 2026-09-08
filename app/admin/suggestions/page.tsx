import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { Lightbulb, Mail, CheckCircle2, XCircle, Clock, MessageSquarePlus, Handshake, ArrowRight, Megaphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function updateVendorLeadStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("vendor_leads").update({ status }).eq("id", id);
  revalidatePath("/admin/suggestions");
}

async function updateSponsorshipInquiryStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("sponsorship_inquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/suggestions");
}

async function updateVendorUpdateStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("vendor_updates").update({ status }).eq("id", id);
  revalidatePath("/admin/suggestions");
}

async function updateSuggestionStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // "Added" is supposed to mean the vendor is live in the directory — create
  // the vendors row from what the member submitted so it actually shows up
  // in /admin/vendors, ready for an admin to finish out (logo, contact info).
  if (status === "added") {
    const { data: suggestion } = await supabase
      .from("vendor_suggestions")
      .select("name, website, category, description, user_id")
      .eq("id", id)
      .single();

    if (suggestion) {
      await supabase.from("vendors").insert({
        name: suggestion.name,
        website: suggestion.website,
        category: suggestion.category,
        description: suggestion.description,
        submitted_by: suggestion.user_id,
      });
    }
  }

  await supabase.from("vendor_suggestions").update({ status }).eq("id", id);
  revalidatePath("/admin/suggestions");
}

async function updateTopicStatus(id: string, status: string) {
  "use server";
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("topic_suggestions").update({ status }).eq("id", id);
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

type TopicSuggestion = {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

type VendorLead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string;
  website: string | null;
  message: string | null;
  status: string;
  created_at: string;
  converted_vendor_id: string | null;
};

type SponsorshipInquiry = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  vendors: { id: string; name: string } | null;
  sponsorship_opportunities: { title: string; price_label: string | null } | null;
};

type VendorUpdateItem = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  status: string;
  created_at: string;
  vendors: { id: string; name: string } | null;
};

export default async function AdminSuggestionsPage() {
  const adminDb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [suggestionsResult, invitationsResult, topicsResult, vendorLeadsResult, sponsorshipInquiriesResult, vendorUpdatesResult] = await Promise.all([
    adminDb
      .from("vendor_suggestions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    adminDb
      .from("invitations")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false }),
    adminDb
      .from("topic_suggestions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    adminDb
      .from("vendor_leads")
      .select("*")
      .order("created_at", { ascending: false }),
    adminDb
      .from("sponsorship_inquiries")
      .select("id, status, message, created_at, vendors(id, name), sponsorship_opportunities(title, price_label)")
      .order("created_at", { ascending: false }),
    adminDb
      .from("vendor_updates")
      .select("id, title, body, link_url, status, created_at, vendors(id, name)")
      .order("created_at", { ascending: false }),
  ]);

  const suggestions: Suggestion[] = suggestionsResult.data ?? [];
  const invitations: Invitation[] = invitationsResult.data ?? [];
  const topics: TopicSuggestion[] = topicsResult.data ?? [];
  const vendorLeads: VendorLead[] = vendorLeadsResult.data ?? [];
  const pendingLeads = vendorLeads.filter((l) => l.status === "pending");
  const otherLeads = vendorLeads.filter((l) => l.status !== "pending");

  const sponsorshipInquiries: SponsorshipInquiry[] = sponsorshipInquiriesResult.data ?? [];
  const pendingInquiries = sponsorshipInquiries.filter((i) => i.status === "pending");
  const otherInquiries = sponsorshipInquiries.filter((i) => i.status !== "pending");

  const vendorUpdates: VendorUpdateItem[] = vendorUpdatesResult.data ?? [];
  const pendingVendorUpdates = vendorUpdates.filter((u) => u.status === "pending");
  const otherVendorUpdates = vendorUpdates.filter((u) => u.status !== "pending");

  const pending = suggestions.filter((s) => s.status === "pending");
  const reviewed = suggestions.filter((s) => s.status !== "pending");

  const pendingTopics = topics.filter((t) => t.status === "pending");
  const otherTopics = topics.filter((t) => t.status !== "pending");

  const topicStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      reviewed: { label: "Reviewed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      planned: { label: "Planned ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      declined: { label: "Declined", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

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

  const leadStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "New", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      reviewed: { label: "Reviewed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      contacted: { label: "Contacted ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      converted: { label: "Converted ✓", cls: "bg-violet-50 text-violet-700 border-violet-200" },
      declined: { label: "Declined", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const inquiryStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "New", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      contacted: { label: "In discussion", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      booked: { label: "Booked ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      declined: { label: "Declined", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const vendorUpdateStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Pending review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      approved: { label: "Live ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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

      {/* Vendor Updates Awaiting Approval */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-5 text-blue-600" />
          <h2 className="text-base font-bold text-zinc-900">
            Vendor Updates
            {pendingVendorUpdates.length > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                {pendingVendorUpdates.length} new
              </span>
            )}
          </h2>
        </div>

        {vendorUpdates.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No vendor updates yet.</p>
        ) : (
          <div className="space-y-3">
            {[...pendingVendorUpdates, ...otherVendorUpdates].map((u) => (
              <div key={u.id} className="rounded-xl border border-zinc-100 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-zinc-900">{u.title}</p>
                      {vendorUpdateStatusBadge(u.status)}
                    </div>
                    <p className="text-xs text-zinc-500">{u.vendors?.name ?? "Unknown vendor"}</p>
                    {u.link_url && (
                      <a href={u.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        {u.link_url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">{format(new Date(u.created_at), "MMM d, yyyy")}</p>
                </div>

                {u.body && <p className="text-sm text-zinc-600 leading-relaxed">{u.body}</p>}

                {u.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    <form action={updateVendorUpdateStatus.bind(null, u.id, "approved")}>
                      <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="size-3.5" /> Approve
                      </Button>
                    </form>
                    <form action={updateVendorUpdateStatus.bind(null, u.id, "rejected")}>
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

      {/* Sponsorship Inquiries */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="size-5 text-violet-600" />
          <h2 className="text-base font-bold text-zinc-900">
            Sponsorship Inquiries
            {pendingInquiries.length > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-violet-600 px-2 py-0.5 rounded-full">
                {pendingInquiries.length} new
              </span>
            )}
          </h2>
        </div>

        {sponsorshipInquiries.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No sponsorship inquiries yet.</p>
        ) : (
          <div className="space-y-3">
            {[...pendingInquiries, ...otherInquiries].map((i) => (
              <div key={i.id} className="rounded-xl border border-zinc-100 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-zinc-900">{i.vendors?.name ?? "Unknown vendor"}</p>
                      {inquiryStatusBadge(i.status)}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {i.sponsorship_opportunities?.title ?? "Deleted opportunity"}
                      {i.sponsorship_opportunities?.price_label && ` · ${i.sponsorship_opportunities.price_label}`}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">{format(new Date(i.created_at), "MMM d, yyyy")}</p>
                </div>

                {i.status !== "declined" && i.status !== "booked" && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <form action={updateSponsorshipInquiryStatus.bind(null, i.id, "contacted")}>
                      <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                        <Clock className="size-3.5" /> Mark In Discussion
                      </Button>
                    </form>
                    <form action={updateSponsorshipInquiryStatus.bind(null, i.id, "booked")}>
                      <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="size-3.5" /> Mark Booked
                      </Button>
                    </form>
                    <form action={updateSponsorshipInquiryStatus.bind(null, i.id, "declined")}>
                      <Button size="sm" type="submit" variant="ghost" className="gap-1.5 text-zinc-400 hover:text-red-500">
                        <XCircle className="size-3.5" /> Decline
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vendor Partner Applications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Handshake className="size-5 text-emerald-600" />
          <h2 className="text-base font-bold text-zinc-900">
            Vendor Partner Applications
            {pendingLeads.length > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">
                {pendingLeads.length} new
              </span>
            )}
          </h2>
        </div>

        {vendorLeads.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {[...pendingLeads, ...otherLeads].map((l) => (
              <div key={l.id} className="rounded-xl border border-zinc-100 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-zinc-900">{l.company_name}</p>
                      {leadStatusBadge(l.status)}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {l.contact_name ? `${l.contact_name} · ` : ""}
                      <a href={`mailto:${l.contact_email}`} className="text-blue-600 hover:underline">{l.contact_email}</a>
                    </p>
                    {l.website && (
                      <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        {l.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">{format(new Date(l.created_at), "MMM d, yyyy")}</p>
                </div>

                {l.message && (
                  <p className="text-sm text-zinc-600 leading-relaxed">{l.message}</p>
                )}

                {l.status === "converted" ? (
                  l.converted_vendor_id && (
                    <Link
                      href={`/vendors/${l.converted_vendor_id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline pt-1"
                    >
                      View vendor listing <ArrowRight className="size-3" />
                    </Link>
                  )
                ) : l.status !== "declined" && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Link href={`/admin/vendors?leadId=${l.id}`}>
                      <Button size="sm" type="button" variant="outline" className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                        <Handshake className="size-3.5" /> Convert to vendor
                      </Button>
                    </Link>
                    {l.status === "pending" && (
                      <form action={updateVendorLeadStatus.bind(null, l.id, "contacted")}>
                        <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="size-3.5" /> Mark Contacted
                        </Button>
                      </form>
                    )}
                    {l.status === "pending" && (
                      <form action={updateVendorLeadStatus.bind(null, l.id, "reviewed")}>
                        <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                          <Clock className="size-3.5" /> Mark Reviewed
                        </Button>
                      </form>
                    )}
                    <form action={updateVendorLeadStatus.bind(null, l.id, "declined")}>
                      <Button size="sm" type="submit" variant="ghost" className="gap-1.5 text-zinc-400 hover:text-red-500">
                        <XCircle className="size-3.5" /> Decline
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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

      {/* Topic Suggestions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-5 text-[#E8503A]" />
          <h2 className="text-base font-bold text-zinc-900">
            Topic Suggestions
            {pendingTopics.length > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-[#E8503A] px-2 py-0.5 rounded-full">
                {pendingTopics.length} new
              </span>
            )}
          </h2>
        </div>

        {topics.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No topic suggestions yet.</p>
        ) : (
          <div className="space-y-3">
            {[...pendingTopics, ...otherTopics].map((t) => (
              <div key={t.id} className="rounded-xl border border-zinc-100 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {topicStatusBadge(t.status)}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">
                    {t.profiles?.full_name ?? "Unknown"} · {format(new Date(t.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                <p className="text-sm text-zinc-700 leading-relaxed">{t.topic}</p>

                {t.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    <form action={updateTopicStatus.bind(null, t.id, "planned")}>
                      <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="size-3.5" /> Mark as Planned
                      </Button>
                    </form>
                    <form action={updateTopicStatus.bind(null, t.id, "reviewed")}>
                      <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                        <Clock className="size-3.5" /> Mark as Reviewed
                      </Button>
                    </form>
                    <form action={updateTopicStatus.bind(null, t.id, "declined")}>
                      <Button size="sm" type="submit" variant="ghost" className="gap-1.5 text-zinc-400 hover:text-red-500">
                        <XCircle className="size-3.5" /> Decline
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
