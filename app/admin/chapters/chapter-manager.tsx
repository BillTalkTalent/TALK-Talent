"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Search, Plus, Pencil, Archive, ArchiveRestore, Star, X, Loader2, Check,
} from "lucide-react"
import type { Chapter } from "@/lib/supabase/types"

type Lead = { user_id: string; full_name: string | null }
type BoardMember = { id: string; full_name: string | null; title: string | null; company: string | null }

type EditableFields = {
  name: string
  icon: string
  type: "topic" | "geographic"
  description: string
  long_description: string
  banner_url: string
  website_url: string
  contact_email: string
  sort_order: string
}

const emptyForm: EditableFields = {
  name: "", icon: "", type: "topic", description: "", long_description: "",
  banner_url: "", website_url: "", contact_email: "", sort_order: "0",
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toForm(c: Chapter): EditableFields {
  return {
    name: c.name,
    icon: c.icon ?? "",
    type: c.type,
    description: c.description ?? "",
    long_description: c.long_description ?? "",
    banner_url: c.banner_url ?? "",
    website_url: c.website_url ?? "",
    contact_email: c.contact_email ?? "",
    sort_order: String(c.sort_order),
  }
}

export default function ChapterManager({
  chapters,
  leadMap,
  memberCountMap,
  boardMembers,
}: {
  chapters: Chapter[]
  leadMap: Record<string, Lead[]>
  memberCountMap: Record<string, number>
  boardMembers: BoardMember[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "topic" | "geographic">("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditableFields>(emptyForm)

  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<EditableFields & { slug: string }>({ ...emptyForm, slug: "" })
  const [slugTouched, setSlugTouched] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const totalMembers = chapters.reduce((sum, c) => sum + (memberCountMap[c.id] ?? 0), 0)
    const emptyChapters = chapters.filter(c => c.is_active && (memberCountMap[c.id] ?? 0) === 0).length
    const activeCount = chapters.filter(c => c.is_active).length
    const archivedCount = chapters.length - activeCount
    return { totalMembers, emptyChapters, activeCount, archivedCount }
  }, [chapters, memberCountMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chapters.filter(c => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false
      if (statusFilter === "active" && !c.is_active) return false
      if (statusFilter === "archived" && c.is_active) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false
      return true
    })
  }, [chapters, search, typeFilter, statusFilter])

  function startEdit(chapter: Chapter) {
    setEditingId(chapter.id)
    setForm(toForm(chapter))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function set(field: keyof EditableFields, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave(chapterId: string) {
    const sortOrder = parseInt(form.sort_order, 10)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from("chapters")
        .update({
          name: form.name.trim(),
          icon: form.icon.trim() || null,
          type: form.type,
          description: form.description.trim() || null,
          long_description: form.long_description.trim() || null,
          banner_url: form.banner_url.trim() || null,
          website_url: form.website_url.trim() || null,
          contact_email: form.contact_email.trim() || null,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        })
        .eq("id", chapterId)
      if (error) {
        toast.error("Save failed: " + error.message)
        return
      }
      toast.success("Chapter updated.")
      setEditingId(null)
      router.refresh()
    })
  }

  function handleArchiveToggle(chapter: Chapter) {
    if (chapter.is_active && !confirm(`Archive "${chapter.name}"? It disappears from the member-facing chapters list, but memberships and history are kept.`)) {
      return
    }
    setBusyId(chapter.id)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from("chapters").update({ is_active: !chapter.is_active }).eq("id", chapter.id)
      setBusyId(null)
      if (error) {
        toast.error("Failed: " + error.message)
        return
      }
      toast.success(chapter.is_active ? "Chapter archived." : "Chapter restored.")
      router.refresh()
    })
  }

  function handleAssignLead(chapterId: string, userId: string) {
    if (!userId) return
    startTransition(async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_leads").upsert({ chapter_id: chapterId, user_id: userId })
      if (error) {
        toast.error("Assign failed: " + error.message)
        return
      }
      router.refresh()
    })
  }

  function handleRemoveLead(chapterId: string, userId: string) {
    startTransition(async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_leads").delete().eq("chapter_id", chapterId).eq("user_id", userId)
      if (error) {
        toast.error("Remove failed: " + error.message)
        return
      }
      router.refresh()
    })
  }

  function handleCreate() {
    const name = createForm.name.trim()
    const slug = (createForm.slug.trim() || slugify(name))
    if (!name || !slug) {
      toast.error("Name is required.")
      return
    }
    const sortOrder = parseInt(createForm.sort_order, 10)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from("chapters").insert({
        name,
        slug,
        icon: createForm.icon.trim() || null,
        type: createForm.type,
        description: createForm.description.trim() || null,
        long_description: createForm.long_description.trim() || null,
        banner_url: createForm.banner_url.trim() || null,
        website_url: createForm.website_url.trim() || null,
        contact_email: createForm.contact_email.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      if (error) {
        toast.error("Create failed: " + error.message)
        return
      }
      toast.success("Chapter created.")
      setCreating(false)
      setCreateForm({ ...emptyForm, slug: "" })
      setSlugTouched(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active chapters" value={stats.activeCount} />
        <StatCard label="Archived" value={stats.archivedCount} />
        <StatCard label="Total chapter members" value={stats.totalMembers} />
        <StatCard label="Active, zero members" value={stats.emptyChapters} warn={stats.emptyChapters > 0} />
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chapters by name or slug…"
            className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {(["all", "topic", "geographic"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${typeFilter === t ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
            >
              {t === "all" ? "All types" : t === "topic" ? "Topical" : "Geographic"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {(["active", "archived", "all"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${statusFilter === s ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
            >
              {s === "all" ? "All statuses" : s === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          <Plus className="size-3.5" /> New chapter
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">New chapter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                value={createForm.name}
                onChange={e => {
                  const name = e.target.value
                  setCreateForm(prev => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }))
                }}
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              />
            </Field>
            <Field label="Slug">
              <input
                value={createForm.slug}
                onChange={e => { setSlugTouched(true); setCreateForm(prev => ({ ...prev, slug: e.target.value })) }}
                placeholder="auto-generated-from-name"
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-mono"
              />
            </Field>
            <Field label="Icon (emoji)">
              <input
                value={createForm.icon}
                onChange={e => setCreateForm(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="📍"
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 text-center text-lg"
              />
            </Field>
            <Field label="Type">
              <select
                value={createForm.type}
                onChange={e => setCreateForm(prev => ({ ...prev, type: e.target.value as "topic" | "geographic" }))}
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 bg-white"
              >
                <option value="topic">Topical</option>
                <option value="geographic">Geographic</option>
              </select>
            </Field>
            <Field label="Short tagline" full>
              <input
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                maxLength={160}
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => { setCreating(false); setSlugTouched(false) }} className="px-3 py-2 rounded-xl text-xs text-zinc-500 hover:bg-zinc-100">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Create chapter
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pl-5 pr-4 uppercase tracking-wide">Chapter</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Members</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Leads</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Assign</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-5 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-zinc-400">No chapters match this search/filter.</td>
              </tr>
            )}
            {filtered.map(chapter => {
              const chapterLeads = leadMap[chapter.id] ?? []
              const unassignedBoardMembers = boardMembers.filter(bm => !chapterLeads.some(l => l.user_id === bm.id))
              const isEditing = editingId === chapter.id

              if (isEditing) {
                return (
                  <tr key={chapter.id} className="border-b border-zinc-100 bg-amber-50/30">
                    <td colSpan={5} className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            Editing &middot; <span className="font-mono normal-case">{chapter.slug}</span>
                          </p>
                          <span className="text-[11px] text-zinc-400">Slug can&apos;t be changed here — it&apos;s used in shared links.</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Field label="Name">
                            <input value={form.name} onChange={e => set("name", e.target.value)}
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                          <Field label="Icon (emoji)">
                            <input value={form.icon} onChange={e => set("icon", e.target.value)}
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 text-center text-lg" />
                          </Field>
                          <Field label="Type">
                            <select value={form.type} onChange={e => set("type", e.target.value)}
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 bg-white">
                              <option value="topic">Topical</option>
                              <option value="geographic">Geographic</option>
                            </select>
                          </Field>
                          <Field label="Sort order">
                            <input value={form.sort_order} onChange={e => set("sort_order", e.target.value)} type="number"
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                          <Field label="Short tagline" full>
                            <input value={form.description} onChange={e => set("description", e.target.value)} maxLength={160}
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                          <Field label="About this chapter" full>
                            <textarea value={form.long_description} onChange={e => set("long_description", e.target.value)} rows={3}
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 resize-none" />
                          </Field>
                          <Field label="Banner image URL">
                            <input value={form.banner_url} onChange={e => set("banner_url", e.target.value)} type="url"
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                          <Field label="Website URL">
                            <input value={form.website_url} onChange={e => set("website_url", e.target.value)} type="url"
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                          <Field label="Contact email">
                            <input value={form.contact_email} onChange={e => set("contact_email", e.target.value)} type="email"
                              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400" />
                          </Field>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={cancelEdit} className="px-3 py-2 rounded-xl text-xs text-zinc-500 hover:bg-zinc-100">Cancel</button>
                          <button
                            onClick={() => handleSave(chapter.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                          >
                            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            Save changes
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={chapter.id} className={`border-b border-zinc-100 hover:bg-zinc-50/40 transition-colors ${!chapter.is_active ? "opacity-50" : ""}`}>
                  <td className="py-3 pl-5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{chapter.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-zinc-900">{chapter.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${chapter.type === "geographic" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
                            {chapter.type === "geographic" ? "Geo" : "Topic"}
                          </span>
                          {!chapter.is_active && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">Archived</span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono">{chapter.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm font-semibold text-zinc-700">{memberCountMap[chapter.id] ?? 0}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {chapterLeads.map(lead => (
                        <span key={lead.user_id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {lead.full_name ?? "Unknown"}
                          <button
                            onClick={() => handleRemoveLead(chapter.id, lead.user_id)}
                            disabled={isPending}
                            className="ml-0.5 text-amber-400 hover:text-red-400 transition-colors disabled:opacity-60"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      {chapterLeads.length === 0 && <span className="text-xs text-zinc-400 italic">No lead</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {unassignedBoardMembers.length > 0 && (
                      <AssignLeadControl
                        boardMembers={unassignedBoardMembers}
                        onAssign={userId => handleAssignLead(chapter.id, userId)}
                        disabled={isPending}
                      />
                    )}
                  </td>
                  <td className="py-3 pr-5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(chapter)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleArchiveToggle(chapter)}
                        disabled={busyId === chapter.id}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-60"
                      >
                        {chapter.is_active ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
                        {chapter.is_active ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "bg-amber-50 border-amber-100" : "bg-white border-zinc-100"}`}>
      <p className={`text-2xl font-bold ${warn ? "text-amber-700" : "text-zinc-900"}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

function AssignLeadControl({
  boardMembers,
  onAssign,
  disabled,
}: {
  boardMembers: BoardMember[]
  onAssign: (userId: string) => void
  disabled?: boolean
}) {
  const [userId, setUserId] = useState("")
  return (
    <div className="flex items-center gap-2">
      <select
        value={userId}
        onChange={e => setUserId(e.target.value)}
        className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 bg-white"
      >
        <option value="">Assign board member…</option>
        {boardMembers.map(bm => (
          <option key={bm.id} value={bm.id}>{bm.full_name}{bm.title ? ` · ${bm.title}` : ""}</option>
        ))}
      </select>
      <button
        onClick={() => { if (userId) { onAssign(userId); setUserId("") } }}
        disabled={disabled || !userId}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
      >
        Assign
      </button>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-3" : ""}`}>
      <label className="text-xs font-semibold text-zinc-500">{label}</label>
      {children}
    </div>
  )
}
