import { createClient } from "@/lib/supabase/server";
import { Building2, Lightbulb } from "lucide-react";
import Link from "next/link";
import VendorsGrid from "./vendors-grid";

const PAGE_SIZE = 48;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    industry?: string;
    size?: string;
    page?: string;
  }>;
}) {
  const { q, category, industry, size, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Build query with server-side filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("vendors")
    .select("*", { count: "exact" })
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (q?.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
  }

  if (category) query = query.eq("category", category);
  if (industry) query = query.contains("industries_served", [industry]);
  if (size) query = query.contains("company_sizes_served", [size]);

  const { data: vendors, count: totalCount } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  // Fetch distinct categories for the filter dropdown (from all vendors, not filtered)
  const { data: allVendors } = await supabase
    .from("vendors")
    .select("category")
    .not("category", "is", null)
    .order("category");

  const categories = [...new Set((allVendors ?? []).map((v: { category: string }) => v.category).filter(Boolean))].sort() as string[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
          >
            <Building2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Vendors</h1>
            <p className="text-sm text-zinc-500">
              {totalCount?.toLocaleString() ?? 0} vendor{totalCount !== 1 ? "s" : ""}
              {(q || category || industry || size) ? " matching filters" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/vendors/suggest"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <Lightbulb className="size-4" />
          Suggest a Vendor
        </Link>
      </div>

      <VendorsGrid
        vendors={vendors ?? []}
        categories={categories}
        totalCount={totalCount ?? 0}
        totalPages={totalPages}
        currentPage={page}
        currentQ={q ?? ""}
        currentCategory={category ?? ""}
        currentIndustry={industry ?? ""}
        currentSize={size ?? ""}
      />
    </div>
  );
}
