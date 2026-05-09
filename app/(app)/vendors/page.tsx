import { createClient } from "@/lib/supabase/server";
import { Building2, Lightbulb } from "lucide-react";
import Link from "next/link";
import VendorsGrid from "./vendors-grid";

export default async function VendorsPage() {
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
          >
            <Building2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Vendors</h1>
            <p className="text-sm text-zinc-500">Discover trusted vendors and partners</p>
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
      <VendorsGrid vendors={vendors ?? []} />
    </div>
  );
}
