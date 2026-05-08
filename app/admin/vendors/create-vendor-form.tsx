"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LogoUpload from "./logo-upload";

export default function CreateVendorForm() {
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

      const { error: insertError } = await supabase.from("vendors").insert({
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        category: (fd.get("category") as string) || null,
        website: (fd.get("website") as string) || null,
        contact_name: (fd.get("contact_name") as string) || null,
        contact_email: (fd.get("contact_email") as string) || null,
        is_featured: fd.get("is_featured") === "on",
        logo_url: logoUrl,
        submitted_by: user.id,
      });

      if (insertError) { setError(insertError.message); return; }

      form.reset();
      setLogoUrl(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <Input id="name" name="name" required />
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
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_name">Contact Name</Label>
        <Input id="contact_name" name="contact_name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input id="contact_email" name="contact_email" type="email" />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" id="is_featured" name="is_featured" className="size-4 rounded border-zinc-300" />
        <Label htmlFor="is_featured" className="cursor-pointer">Featured vendor</Label>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Add Vendor
        </Button>
      </div>
    </form>
  );
}
