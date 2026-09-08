"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Handshake, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import LogoUpload from "./logo-upload";

type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string;
  website: string | null;
  message: string | null;
};

export default function CreateVendorForm({ lead }: { lead?: Lead | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated"); return; }

      const { data: newVendor, error: insertError } = await supabase
        .from("vendors")
        .insert({
          name: fd.get("name") as string,
          description: (fd.get("description") as string) || null,
          category: (fd.get("category") as string) || null,
          website: (fd.get("website") as string) || null,
          contact_name: (fd.get("contact_name") as string) || null,
          contact_email: (fd.get("contact_email") as string) || null,
          is_featured: fd.get("is_featured") === "on",
          is_paying: fd.get("is_paying") === "on",
          logo_url: logoUrl,
          submitted_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) { setError(insertError.message); return; }

      if (lead) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("vendor_leads")
          .update({ status: "converted", converted_vendor_id: newVendor.id })
          .eq("id", lead.id);
        toast.success(`${lead.company_name} is now a live vendor listing.`);
        router.push("/admin/vendors");
        return;
      }

      toast.success("Vendor added.");
      form.reset();
      setLogoUrl(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {lead && (
        <div className="sm:col-span-2 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Handshake className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">
              Converting the partner application from <span className="font-bold">{lead.company_name}</span> —
              fields below are pre-filled from what they submitted. Review and adjust before adding.
            </p>
          </div>
          <Link href="/admin/vendors" className="text-emerald-700/60 hover:text-emerald-900 shrink-0">
            <X className="size-4" />
          </Link>
        </div>
      )}

      {/* Logo */}
      <div className="sm:col-span-2">
        <LogoUpload
          currentUrl={logoUrl}
          onUpload={setLogoUrl}
          onClear={() => setLogoUrl(null)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={lead?.company_name ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" placeholder="e.g. ATS, Sourcing" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={lead?.message ?? ""}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://" defaultValue={lead?.website ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_name">Contact Name</Label>
        <Input id="contact_name" name="contact_name" defaultValue={lead?.contact_name ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input id="contact_email" name="contact_email" type="email" defaultValue={lead?.contact_email ?? ""} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_featured" name="is_featured" className="size-4 rounded border-zinc-300" />
        <Label htmlFor="is_featured" className="cursor-pointer">Featured vendor</Label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_paying" name="is_paying" className="size-4 rounded border-zinc-300" defaultChecked={!!lead} />
        <Label htmlFor="is_paying" className="cursor-pointer">Paying partner</Label>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {lead ? "Create vendor & convert" : "Add Vendor"}
        </Button>
      </div>
    </form>
  );
}
