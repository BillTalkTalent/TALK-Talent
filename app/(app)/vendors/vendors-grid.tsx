"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search, Globe, Star, Building2, ChevronLeft, ChevronRight, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
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
  contact_name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  industries_served: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company_sizes_served: string[] | null;
  legacy_rating: number | null;
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
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(
  pathname: string,
  current: URLSearchParams,
  overrides: Record<string, string>
): string {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(overrides)) {
    if (v) next.set(k, v);
    else next.delete(k);
  }
  // Reset page when any filter changes (unless we're explicitly setting page)
  if (!("page" in overrides)) next.delete("page");
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [inputVal, setInputVal] = useState(currentQ);
  const debounceRef = { current: null as ReturnType<typeof setTimeout> | null };

  const nav = useCallback(
    (overrides: Record<string, string>) => {
      startTransition(() => {
        router.push(buildUrl(pathname, searchParams, overrides));
      });
    },
    [router, pathname, searchParams]
  );

  const handleSearch = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => nav({ q: val }), 350);
  };

  const hasFilters = currentQ || currentCategory || currentIndustry || currentSize;

  return (
    <div className="space-y-5">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search vendors..."
            value={inputVal}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 rounded-xl border-zinc-200 bg-white"
          />
        </div>

        {/* Category */}
        <select
          value={currentCategory}
          onChange={(e) => nav({ category: e.target.value })}
          className="h-10 px-3 pr-8 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Industry */}
        <select
          value={currentIndustry}
          onChange={(e) => nav({ industry: e.target.value })}
          className="h-10 px-3 pr-8 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        {/* Company size */}
        <select
          value={currentSize}
          onChange={(e) => nav({ size: e.target.value })}
          className="h-10 px-3 pr-8 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Company Sizes</option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <Link
            href={pathname}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
            onClick={() => setInputVal("")}
          >
            <X className="size-3.5" /> Clear
          </Link>
        )}
      </div>

      {/* ── Grid ── */}
      {vendors.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Building2 className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No vendors found</p>
          {hasFilters && (
            <Link href={pathname} className="mt-2 text-sm text-emerald-600 hover:underline" onClick={() => setInputVal("")}>
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
              className={`rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer ${
                vendor.is_featured ? "border-amber-200" : "border-zinc-100"
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
                        className="size-11 rounded-xl object-contain border border-zinc-100 bg-white p-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="size-11 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="size-5 text-sky-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-900 truncate">{vendor.name}</p>
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
                  <p className="text-sm text-zinc-500 line-clamp-3 flex-1 mb-3">
                    {vendor.description}
                  </p>
                )}

                {/* Industry / company size tags */}
                {((vendor.industries_served?.length ?? 0) > 0 || (vendor.company_sizes_served?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vendor.industries_served?.slice(0, 2).map((ind) => (
                      <span key={ind} className="text-[10px] font-medium text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                        {ind}
                      </span>
                    ))}
                    {(vendor.industries_served?.length ?? 0) > 2 && (
                      <span className="text-[10px] font-medium text-zinc-400 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded-full">
                        +{(vendor.industries_served?.length ?? 0) - 2} more
                      </span>
                    )}
                    {vendor.company_sizes_served?.slice(0, 1).map((s) => (
                      <span key={s} className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1 mt-auto pt-3 border-t border-zinc-50">
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
            href={buildUrl(pathname, searchParams, { page: String(currentPage - 1) })}
            aria-disabled={currentPage <= 1}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm border transition-colors ${
              currentPage <= 1
                ? "border-zinc-100 text-zinc-300 pointer-events-none"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white"
            }`}
          >
            <ChevronLeft className="size-4" /> Prev
          </Link>

          <span className="text-sm text-zinc-500 px-2">
            Page {currentPage} of {totalPages}
          </span>

          <Link
            href={buildUrl(pathname, searchParams, { page: String(currentPage + 1) })}
            aria-disabled={currentPage >= totalPages}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm border transition-colors ${
              currentPage >= totalPages
                ? "border-zinc-100 text-zinc-300 pointer-events-none"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white"
            }`}
          >
            Next <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
