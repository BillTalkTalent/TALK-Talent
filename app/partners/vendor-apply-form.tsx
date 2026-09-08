"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function VendorApplyForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    setSubmitting(true);
    const res = await fetch("/api/vendor-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: fd.get("companyName"),
        contactName: fd.get("contactName"),
        contactEmail: fd.get("contactEmail"),
        website: fd.get("website"),
        message: fd.get("message"),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
        <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">Application received</p>
          <p className="text-xs text-emerald-700 mt-0.5">We&apos;ll be in touch soon to talk next steps.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company name *</Label>
        <Input id="companyName" name="companyName" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="contactName">Your name</Label>
          <Input id="contactName" name="contactName" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Email *</Label>
          <Input id="contactEmail" name="contactEmail" type="email" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Tell us about your company</Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full font-semibold text-white" style={{ background: "#E8503A" }} disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        {submitting ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
