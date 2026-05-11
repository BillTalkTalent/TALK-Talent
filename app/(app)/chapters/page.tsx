"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, MapPin, Check, Users, Search } from "lucide-react";
import type { Chapter } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ChapterWithCount = Chapter & { memberCount: number; type: string };

const GEO_REGIONS: { label: string; prefix: string[] }[] = [
  { label: "Canada",             prefix: ["AB", "BC", "ON", "QC"] },
  { label: "Northeast",          prefix: ["CT", "DC", "DE", "MA", "MD", "NJ", "NY", "PA", "RI"] },
  { label: "Southeast",          prefix: ["AL", "FL", "GA", "KY", "LA", "NC", "SC", "TN", "VA"] },
  { label: "Midwest",            prefix: ["IA", "IL", "IN", "KS", "MI", "MN", "MO", "NE", "OH", "OK", "WI"] },
  { label: "South & Southwest",  prefix: ["AR", "TX"] },
  { label: "West",               prefix: ["AZ", "CA", "CO", "ID", "NV", "OR", "UT", "WA"] },
  { label: "Worldwide",          prefix: ["International", "National"] },
];

function getRegion(name: string): string {
  const prefix = name.split(" ·")[0].trim();
  for (const region of GEO_REGIONS) {
    if (region.prefix.includes(prefix)) return region.label;
  }
  return "Worldwide";
}

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<ChapterWithCount[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoSearch, setGeoSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [{ data: chaptersData }, { data: membershipsData }, { data: allMemberships }] =
        await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("chapters").select("*").order("sort_order"),
          supabase.from("chapter_memberships").select("chapter_id").eq("user_id", user.id),
          supabase.from("chapter_memberships").select("chapter_id"),
        ]);

      const countMap: Record<string, number> = {};
      for (const m of allMemberships ?? []) {
        countMap[m.chapter_id] = (countMap[m.chapter_id] ?? 0) + 1;
      }

      setChapters(
        (chaptersData ?? []).map((c: ChapterWithCount) => ({ ...c, memberCount: countMap[c.id] ?? 0 }))
      );
      setJoinedIds(new Set((membershipsData ?? []).map((m: { chapter_id: string }) => m.chapter_id)));
      setLoading(false);
    }
    load();
  }, []);

  async function toggleChapter(chapterId: string) {
    if (!currentUserId) return;
    const supabase = createClient();
    const isJoined = joinedIds.has(chapterId);

    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (isJoined) next.delete(chapterId); else next.add(chapterId);
      return next;
    });
    setChapters((prev) =>
      prev.map((c) => c.id === chapterId
        ? { ...c, memberCount: c.memberCount + (isJoined ? -1 : 1) }
        : c
      )
    );

    if (isJoined) {
      await supabase.from("chapter_memberships").delete()
        .eq("chapter_id", chapterId).eq("user_id", currentUserId);
    } else {
      await supabase.from("chapter_memberships").insert({ chapter_id: chapterId, user_id: currentUserId });
    }
  }

  const topicChapters = chapters.filter(c => c.type === "topic");
  const geoChapters = chapters.filter(c => c.type === "geographic");

  const filteredGeo = geoSearch.trim()
    ? geoChapters.filter(c => c.name.toLowerCase().includes(geoSearch.toLowerCase()))
    : geoChapters;

  // Group filtered geo chapters by region
  const geoByRegion: Record<string, ChapterWithCount[]> = {};
  for (const chapter of filteredGeo) {
    const region = getRegion(chapter.name);
    if (!geoByRegion[region]) geoByRegion[region] = [];
    geoByRegion[region].push(chapter);
  }
  const regionOrder = GEO_REGIONS.map(r => r.label).filter(r => geoByRegion[r]?.length);

  const joinedCount = joinedIds.size;

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-zinc-100 rounded-2xl w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-zinc-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
          <BookOpen className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Chapters</h1>
          <p className="text-sm text-zinc-500">
            Join the topics and locations that matter to you
            {joinedCount > 0 && (
              <span className="ml-2 text-[#8b5cf6] font-semibold">· {joinedCount} joined</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Topical Chapters ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-[#8b5cf6]" />
          <h2 className="text-base font-bold text-zinc-900">Topical Chapters</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{topicChapters.length}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topicChapters.map((chapter) => {
            const joined = joinedIds.has(chapter.id);
            return (
              <div
                key={chapter.id}
                className={cn(
                  "group rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col",
                  joined
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                    : "border-zinc-100 bg-white hover:border-[#8b5cf6] hover:shadow-sm"
                )}
                onClick={() => toggleChapter(chapter.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl leading-none">{chapter.icon}</span>
                  {joined && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8b5cf6] bg-white border border-[#8b5cf6]/30 px-2 py-0.5 rounded-full shadow-sm">
                      <Check className="size-3" /> Joined
                    </span>
                  )}
                </div>
                <p className={cn("font-bold text-base", joined ? "text-[#4c1d95]" : "text-zinc-900")}>
                  {chapter.name}
                </p>
                {chapter.description && (
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-2 flex-1">{chapter.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users className="size-3" />
                    {chapter.memberCount} {chapter.memberCount === 1 ? "member" : "members"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleChapter(chapter.id); }}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                      joined
                        ? "bg-white text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                        : "bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-sm"
                    )}
                  >
                    {joined ? "Leave" : "Join"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Geographic Chapters ── */}
      <section>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[#00b894]" />
            <h2 className="text-base font-bold text-zinc-900">Geographic Chapters</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{geoChapters.length}</span>
          </div>
          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search city or state…"
              value={geoSearch}
              onChange={e => setGeoSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#00d4aa] w-52 transition-colors"
            />
          </div>
        </div>

        {regionOrder.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">No chapters match &ldquo;{geoSearch}&rdquo;</p>
        ) : (
          <div className="space-y-6">
            {regionOrder.map(region => (
              <div key={region}>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">{region}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {geoByRegion[region].map(chapter => {
                    const joined = joinedIds.has(chapter.id);
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => toggleChapter(chapter.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm",
                          joined
                            ? "border-[#00d4aa]/50 bg-[#00d4aa]/8 text-zinc-900"
                            : "border-zinc-100 bg-white hover:border-[#00d4aa]/40 hover:bg-[#00d4aa]/5 text-zinc-700"
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{chapter.icon}</span>
                          <span className="font-medium truncate text-xs">{chapter.name}</span>
                        </span>
                        {joined
                          ? <Check className="size-3.5 text-[#00b894] shrink-0" />
                          : <span className="text-[10px] text-zinc-400 shrink-0">{chapter.memberCount > 0 ? chapter.memberCount : ""}</span>
                        }
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
