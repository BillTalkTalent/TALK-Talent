'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

type Chapter = {
  id: string
  name: string
  slug: string
  description: string | null
  long_description: string | null
  banner_url: string | null
  website_url: string | null
  contact_email: string | null
  icon: string | null
}

interface ChapterEditFormProps {
  chapter: Chapter
  isAdmin: boolean
  slug: string
}

export default function ChapterEditForm({ chapter, isAdmin, slug }: ChapterEditFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    description:      chapter.description      ?? '',
    long_description: chapter.long_description ?? '',
    banner_url:       chapter.banner_url       ?? '',
    website_url:      chapter.website_url      ?? '',
    contact_email:    chapter.contact_email    ?? '',
    // admin-only
    name: chapter.name,
    icon: chapter.icon ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload: Record<string, string | null> = {
      description:      form.description.trim()      || null,
      long_description: form.long_description.trim() || null,
      banner_url:       form.banner_url.trim()       || null,
      website_url:      form.website_url.trim()      || null,
      contact_email:    form.contact_email.trim()    || null,
    }

    if (isAdmin) {
      payload.name = form.name.trim() || chapter.name
      payload.icon = form.icon.trim() || null
    }

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('chapters')
      .update(payload)
      .eq('id', chapter.id)

    setSaving(false)

    if (error) {
      toast.error('Save failed: ' + error.message)
      return
    }

    toast.success('Chapter updated!')
    router.push(`/chapters/${slug}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Admin-only: name + icon */}
      {isAdmin && (
        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5 space-y-4">
          <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">Admin only</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Chapter Name</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 transition-colors bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Icon (emoji)</label>
              <input
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="📍"
                className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 transition-colors bg-white text-center text-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Short description */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Chapter Profile</p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Short tagline</label>
          <input
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="e.g. The TA community for the greater Chicago area"
            maxLength={160}
            className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00d4aa] transition-colors"
          />
          <p className="text-[11px] text-zinc-400">{form.description.length}/160 — shows under the chapter name</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">About this chapter</label>
          <textarea
            value={form.long_description}
            onChange={e => set('long_description', e.target.value)}
            rows={5}
            placeholder="Tell members what this chapter is about, who it's for, when you typically meet, etc."
            className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00d4aa] transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Banner image URL</label>
          <input
            type="url"
            value={form.banner_url}
            onChange={e => set('banner_url', e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00d4aa] transition-colors"
          />
          <p className="text-[11px] text-zinc-400">Paste a direct image URL (JPG, PNG, WebP). Displays as a wide banner above the chapter header.</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Contact & Links</p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Website URL</label>
          <input
            type="url"
            value={form.website_url}
            onChange={e => set('website_url', e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00d4aa] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Contact email</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={e => set('contact_email', e.target.value)}
            placeholder="chicago@talk-community.com"
            className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00d4aa] transition-colors"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(`/chapters/${slug}`)}
          className="px-4 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)' }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </button>
      </div>
    </form>
  )
}
