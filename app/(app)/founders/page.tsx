import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Lightbulb, MessageSquare, FolderOpen, HeartHandshake, Users, UserPlus, Flag, Calendar, type LucideIcon } from "lucide-react";

export default async function FoundersHubPage() {
  const supabase = await createClient();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const [{ count: suggestionCount }, { count: postCount }, { count: eventCount }, { count: fileCount }, { count: opportunityCount }, { count: memberCount }] =
    await Promise.all([
      db.from("founder_suggestions").select("id", { count: "exact", head: true }),
      db.from("founder_posts").select("id", { count: "exact", head: true }),
      db.from("founder_events").select("id", { count: "exact", head: true }).gte("event_date", new Date().toISOString()),
      db.from("founder_files").select("id", { count: "exact", head: true }),
      db.from("founder_opportunities").select("id", { count: "exact", head: true }).eq("is_active", true),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true).eq("status", "approved"),
    ]);

  type Tile = {
    href: string;
    gradient: string;
    icon: LucideIcon;
    label: string;
    stat: number | null;
    statLabel: string;
    description: string;
  };

  const tiles: Tile[] = [
    {
      href: "/founders/suggestions",
      gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      icon: Lightbulb,
      label: "Ideas & Topics",
      stat: suggestionCount ?? 0,
      statLabel: "submitted",
      description: "Submit, vote, and track where each one stands",
    },
    {
      href: "/founders/discussion",
      gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
      icon: MessageSquare,
      label: "Discussion",
      stat: postCount ?? 0,
      statLabel: "posts",
      description: "General back-and-forth that isn't a structured idea",
    },
    {
      href: "/founders/calendar",
      gradient: "linear-gradient(135deg, #8b5cf6, #d946ef)",
      icon: Calendar,
      label: "Calendar",
      stat: eventCount ?? 0,
      statLabel: "upcoming",
      description: "Founder-only meetings and get-togethers",
    },
    {
      href: "/founders/files",
      gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
      icon: FolderOpen,
      label: "Files & Recordings",
      stat: fileCount ?? 0,
      statLabel: "shared",
      description: "Shared resources and meeting recordings",
    },
    {
      href: "/founders/volunteer",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      icon: HeartHandshake,
      label: "Volunteer Options",
      stat: opportunityCount ?? 0,
      statLabel: "open",
      description: "Ways to pitch in on the rebuild",
    },
    {
      href: "/founders/members",
      gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
      icon: Users,
      label: "Founding Members",
      stat: memberCount ?? 0,
      statLabel: "people",
      description: "Who else is helping out",
    },
    {
      href: "/founders/nominate",
      gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
      icon: UserPlus,
      label: "Nominate a Founder",
      stat: null,
      statLabel: "",
      description: "Know someone who should join this group?",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
        >
          <Flag className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Founders Hub</h1>
          <p className="text-sm text-muted-foreground">A space for the founding members helping rebuild TALK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group block rounded-2xl p-5 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: tile.gradient }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <tile.icon className="size-5 text-white" />
              </div>
              {tile.stat !== null && (
                <div className="text-right">
                  <p className="text-2xl font-black leading-none">{tile.stat}</p>
                  <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">{tile.statLabel}</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-0.5">
              <h2 className="font-bold">{tile.label}</h2>
              <p className="text-sm text-white/80 leading-snug">{tile.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
