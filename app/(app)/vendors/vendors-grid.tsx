"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search, Globe, Star, Building2, ChevronLeft, ChevronRight, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants — also imported by vendor-edit-form.tsx
// ---------------------------------------------------------------------------

export const INDUSTRIES = [
  "Technology",
  "Healthcare & Life Sciences",
  "Financial Services",
  "Retail & E-commerce",
  "Manufacturing",
  "Professional Services",
  "Media & Entertainment",
  "Government & Public Sector",
  "Education",
  "Non-profit",
  "Real Estate",
  "Transportation & Logistics",
  "Energy & Utilities",
  "Hospitality & Travel",
  "All Industries",
] as const;

export const COMPANY_SIZES = [
  "Startup (1–50)",
  "SMB (51–500)",
  "Mid-market (501–2,000)",
  "Enterprise (2,001–10,000)",
  "Large Enterprise (10,001+)",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Vendor {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  is_featured: boolean;
  industries_served: string[] | null;
  company_sizes_served: string[] | null;
}

interface Props {
  vendors: Vendor[];
  categories: string[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentQ: string;
  currentCategory: string;
  currentIndustry: string;
  currentSize: string;
}

// ---------------------------------------------------------------------------
// URL builder — uses only the props passed in (no useSearchParams needed)
// ---------------------------------------------------------------------------

function buildUrl(
  base: string,
  params: { q: string; category: string; industry: string; size: string; page?: number }
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.industry) sp.set("industry", params.industry);
  if (params.size) sp.set("size", params.size);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorsGrid({
  vendors,
  categories,
  totalCount,
  totalPages,
  currentPage,
  currentQ,
  currentCategory,
  currentIndustry,
  currentSize,
}: Props) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = "/vendors";
  const params = { q: currentQ, category: currentCategory, industry: currentIndustry, size: currentSize };

  // Debounced search — navigates server-side
  const handleSearch = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(base, { ...params, q: val }));
    }, 350);
  };

  const hasFilters = currentQ || currentCategory || currentIndustry || currentSize;

  return (
    <div className="space-y-5">

      {/* ── Category pill bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link
          href={buildUrl(base, { ...params, category: "", page: 1 })}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !currentCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-muted-foreground/40"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={buildUrl(base, { ...params, category: cat, page: 1 })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              currentCategory === cat
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-card text-muted-foreground border-border hover:border-sky-400 hover:text-sky-700"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* ── Search + secondary filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search vendors…"
            value={inputVal}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 rounded-xl border-border bg-card"
          />
        </div>

        {/* Industry */}
        <select
          value={currentIndustry}
          onChange={(e) =>
            router.push(buildUrl(base, { ...params, industry: e.target.value }))
          }
          className="h-10 px-3 pr-8 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        {/* Company size */}
        <select
          value={currentSize}
          onChange={(e) =>
            router.push(buildUrl(base, { ...params, size: e.target.value }))
          }
          className="h-10 px-3 pr-8 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Company Sizes</option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {hasFilters && (
          <Link
            href={base}
            onClick={() => setInputVal("")}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
          >
            <X className="size-3.5" /> Clear
          </Link>
        )}
      </div>

      {/* Active filter label */}
      {currentCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{currentCategory}</span>
            {" "}— {totalCount.toLocaleString()} vendor{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Grid ── */}
      {vendors.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <Building2 className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No vendors found</p>
          {hasFilters && (
            <Link href={base} onClick={() => setInputVal("")} className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendors/${vendor.id}`}
              className={`rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${
                vendor.is_featured ? "border-amber-200" : "border-border"
              }`}
            >
              {vendor.is_featured && (
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {vendor.logo_url ? (
                      <img
                        src={vendor.logo_url}
                        alt={vendor.name}
                        className="size-11 rounded-xl object-contain border border-border bg-card p-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="size-11 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="size-5 text-sky-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{vendor.name}</p>
                      {vendor.category && (
                        <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                          {vendor.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {vendor.is_featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                      <Star className="size-3" /> Featured
                    </span>
                  )}
                </div>

                {vendor.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3">
                    {vendor.description}
                  </p>
                )}

                {/* Industry / size tags */}
                {((vendor.industries_served?.length ?? 0) > 0 ||
                  (vendor.company_sizes_served?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vendor.industries_served?.slice(0, 2).map((ind) => (
                      <span
                        key={ind}
                        className="text-[10px] font-medium text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full"
                      >
                        {ind}
                      </span>
                    ))}
                    {(vendor.industries_served?.length ?? 0) > 2 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full">
                        +{(vendor.industries_served?.length ?? 0) - 2} more
                      </span>
                    )}
                    {vendor.company_sizes_served?.slice(0, 1).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-border/60">
                  {vendor.website && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(vendor.website!, "_blank", "noopener,noreferrer");
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Globe className="size-3.5" />
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href={buildUrl(base, { ...params, page: currentPage - 1 })}
            aria-disabled={currentPage <= 1}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm border transition-colors ${
              currentPage <= 1
                ? "border-border/60 text-muted-foreground/40 pointer-events-none"
                : "border-border text-muted-foreground hover:border-muted-foreground/40 bg-card"
            }`}
          >
            <ChevronLeft className="size-4" /> Prev
          </Link>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={buildUrl(base, { ...params, page: currentPage + 1 })}
            aria-disabled={currentPage >= totalPages}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm border transition-colors ${
              currentPage >= totalPages
                ? "border-border/60 text-muted-foreground/40 pointer-events-none"
                : "border-border text-muted-foreground hover:border-muted-foreground/40 bg-card"
            }`}
          >
            Next <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
