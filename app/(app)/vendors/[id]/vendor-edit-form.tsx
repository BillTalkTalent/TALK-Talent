"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INDUSTRIES, COMPANY_SIZES } from "../vendors-grid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VendorEditForm({ vendor }: { vendor: any }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(vendor.name ?? "");
  const [category, setCategory] = useState(vendor.category ?? "");
  const [tagline, setTagline] = useState(vendor.tagline ?? "");
  const [description, setDescription] = useState(vendor.description ?? "");
  const [website, setWebsite] = useState(vendor.website ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor.logo_url ?? "");
  const [isFeatured, setIsFeatured] = useState(vendor.is_featured ?? false);
  const [industriesServed, setIndustriesServed] = useState<string[]>(vendor.industries_served ?? []);
  const [companySizesServed, setCompanySizesServed] = useState<string[]>(vendor.company_sizes_served ?? []);

  const toggleIndustry = (ind: string) => {
    setIndustriesServed(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const toggleSize = (s: string) => {
    setCompanySizesServed(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("vendors")
      .update({
        name,
        category: category || null,
        tagline: tagline || null,
        description: description || null,
        website: website || null,
        logo_url: logoUrl || null,
        is_featured: isFeatured,
        industries_served: industriesServed,
        company_sizes_served: companySizesServed,
      })
      .eq("id", vendor.id);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-6">
      <h2 className="text-base font-bold text-zinc-900">Edit Vendor Details</h2>

      {/* ── Basic fields ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. ATS, Assessments…"
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Website</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Logo URL</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-600">Tagline</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="One-line pitch…"
          className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-600">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* ── Featured toggle ── */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <div className="w-10 h-6 rounded-full bg-zinc-200 peer-checked:bg-amber-400 transition-colors" />
          <div className="absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-zinc-700">Featured vendor</span>
      </label>

      {/* ── Industries served ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Industries Served</p>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => {
            const on = industriesServed.includes(ind);
            return (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  on
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-violet-300"
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Company sizes ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Company Sizes Served</p>
        <div className="flex flex-wrap gap-2">
          {COMPANY_SIZES.map((s) => {
            const on = companySizesServed.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  on
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-teal-300"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Save ── */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Saved successfully!</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
