import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuggestVendorForm from "./suggest-vendor-form";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function SuggestVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <Lightbulb className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Suggest a Vendor</h1>
          <p className="text-sm text-zinc-500">Recommend a tool or partner to the community</p>
        </div>
      </div>

      {submitted === "true" ? (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-12 text-center space-y-3">
          <CheckCircle2 className="size-12 mx-auto text-[#F07058]" />
          <p className="text-lg font-bold text-zinc-900">Thanks for the suggestion!</p>
          <p className="text-sm text-zinc-500">
            Our team will review it and add it to the vendor directory if it&apos;s a good fit.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/vendors"
              className="text-sm font-semibold text-[#7c3aed] hover:underline"
            >
              ← Back to Vendors
            </Link>
            <Link
              href="/vendors/suggest"
              className="text-sm font-semibold text-zinc-500 hover:underline"
            >
              Suggest another
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
          <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
            Use a tool or work with a vendor you love? Suggest them here and our team will review it for the community directory.
          </p>
          <SuggestVendorForm userId={user.id} />
        </div>
      )}
    </div>
  );
}
