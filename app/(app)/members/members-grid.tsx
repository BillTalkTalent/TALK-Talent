"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, MapPin, ChevronDown, X } from "lucide-react";
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
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoSearch, setGeoSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Split chapters by type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicChapters = chapters.filter((c) => (c as any).type !== "geographic");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoChapters = chapters.filter((c) => (c as any).type === "geographic");

  const filteredGeo = geoSearch.trim()
    ? geoChapters.filter((c) => c.name.toLowerCase().includes(geoSearch.toLowerCase()))
    : geoChapters;

  const activeChapter = activeChapterId ? chapters.find((c) => c.id === activeChapterId) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeIsGeo = activeChapter ? (activeChapter as any).type === "geographic" : false;

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGeoOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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

  function selectChapter(id: string | null) {
    setActiveChapterId(id);
    setGeoOpen(false);
    setGeoSearch("");
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All */}
        <button
          onClick={() => selectChapter(null)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            activeChapterId === null
              ? "bg-[#00d4aa] text-[#0d0d0d] shadow-sm"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#00d4aa] hover:text-[#3F7A6E]"
          )}
        >
          All
        </button>

        {/* Topical chapter pills */}
        {topicChapters.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChapter(activeChapterId === c.id ? null : c.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
              activeChapterId === c.id
                ? "bg-[#00d4aa] text-[#0d0d0d] shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#00d4aa] hover:text-[#3F7A6E]"
            )}
          >
            {c.icon && <span className="mr-1">{c.icon}</span>}
            <span>{c.name}</span>
          </button>
        ))}

        {/* Geographic dropdown */}
        {geoChapters.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGeoOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border",
                activeIsGeo
                  ? "bg-[#00d4aa] text-[#0d0d0d] border-[#00d4aa] shadow-sm"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-[#00d4aa] hover:text-[#3F7A6E]"
              )}
            >
              <MapPin className="size-3.5" />
              {activeIsGeo && activeChapter ? (
                <span className="max-w-[120px] truncate">{activeChapter.name}</span>
              ) : (
                "Location"
              )}
              {activeIsGeo ? (
                <X
                  className="size-3.5 ml-0.5 opacity-60 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); selectChapter(null); }}
                />
              ) : (
                <ChevronDown className={cn("size-3.5 transition-transform", geoOpen && "rotate-180")} />
              )}
            </button>

            {geoOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-zinc-100 shadow-xl z-50 overflow-hidden">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-zinc-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search city or state…"
                      value={geoSearch}
                      onChange={(e) => setGeoSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    />
                  </div>
                </div>
                {/* Chapter list */}
                <div className="max-h-64 overflow-y-auto py-1">
                  {filteredGeo.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">No locations found</p>
                  ) : (
                    filteredGeo.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectChapter(activeChapterId === c.id ? null : c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                          activeChapterId === c.id
                            ? "bg-[#00d4aa]/10 text-[#00b894] font-semibold"
                            : "text-zinc-700 hover:bg-zinc-50"
                        )}
                      >
                        <span className="text-xs">{c.icon}</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search — pushed to the right */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            placeholder="Search members…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-xl border-zinc-200 bg-white w-48"
          />
        </div>
      </div>

      {/* Active filter label */}
      {activeChapter && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Filtering by <span className="font-semibold text-zinc-700">{activeChapter.icon} {activeChapter.name}</span></span>
          <button onClick={() => selectChapter(null)} className="text-zinc-400 hover:text-red-400 transition-colors">
            <X className="size-3" />
          </button>
          <span className="text-zinc-300">·</span>
          <span>{filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

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
                <div className="group rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-[#00d4aa] transition-all cursor-pointer p-5 flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <Avatar className="size-16 ring-2 ring-offset-2 ring-indigo-100">
                      {member.avatar_url && (
                        <AvatarImage src={member.avatar_url} alt={member.full_name ?? ""} />
                      )}
                      <AvatarFallback
                        className="text-sm font-bold"
                        style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)", color: "white" }}
                      >
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 w-full space-y-1">
                    <p className="font-bold text-zinc-900 truncate group-hover:text-[#00d4aa] transition-colors">
                      {member.full_name ?? "Unnamed"}
                    </p>
                    {member.title && (
                      <p className="text-xs text-zinc-500 truncate">{member.title}</p>
                    )}
                    {member.company && (
                      <span className="inline-block text-xs font-semibold text-[#00b894] bg-[#00d4aa]/10 px-2 py-0.5 rounded-full mt-1">
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
