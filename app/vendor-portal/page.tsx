import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // page_views has no select policy (service-role/admin reads only — see
  // migration 053), so the view count is computed here with the admin
  // client and passed down as a plain number. The vendor never gets direct
  // query access to the table, just this one aggregate.
  const admin = createAdminClient();
  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();

  const [vendorResult, updatesResult, opportunitiesResult, inquiriesResult, viewsResult] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", account.vendor_id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("vendor_updates")
      .select("id, title, body, link_url, status, created_at")
      .eq("vendor_id", account.vendor_id)
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sponsorship_opportunities")
      .select("id, title, description, price_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sponsorship_inquiries")
      .select("id, opportunity_id, status")
      .eq("vendor_id", account.vendor_id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .eq("path", `/vendors/${account.vendor_id}`)
      .gte("created_at", thirtyDaysAgo),
  ]);

  if (!vendorResult.data) redirect("/vendor-portal/login");

  return (
    <VendorPortalDashboard
      vendorId={account.vendor_id}
      vendor={vendorResult.data}
      updates={updatesResult.data ?? []}
      opportunities={opportunitiesResult.data ?? []}
      inquiries={inquiriesResult.data ?? []}
      viewCount={viewsResult.count ?? 0}
    />
  );
}
