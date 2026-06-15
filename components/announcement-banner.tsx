"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Megaphone, X, ArrowRight } from "lucide-react";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  variant: "info" | "success" | "warning";
  cta_label: string | null;
  cta_href: string | null;
};

// Per-variant accent colors (brand navy/red by default).
const styles: Record<
  Announcement["variant"],
  { border: string; bg: string; icon: string; title: string }
> = {
  info: {
    border: "border-[#1E4B82]/25",
    bg: "bg-[#1E4B82]/[0.06]",
    icon: "text-[#1E4B82]",
    title: "text-[#0F1F35]",
  },
  success: {
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/[0.07]",
    icon: "text-emerald-600",
    title: "text-emerald-900",
  },
  warning: {
    border: "border-[#E8503A]/30",
    bg: "bg-[#F07058]/10",
    icon: "text-[#E8503A]",
    title: "text-[#0F1F35]",
  },
};

export default function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const [dismissed, setDismissed] = useState(false);
  const s = styles[announcement.variant] ?? styles.info;

  async function dismiss() {
    // Optimistically hide, then persist so it stays gone for this member.
    setDismissed(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("announcement_dismissals")
      .insert({ announcement_id: announcement.id, user_id: user.id });
  }

  if (dismissed) return null;

  return (
    <div className={`relative rounded-2xl border ${s.border} ${s.bg} px-5 py-4`}>
      <div className="flex items-start gap-3 pr-8">
        <div className={`mt-0.5 shrink-0 ${s.icon}`}>
          <Megaphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${s.title}`}>{announcement.title}</p>
          <p className="mt-1 text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
            {announcement.body}
          </p>
          {announcement.cta_label && announcement.cta_href && (
            <Link
              href={announcement.cta_href}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#E8503A] hover:text-[#F07058]"
            >
              {announcement.cta_label}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
