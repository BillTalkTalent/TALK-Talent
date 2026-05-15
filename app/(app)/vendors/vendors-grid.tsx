"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search, Globe, Mail, Star, Building2 } from "lucide-react";
import type { Vendor } from "@/lib/supabase/types";

export default function VendorsGrid({ vendors }: { vendors: Vendor[] }) {
  const [query, setQuery] = useState("");

  const filtered = vendors.filter((v) => {
    const q = query.toLowerCase();
    return (
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search vendors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl border-zinc-200 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Building2 className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No vendors found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vendor) => (
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
                  <p className="text-sm text-zinc-500 line-clamp-3 flex-1 mb-4">
                    {vendor.description}
                  </p>
                )}

                <div className="space-y-2 mt-auto pt-3 border-t border-zinc-50">
                  {vendor.website && (
                    <span
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(vendor.website!, '_blank', 'noopener,noreferrer'); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Globe className="size-3.5" />
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                  {vendor.contact_name && (
                    <p className="text-xs text-zinc-400">Contact: {vendor.contact_name}</p>
                  )}
                  {vendor.contact_email && (
                    <span
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `mailto:${vendor.contact_email}`; }}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      <Mail className="size-3.5" />
                      {vendor.contact_email}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
