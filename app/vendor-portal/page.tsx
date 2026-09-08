import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VendorPortalDashboard from "./vendor-portal-dashboard";

export default async function VendorPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/vendor-portal/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("vendor_accounts")
    .select("id, vendor_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!account) redirect("/vendor-portal/login");

  const [vendorResult, updatesResult] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", account.vendor_id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("vendor_updates")
      .select("id, title, body, link_url, created_at")
      .eq("vendor_id", account.vendor_id)
      .order("created_at", { ascending: false }),
  ]);

  if (!vendorResult.data) redirect("/vendor-portal/login");

  return (
    <VendorPortalDashboard
      vendorId={account.vendor_id}
      vendor={vendorResult.data}
      updates={updatesResult.data ?? []}
    />
  );
}
