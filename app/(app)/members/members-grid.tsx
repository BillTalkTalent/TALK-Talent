"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import type { Chapter, ChapterMembership, Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface MembersGridProps {
  members: Profile[];
  chapters: Chapter[];
  memberships: ChapterMembership[];
}

export default function MembersGrid({ members, chapters, memberships }: MembersGridProps) {
  const [query, setQuery] = useState("");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const memberChapterIds: Record<string, string[]> = {};
  for (const m of memberships) {
    if (!memberChapterIds[m.user_id]) memberChapterIds[m.user_id] = [];
    memberChapterIds[m.user_id].push(m.chapter_id);
  }

  const chapterById: Record<string, Chapter> = {};
  for (const c of chapters) chapterById[c.id] = c;

  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    const matchesSearch =
      !q ||
      m.full_name?.toLowerCase().includes(q) ||
      m.title?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q);
    const matchesChapter =
      !activeChapterId ||
      (memberChapterIds[m.id] ?? []).includes(activeChapterId);
    return matchesSearch && matchesChapter;
  });

  return (
    <div className="space-y-5">
      {/* Chapter filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveChapterId(null)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            activeChapterId === null
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600"
          )}
        >
          All
        </button>
        {chapters.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveChapterId(activeChapterId === c.id ? null : c.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
              activeChapterId === c.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600"
            )}
          >
            {c.icon && <span className="mr-1">{c.icon}</span>}
            <span className="max-w-[120px] truncate">{c.name}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl border-zinc-200 bg-white"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Search className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No members found</p>
          <p className="text-sm text-zinc-400 mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((member) => {
            const memberChapters = (memberChapterIds[member.id] ?? [])
              .map((id) => chapterById[id])
              .filter(Boolean);
            const displayChapters = memberChapters.slice(0, 2);
            const extraCount = memberChapters.length - displayChapters.length;

            return (
              <Link key={member.id} href={`/members/${member.id}`}>
                <div className="group rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer p-5 flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <Avatar className="size-16 ring-2 ring-offset-2 ring-indigo-100">
                      {member.avatar_url && (
                        <AvatarImage src={member.avatar_url} alt={member.full_name ?? ""} />
                      )}
                      <AvatarFallback
                        className="text-sm font-bold"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                      >
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 w-full space-y-1">
                    <p className="font-bold text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">
                      {member.full_name ?? "Unnamed"}
                    </p>
                    {member.title && (
                      <p className="text-xs text-zinc-500 truncate">{member.title}</p>
                    )}
                    {member.company && (
                      <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                        {member.company}
                      </span>
                    )}
                  </div>

                  {displayChapters.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center w-full">
                      {displayChapters.map((c) => (
                        <span key={c.id} className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full max-w-[100px] truncate">
                          {c.icon} {c.name}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-xs text-zinc-400 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  )}

                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-zinc-300 hover:text-indigo-500 transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
