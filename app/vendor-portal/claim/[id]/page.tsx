import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Building2 } from "lucide-react";
import ClaimForm from "./claim-form";

// Public — no TALK account needed, so this reads with the admin client
// rather than the RLS-bound server client (a logged-out visitor has no
// session to satisfy the member-only vendor SELECT policy).
export default async function ClaimVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, name, description, logo_url, category")
    .eq("id", id)
    .maybeSingle();

  if (!vendor) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (admin as any)
    .from("vendor_accounts")
    .select("id")
    .eq("vendor_id", id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center p-8" style={{ background: "#F5F8FC" }}>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt={vendor.name} className="size-16 rounded-xl object-contain border border-zinc-100 bg-white p-1" />
          ) : (
            <div className="size-16 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Building2 className="size-7 text-zinc-400" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{vendor.name}</h1>
            {vendor.category && <p className="text-sm text-zinc-500">{vendor.category}</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 p-6 space-y-5">
          {account ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-zinc-600">This listing is already claimed and managed.</p>
              <Link href="/vendor-portal/login" className="text-sm font-semibold hover:underline" style={{ color: "#1E4B82" }}>
                Sign in to manage it →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-base font-semibold text-zinc-900">Claim this listing</h2>
                <p className="text-sm text-zinc-500">
                  Work at {vendor.name}? Claim your company&apos;s profile in the TALK vendor directory — free to update your
                  description, logo, and contact info once we verify you.
                </p>
              </div>
              <ClaimForm vendorId={vendor.id} />
            </>
          )}
        </div>

        <p className="text-xs text-zinc-400 text-center">
          Not from {vendor.name}?{" "}
          <Link href="/" className="font-semibold hover:underline" style={{ color: "#1E4B82" }}>
            Go to talktalent.com
          </Link>
        </p>
      </div>
    </div>
  );
}
