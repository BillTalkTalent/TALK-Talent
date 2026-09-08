"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogOut, Send, Trash2, Loader2, MessageSquarePlus, Megaphone, Handshake } from "lucide-react";
import { format } from "date-fns";
import LogoUpload from "@/app/admin/vendors/logo-upload";
import type { Vendor } from "@/lib/supabase/types";

type VendorUpdate = { id: string; title: string; body: string | null; link_url: string | null; created_at: string };
type Opportunity = { id: string; title: string; description: string | null; price_label: string | null };
type Inquiry = { id: string; opportunity_id: string | null; status: string };

export default function VendorPortalDashboard({
  vendorId,
  vendor,
  updates,
  opportunities,
  inquiries,
}: {
  vendorId: string;
  vendor: Vendor;
  updates: VendorUpdate[];
  opportunities: Opportunity[];
  inquiries: Inquiry[];
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

  return (
    <div className="min-h-screen p-6" style={{ background: "#F5F8FC" }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center bg-white border border-zinc-200 shrink-0">
              <Building2 className="size-5 text-zinc-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">{vendor.name}</h1>
              <p className="text-xs text-zinc-500">Vendor Partner Portal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>

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

        {/* Sponsorship opportunities */}
        {opportunities.length > 0 && (
          <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Megaphone className="size-4 text-violet-500" /> Sponsorship opportunities
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
                        {o.price_label && <span className="text-xs font-semibold text-violet-700">{o.price_label}</span>}
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
                          className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
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
            Posts show on your listing page in the vendor directory — not in the member forum.
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
                    <p className="text-sm font-semibold text-zinc-900">{u.title}</p>
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
