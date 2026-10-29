"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/founders", label: "Overview", exact: true },
  { href: "/founders/suggestions", label: "Ideas & Topics" },
  { href: "/founders/discussion", label: "Discussion" },
  { href: "/founders/files", label: "Files" },
  { href: "/founders/volunteer", label: "Volunteer" },
  { href: "/founders/members", label: "Members" },
];

export default function FoundersNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <nav className="max-w-3xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "text-sm font-semibold px-3 py-3 border-b-2 whitespace-nowrap transition-colors",
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
        {/* Leaves the Founders section on purpose — referring someone to TALK is a
            platform-wide feature (/invite), not Founders-specific, but founding
            members asked where to do it from inside the hub. */}
        <Link
          href="/invite"
          className="ml-auto text-sm font-semibold px-3 py-3 whitespace-nowrap text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Refer a Member →
        </Link>
      </nav>
    </div>
  );
}
