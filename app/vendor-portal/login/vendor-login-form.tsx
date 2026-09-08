"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VendorLoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/vendor-portal")}` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-zinc-100 bg-white p-5 space-y-1.5 text-center">
        <p className="text-sm font-semibold text-zinc-900">Check your email</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          We sent a sign-in link to <strong>{email}</strong>. Click it to get into your vendor portal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-100 bg-white p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="vendor-email">Email</Label>
        <Input
          id="vendor-email"
          type="email"
          placeholder="you@vendorcompany.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">Use the email your TALK contact invited to manage your listing.</p>
      </div>
      <Button type="submit" className="w-full font-semibold text-white" style={{ background: "#E8503A" }} disabled={loading}>
        {loading ? "Sending…" : "Send me a sign-in link"}
      </Button>
    </form>
  );
}
