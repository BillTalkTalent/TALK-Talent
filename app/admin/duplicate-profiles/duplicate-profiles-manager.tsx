"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Merge } from "lucide-react"

type SearchResult = {
  id: string
  full_name: string | null
  email: string
  title: string | null
  company: string | null
  avatar_url: string | null
  status: string
  role: string
  is_superadmin: boolean
  created_at: string
}

type ActivityCounts = Record<string, number>

const ACTIVITY_TABLES: { table: string; column: string; label: string }[] = [
  { table: "chapter_memberships", column: "user_id", label: "Chapter memberships" },
  { table: "event_rsvps", column: "user_id", label: "Event RSVPs" },
  { table: "forum_topics", column: "author_id", label: "Forum topics" },
  { table: "forum_replies", column: "author_id", label: "Forum replies" },
  { table: "job_posts", column: "poster_id", label: "Job posts" },
  { table: "poll_votes", column: "user_id", label: "Poll votes" },
]

export default function DuplicateProfilesManager() {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [comparing, setComparing] = useState(false)
  const [loadingCompare, setLoadingCompare] = useState(false)
  const [activity, setActivity] = useState<Record<string, ActivityCounts>>({})
  const [vendorLinked, setVendorLinked] = useState<Set<string>>(new Set())
  const [keepId, setKeepId] = useState<string | null>(null)

  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ ok: boolean; message: string; touched?: unknown } | null>(null)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults([])
    setSelectedIds([])
    const supabase = createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, title, company, avatar_url, status, role, is_superadmin, created_at")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("full_name")
      .limit(25)
    setSearching(false)
    if (error) {
      toast.error("Search failed: " + error.message)
      return
    }
    setResults((data ?? []) as SearchResult[])
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) {
        toast.error("Pick exactly two profiles to compare.")
        return prev
      }
      return [...prev, id]
    })
  }

  async function handleCompare() {
    if (selectedIds.length !== 2) return
    setLoadingCompare(true)
    const supabase = createClient()

    const countsByProfile: Record<string, ActivityCounts> = { [selectedIds[0]]: {}, [selectedIds[1]]: {} }
    await Promise.all(
      selectedIds.flatMap(id =>
        ACTIVITY_TABLES.map(async ({ table, column, label }) => {
          const { count } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq(column, id)
          countsByProfile[id][label] = count ?? 0
        })
      )
    )
    setActivity(countsByProfile)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vendorRows } = await (supabase as any)
      .from("vendor_accounts")
      .select("id")
      .in("id", selectedIds)
    setVendorLinked(new Set((vendorRows ?? []).map((r: { id: string }) => r.id)))

    setLoadingCompare(false)
    setComparing(true)
    setKeepId(null)
    setMergeResult(null)
  }

  function backToSearch() {
    setComparing(false)
    setKeepId(null)
    setMergeResult(null)
  }

  async function handleMerge() {
    if (!keepId) return
    const removeId = selectedIds.find(id => id !== keepId)
    if (!removeId) return

    const keepProfile = results.find(r => r.id === keepId)
    const removeProfile = results.find(r => r.id === removeId)
    if (!confirm(
      `Merge "${removeProfile?.full_name ?? removeProfile?.email}" into "${keepProfile?.full_name ?? keepProfile?.email}"?\n\n` +
      `This moves all activity to the kept profile and permanently deletes the other login (${removeProfile?.email}). This can't be undone.`
    )) return

    setMerging(true)
    setMergeResult(null)
    try {
      const res = await fetch("/api/admin/merge-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, removeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMergeResult({ ok: false, message: data.error ?? "Merge failed." })
      } else {
        setMergeResult({ ok: true, message: `Merged successfully. ${removeProfile?.email} no longer works for login.`, touched: data.touched })
        setResults(prev => prev.filter(r => r.id !== removeId))
        setSelectedIds([])
      }
    } catch (err) {
      setMergeResult({ ok: false, message: err instanceof Error ? err.message : "Merge failed." })
    } finally {
      setMerging(false)
    }
  }

  if (comparing) {
    const [idA, idB] = selectedIds
    const profiles = [results.find(r => r.id === idA), results.find(r => r.id === idB)].filter(Boolean) as SearchResult[]

    return (
      <div className="space-y-5">
        <button onClick={backToSearch} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-3.5" /> Back to search
        </button>

        {loadingCompare ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500 py-8 justify-center">
            <Loader2 className="size-4 animate-spin" /> Loading activity…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map(p => {
                const isRisky = p.role === "admin" || p.is_superadmin || vendorLinked.has(p.id)
                const counts = activity[p.id] ?? {}
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-5 space-y-4 ${keepId === p.id ? "border-emerald-300 bg-emerald-50/40" : "border-zinc-200 bg-white"}`}
                  >
                    {isRisky && (
                      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                        <span>
                          {p.role === "admin" || p.is_superadmin ? "This is an admin account. " : ""}
                          {vendorLinked.has(p.id) ? "This account has a linked vendor listing. " : ""}
                          Double-check before merging.
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="size-12 rounded-full object-cover border border-zinc-100" />
                      ) : (
                        <div className="size-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-bold">
                          {(p.full_name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-zinc-900">{p.full_name ?? "(no name)"}</p>
                        <p className="text-xs text-zinc-500">{p.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 space-y-1">
                      <p>{p.title ?? "—"}{p.company ? ` · ${p.company}` : ""}</p>
                      <p className="text-zinc-400">
                        {p.status} · {p.role}{p.is_superadmin ? " · superadmin" : ""} · joined {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="border-t border-zinc-100 pt-3 space-y-1">
                      {ACTIVITY_TABLES.map(({ label }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">{label}</span>
                          <span className={`font-semibold ${counts[label] ? "text-zinc-900" : "text-zinc-300"}`}>{counts[label] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setKeepId(p.id)}
                      className={`w-full text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${keepId === p.id ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                    >
                      {keepId === p.id ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Keeping this one</span> : "Keep this one"}
                    </button>
                  </div>
                )
              })}
            </div>

            {mergeResult && (
              <div className={`rounded-xl px-4 py-3 text-sm ${mergeResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                {mergeResult.message}
              </div>
            )}

            {!mergeResult?.ok && (
              <div className="flex justify-end">
                <button
                  onClick={handleMerge}
                  disabled={!keepId || merging}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {merging ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
                  {merging ? "Merging…" : "Merge into kept profile"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSearch() }}
            placeholder="Search by name or email…"
            className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-violet-400 bg-white"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <p className="text-xs text-zinc-400">Select exactly two profiles that belong to the same person, then compare.</p>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-100">
            {results.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50/60 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="size-4 accent-violet-600"
                />
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="size-9 rounded-full object-cover border border-zinc-100" />
                ) : (
                  <div className="size-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-[10px] font-bold">
                    {(p.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{p.full_name ?? "(no name)"}</p>
                  <p className="text-xs text-zinc-500 truncate">{p.email}{p.company ? ` · ${p.company}` : ""}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 shrink-0">{p.status}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCompare}
              disabled={selectedIds.length !== 2}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              Compare {selectedIds.length === 2 ? "" : `(${selectedIds.length}/2 selected)`}
            </button>
          </div>
        </>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-8">No matches yet — try a different search.</p>
      )}
    </div>
  )
}
