import { createClient } from "@/lib/supabase/server";
import { Building2 } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6B9BB8, #4A6B8A)" }}
        >
          <Building2 className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Vendors</h1>
          <p className="text-sm text-zinc-500">Discover trusted vendors and partners</p>
        </div>
      </div>
      <VendorsGrid vendors={vendors ?? []} />
    </div>
  );
}
