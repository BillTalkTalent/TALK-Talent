"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ExternalLink,
  Search,
  MapPin,
  ChevronDown,
  X,
  Star,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Chapter, ChapterMembership, Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MembersGridProps {
  members: Profile[];
  chapters: Chapter[];
  memberships: ChapterMembership[];
  talentPoolIds?: Set<string>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentQ: string;
  currentLetter: string;
  currentChapter: string;
}

export default function MembersGrid({
  members,
  chapters,
  memberships,
  talentPoolIds,
  totalCount,
  totalPages,
  currentPage,
  currentQ,
  currentLetter,
  currentChapter,
}: MembersGridProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchValue(currentQ);
  }, [currentQ]);

  // Build URL helper — merges new params over the current set
  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      if (currentQ) params.set("q", currentQ);
      if (currentLetter) params.set("letter", currentLetter);
      if (currentChapter) params.set("chapter", currentChapter);
      // Reset page unless explicitly set
      params.delete("page");

      for (const [k, v] of Object.entries(overrides)) {
        if (v) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, currentQ, currentLetter, currentChapter]
  );

  // Debounced search
  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Search clears letter filter
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      if (currentChapter) params.set("chapter", currentChapter);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
  }

  function clearAllFilters() {
    setSearchValue("");
    router.push(pathname);
  }

  // Chapters split
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicChapters = chapters.filter((c) => (c as any).type !== "geographic");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoChapters = chapters.filter((c) => (c as any).type === "geographic");

  const [geoOpen, setGeoOpen] = useState(false);
  const [geoSearch, setGeoSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGeoOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filteredGeo = geoSearch.trim()
    ? geoChapters.filter((c) => c.name.toLowerCase().includes(geoSearch.toLowerCase()))
    : geoChapters;

  const activeChapter = currentChapter ? chapters.find((c) => c.id === currentChapter) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeIsGeo = activeChapter ? (activeChapter as any).type === "geographic" : false;

  // Chapter memberships for displayed members only
  const memberChapterIds: Record<string, string[]> = {};
  for (const m of memberships) {
    if (!memberChapterIds[m.user_id]) memberChapterIds[m.user_id] = [];
    memberChapterIds[m.user_id].push(m.chapter_id);
  }
  const chapterById: Record<string, Chapter> = {};
  for (const c of chapters) chapterById[c.id] = c;

  const hasFilters = currentQ || currentLetter || currentChapter;

  // Pagination page numbers
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (currentPage > 3) pages.push("…");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p);
    }
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="space-y-4">
      {/* Search + chapter filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search name, title, company…"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm w-64 focus:outline-none focus:border-[#00d4aa] transition-colors"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* All chapters pill */}
        <Link
          href={buildUrl({ chapter: "", page: "" })}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            !currentChapter
              ? "bg-[#00d4aa] text-[#0d0d0d] shadow-sm"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#00d4aa] hover:text-[#3F7A6E]"
          )}
        >
          All
        </Link>

        {/* Topical chapter pills */}
        {topicChapters.map((c) => (
          <Link
            key={c.id}
            href={buildUrl({ chapter: currentChapter === c.id ? "" : c.id, page: "" })}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
              currentChapter === c.id
                ? "bg-[#00d4aa] text-[#0d0d0d] shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#00d4aa] hover:text-[#3F7A6E]"
            )}
          >
            {c.icon && <span className="mr-1">{c.icon}</span>}
            {c.name}
          </Link>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(buildUrl({ chapter: "", page: "" }));
                  }}
                />
              ) : (
                <ChevronDown className={cn("size-3.5 transition-transform", geoOpen && "rotate-180")} />
              )}
            </button>

            {geoOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-zinc-100 shadow-xl z-50 overflow-hidden">
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
                <div className="max-h-64 overflow-y-auto py-1">
                  {filteredGeo.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">No locations found</p>
                  ) : (
                    filteredGeo.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          router.push(buildUrl({ chapter: currentChapter === c.id ? "" : c.id, page: "" }));
                          setGeoOpen(false);
                          setGeoSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                          currentChapter === c.id
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

        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* A–Z alphabet bar */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
        <Link
          href={buildUrl({ letter: "", page: "" })}
          className={cn(
            "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all",
            !currentLetter && !currentQ
              ? "bg-[#00d4aa] text-[#0d0d0d]"
              : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          )}
        >
          All
        </Link>
        {ALPHABET.map((l) => (
          <Link
            key={l}
            href={buildUrl({ letter: currentLetter === l ? "" : l, q: "", page: "" })}
            className={cn(
              "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
              currentLetter === l
                ? "bg-[#00d4aa] text-[#0d0d0d]"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            )}
          >
            {l}
          </Link>
        ))}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          {totalCount === 0
            ? "No members found"
            : `Showing ${(currentPage - 1) * 48 + 1}–${Math.min(currentPage * 48, totalCount)} of ${totalCount.toLocaleString()} members`}
          {currentLetter && !currentQ && (
            <span className="ml-1 font-semibold text-zinc-600">
              starting with &ldquo;{currentLetter}&rdquo;
            </span>
          )}
          {currentQ && (
            <span className="ml-1 font-semibold text-zinc-600">
              matching &ldquo;{currentQ}&rdquo;
            </span>
          )}
        </span>
      </div>

      {/* Grid */}
      {members.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Search className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No members found</p>
          <p className="text-sm text-zinc-400 mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => {
            const memberChapters = (memberChapterIds[member.id] ?? [])
              .map((id) => chapterById[id])
              .filter(Boolean);
            const displayChapters = memberChapters.slice(0, 2);
            const extraCount = memberChapters.length - displayChapters.length;

            return (
              <Link key={member.id} href={`/members/${member.id}`}>
                <div className="group rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-[#00d4aa] transition-all cursor-pointer p-5 flex flex-col items-center text-center gap-3 h-full">
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

                  <div className="min-w-0 w-full space-y-1">
                    <p className="font-bold text-zinc-900 truncate group-hover:text-[#00d4aa] transition-colors">
                      {member.full_name ?? "Unnamed"}
                    </p>
                    {member.title && (
                      <p className="text-xs text-zinc-500 truncate">{member.title}</p>
                    )}
                    {member.role === "board_member" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" /> Board Member
                      </span>
                    )}
                    {talentPoolIds?.has(member.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <Zap className="size-2.5 fill-emerald-500 text-emerald-500" /> Open to work
                      </span>
                    )}
                    {member.company && (
                      <span className="inline-block text-xs font-semibold text-[#00b894] bg-[#00d4aa]/10 px-2 py-0.5 rounded-full">
                        {member.company}
                      </span>
                    )}
                  </div>

                  {displayChapters.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center w-full">
                      {displayChapters.map((c) => (
                        <span
                          key={c.id}
                          className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full max-w-[100px] truncate"
                        >
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
                      className="text-zinc-300 hover:text-indigo-500 transition-colors mt-auto"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            {currentPage > 1 ? (
              <Link
                href={buildUrl({ page: String(currentPage - 1) })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-100 text-sm font-medium text-zinc-300 cursor-not-allowed">
                <ChevronLeft className="size-4" />
                Prev
              </span>
            )}

            <div className="flex items-center gap-1">
              {pageNumbers().map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-zinc-400 text-sm">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl({ page: String(p) })}
                    className={cn(
                      "size-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      p === currentPage
                        ? "bg-[#00d4aa] text-[#0d0d0d]"
                        : "text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    {p}
                  </Link>
                )
              )}
            </div>

            {currentPage < totalPages ? (
              <Link
                href={buildUrl({ page: String(currentPage + 1) })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-100 text-sm font-medium text-zinc-300 cursor-not-allowed">
                Next
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
