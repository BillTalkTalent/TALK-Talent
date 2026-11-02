"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogOut, Send, Trash2, Loader2, MessageSquarePlus, Megaphone, Handshake, Eye, Sparkles, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import LogoUpload from "@/app/admin/vendors/logo-upload";
import type { Vendor } from "@/lib/supabase/types";

type VendorUpdate = { id: string; title: string; body: string | null; link_url: string | null; status: string; created_at: string };

function updateStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Not approved", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${s.cls}`}>{s.label}</span>;
}
type Opportunity = { id: string; title: string; description: string | null; price_label: string | null };
type Inquiry = { id: string; opportunity_id: string | null; status: string };

export default function VendorPortalDashboard({
  vendorId,
  vendor,
  updates,
  opportunities,
  inquiries,
  viewCount,
}: {
  vendorId: string;
  vendor: Vendor;
  updates: VendorUpdate[];
  opportunities: Opportunity[];
  inquiries: Inquiry[];
  viewCount: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [inquiringId, setInquiringId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: vendor.name,
    description: vendor.description ?? "",
    category: vendor.category ?? "",
    website: vendor.website ?? "",
    contact_name: vendor.contact_name ?? "",
    contact_email: vendor.contact_email ?? "",
    logo_url: vendor.logo_url ?? null as string | null,
  });

  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postLink, setPostLink] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/vendor-portal/login");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("vendors")
      .update({
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        website: form.website || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        logo_url: form.logo_url,
      })
      .eq("id", vendorId);
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    toast.success("Listing updated.");
    router.refresh();
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim()) {
      toast.error("Give your update a title.");
      return;
    }
    setPosting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("vendor_updates").insert({
      vendor_id: vendorId,
      title: postTitle.trim(),
      body: postBody.trim() || null,
      link_url: postLink.trim() || null,
    });
    setPosting(false);
    if (error) {
      toast.error(`Failed to post: ${error.message}`);
      return;
    }
    toast.success("Posted to your listing.");
    setPostTitle("");
    setPostBody("");
    setPostLink("");
    router.refresh();
  }

  async function handleDeleteUpdate(id: string) {
    if (!confirm("Delete this update? This can't be undone.")) return;
    setDeletingId(id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("vendor_updates").delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  async function handleInquire(opportunityId: string) {
    setInquiringId(opportunityId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("sponsorship_inquiries").insert({
      opportunity_id: opportunityId,
      vendor_id: vendorId,
      created_by: user?.id ?? null,
    });
    setInquiringId(null);
    if (error) {
      toast.error(`Failed to send inquiry: ${error.message}`);
      return;
    }
    toast.success("Inquiry sent — we'll follow up soon.");
    router.refresh();
  }

  const liveUpdateCount = updates.filter((u) => u.status === "approved").length;
  const tierLabel = vendor.tier === "partner" ? "Partner" : vendor.tier === "pro" ? "Pro" : "Basic";
  const hasAnalytics = vendor.tier === "pro" || vendor.tier === "partner";

  return (
    <div className="min-h-screen" style={{ background: "#F5F8FC" }}>
      <div
        className="px-6 pt-8 pb-16"
        style={{ background: "linear-gradient(160deg, #1E4B82 0%, #162D4A 55%, #0F1F35 100%)" }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 shrink-0 overflow-hidden">
                {vendor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.logo_url} alt="" className="size-full object-cover" />
                ) : (
                  <Building2 className="size-6 text-white/70" />
                )}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-orange-300 mb-0.5">
                  <Sparkles className="size-3" /> {tierLabel} Plan
                </span>
                <h1 className="text-xl font-extrabold text-white leading-tight">{vendor.name}</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white"
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 text-orange-300 mb-1.5">
                <Eye className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Listing views</span>
              </div>
              {hasAnalytics ? (
                <>
                  <p className="text-2xl font-extrabold text-white leading-none">{viewCount}</p>
                  <p className="text-[11px] text-white/50 mt-1">last 30 days</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-white/30 leading-none blur-[3px] select-none">42</p>
                  <p className="text-[11px] text-orange-300 mt-1 font-semibold">Pro feature</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 text-orange-300 mb-1.5">
                <TrendingUp className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Live updates</span>
              </div>
              <p className="text-2xl font-extrabold text-white leading-none">{liveUpdateCount}</p>
              <p className="text-[11px] text-white/50 mt-1">posted to your listing</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 text-orange-300 mb-1.5">
                <Handshake className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Inquiries sent</span>
              </div>
              <p className="text-2xl font-extrabold text-white leading-none">{inquiries.length}</p>
              <p className="text-[11px] text-white/50 mt-1">sponsorship interest</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-10 pb-10 space-y-6">
        {/* Listing editor */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-900">Your listing</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <LogoUpload
                currentUrl={form.logo_url}
                pathPrefix={vendorId}
                onUpload={(url) => setForm((f) => ({ ...f, logo_url: url }))}
                onClear={() => setForm((f) => ({ ...f, logo_url: null }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. ATS, Sourcing" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Contact email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || !form.name} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </div>

        {/* Upgrade card */}
        {!hasAnalytics && (
          <div
            className="rounded-2xl p-6 text-white space-y-4"
            style={{ background: "linear-gradient(135deg, #1E4B82, #0F1F35)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-orange-300" />
              <h2 className="text-sm font-bold">Get more out of your listing</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/10 border border-white/15 p-4 space-y-2">
                <p className="font-bold">Pro — $299/mo</p>
                <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                  <li>Featured placement in the directory</li>
                  <li>Included in newsletter vendor spotlights</li>
                  <li>Listing views analytics</li>
                </ul>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-4 space-y-2">
                <p className="font-bold">Partner — $699/mo</p>
                <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                  <li>Everything in Pro</li>
                  <li>Priority on sponsorship opportunities</li>
                  <li>Dedicated onboarding support</li>
                </ul>
              </div>
            </div>
            <a href="mailto:bill@talktalent.com?subject=Upgrading our TALK vendor listing">
              <Button size="sm" className="font-semibold text-white" style={{ background: "#E8503A" }}>
                Contact us to upgrade
              </Button>
            </a>
          </div>
        )}

        {/* Sponsorship opportunities */}
        {opportunities.length > 0 && (
          <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Megaphone className="size-4" style={{ color: "#E8503A" }} /> Sponsorship opportunities
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Ways to get more visibility with TALK members. Inquiring doesn&apos;t book anything — we&apos;ll follow up to work out details.
              </p>
            </div>
            <div className="space-y-3">
              {opportunities.map((o) => {
                const inquiry = inquiries.find((i) => i.opportunity_id === o.id);
                return (
                  <div key={o.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 p-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-zinc-900">{o.title}</p>
                        {o.price_label && <span className="text-xs font-semibold" style={{ color: "#E8503A" }}>{o.price_label}</span>}
                      </div>
                      {o.description && <p className="text-sm text-zinc-500 mt-0.5">{o.description}</p>}
                    </div>
                    <div className="shrink-0">
                      {inquiry && inquiry.status !== "declined" ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          {inquiry.status === "booked" ? "Booked ✓" : inquiry.status === "contacted" ? "In discussion" : "Inquiry sent"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={inquiringId === o.id}
                          onClick={() => handleInquire(o.id)}
                          className="gap-1.5 hover:bg-orange-50"
                          style={{ borderColor: "#F7B9A8", color: "#E8503A" }}
                        >
                          {inquiringId === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Handshake className="size-3.5" />}
                          Inquire
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Updates feed */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-900">Share an update with TALK members</h2>
          <p className="text-xs text-zinc-500 -mt-2">
            Posts show on your listing page in the vendor directory — not in the member forum. TALK reviews each
            post before it goes live, so it may take a bit to appear.
          </p>
          <form onSubmit={handlePost} className="space-y-3 rounded-xl border border-dashed border-zinc-200 p-4">
            <Input placeholder="Title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            <textarea
              placeholder="What's new? (optional)"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <Input type="url" placeholder="Link (optional)" value={postLink} onChange={(e) => setPostLink(e.target.value)} />
            <Button type="submit" size="sm" disabled={posting || !postTitle.trim()} className="gap-1.5">
              {posting ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquarePlus className="size-3.5" />}
              Post update
            </Button>
          </form>

          {updates.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No updates posted yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {updates.map((u) => (
                <div key={u.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900">{u.title}</p>
                      {updateStatusBadge(u.status)}
                    </div>
                    {u.body && <p className="text-sm text-zinc-500 mt-0.5">{u.body}</p>}
                    {u.link_url && (
                      <a href={u.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        <Send className="size-3" /> {u.link_url}
                      </a>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">{format(new Date(u.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteUpdate(u.id)}
                    disabled={deletingId === u.id}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
