"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Check, X, Building2 } from "lucide-react";
import type { Vendor } from "@/lib/supabase/types";
import LogoUpload from "./logo-upload";

export default function VendorList({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit form state
  const [form, setForm] = useState<Partial<Vendor>>({});

  function startEdit(vendor: Vendor) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      description: vendor.description ?? "",
      category: vendor.category ?? "",
      website: vendor.website ?? "",
      contact_name: vendor.contact_name ?? "",
      contact_email: vendor.contact_email ?? "",
      is_featured: vendor.is_featured,
      logo_url: vendor.logo_url ?? null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  function handleSave(vendorId: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("vendors")
        .update({
          name: form.name,
          description: form.description || null,
          category: form.category || null,
          website: form.website || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          is_featured: form.is_featured ?? false,
          logo_url: form.logo_url ?? null,
        })
        .eq("id", vendorId);
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(vendorId: string) {
    if (!confirm("Delete this vendor? This cannot be undone.")) return;
    setDeletingId(vendorId);
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("vendors").delete().eq("id", vendorId);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (!vendors || vendors.length === 0) {
    return <p className="text-sm text-zinc-500">No vendors yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {vendors.map((vendor) =>
        editingId === vendor.id ? (
          // ── Inline edit form ──────────────────────────────────
          <li key={vendor.id} className="py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <LogoUpload
                  currentUrl={form.logo_url ?? null}
                  onUpload={(url) => setForm((f) => ({ ...f, logo_url: url }))}
                  onClear={() => setForm((f) => ({ ...f, logo_url: null }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Input
                  value={form.category ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. ATS, Sourcing"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input
                  value={form.website ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  type="url"
                  placeholder="https://"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={form.contact_name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Email</Label>
                <Input
                  value={form.contact_email ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  type="email"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`featured-${vendor.id}`}
                  checked={form.is_featured ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                  className="size-4 rounded border-zinc-300"
                />
                <Label htmlFor={`featured-${vendor.id}`} className="cursor-pointer text-xs">
                  Featured vendor
                </Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleSave(vendor.id)}
                disabled={isPending || !form.name}
                className="gap-1.5"
              >
                <Check className="size-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1.5">
                <X className="size-3.5" /> Cancel
              </Button>
            </div>
          </li>
        ) : (
          // ── Read view ─────────────────────────────────────────
          <li key={vendor.id} className="py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {vendor.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={vendor.name}
                  className="size-12 rounded-xl object-contain border border-zinc-100 bg-white p-1 flex-shrink-0"
                />
              ) : (
                <div className="size-12 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="size-5 text-zinc-400" />
                </div>
              )}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-zinc-900">{vendor.name}</p>
                {vendor.is_featured && <Badge variant="secondary">Featured</Badge>}
                {vendor.category && (
                  <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
                )}
              </div>
              {vendor.description && (
                <p className="text-sm text-zinc-500 line-clamp-2">{vendor.description}</p>
              )}
              <div className="flex gap-4 text-xs text-zinc-400 flex-wrap">
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {vendor.website}
                  </a>
                )}
                {vendor.contact_name && <span>{vendor.contact_name}</span>}
                {vendor.contact_email && <span>{vendor.contact_email}</span>}
              </div>
            </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(vendor)}
                className="gap-1.5"
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(vendor.id)}
                disabled={deletingId === vendor.id}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {deletingId === vendor.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </li>
        )
      )}
    </ul>
  );
}
