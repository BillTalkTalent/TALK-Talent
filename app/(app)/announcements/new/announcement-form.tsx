"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnnouncementBanner, { type Announcement } from "@/components/announcement-banner";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const variants: { value: Announcement["variant"]; label: string }[] = [
  { value: "info", label: "Info (navy)" },
  { value: "success", label: "Success (green)" },
  { value: "warning", label: "Highlight (red)" },
];

export default function AnnouncementForm() {
  const router = useRouter();
  const supabase = createClient();

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variant, setVariant] = useState<Announcement["variant"]>("info");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const preview: Announcement = {
    id: "preview",
    title: title.trim() || "Your announcement title",
    body: body.trim() || "Your message to members will appear here.",
    variant,
    cta_label: ctaLabel.trim() || null,
    cta_href: ctaHref.trim() || null,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      variant,
      cta_label: ctaLabel.trim() || null,
      cta_href: ctaHref.trim() || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to post announcement. Are you an admin?");
      setSubmitting(false);
      return;
    }

    toast.success("Announcement posted — members will see it on their dashboard.");
    router.push("/dashboard");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <span>Post Announcement</span>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
        <AnnouncementBanner announcement={preview} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post a Dashboard Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Welcome to the TALK beta! 👋"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="body"
                placeholder="Thanks for helping us test the new platform. Poke around the forums, update your profile, and reply here if anything looks off."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="variant">Style</Label>
              <select
                id="variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value as Announcement["variant"])}
                disabled={submitting}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {variants.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ctaLabel">Button text (optional)</Label>
                <Input
                  id="ctaLabel"
                  placeholder="Update your profile"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ctaHref">Button link (optional)</Label>
                <Input
                  id="ctaHref"
                  placeholder="/profile"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Auto-hide after (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep it up until you remove it. Members can dismiss it themselves any time.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !body.trim()}
                className="text-white"
                style={{ background: "#E8503A" }}
              >
                {submitting ? "Posting…" : "Post Announcement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
