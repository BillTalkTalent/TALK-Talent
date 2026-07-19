'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, X, Loader2 } from 'lucide-react'

export default function SponsorForm({ addSponsor }: { addSponsor: (fd: FormData) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Logo must be under 5MB'); return }
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setSubmitting(true)
    try {
      let logoUrl = ''
      if (logoFile) {
        const supabase = createClient()
        const ext = logoFile.name.split('.').pop()
        const path = `sponsors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('event-images').upload(path, logoFile, { upsert: false })
        if (error) throw error
        logoUrl = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl
      }
      fd.set('logo_url', logoUrl)
      await addSponsor(fd)
      form.reset()
      setLogoFile(null)
      setLogoPreview(null)
      toast.success('Sponsor added')
    } catch {
      toast.error('Failed to add sponsor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Sponsor name *</Label>
        <Input id="name" name="name" required placeholder="Acme ATS" />
      </div>

      <div className="space-y-1.5">
        <Label>Logo</Label>
        {logoPreview ? (
          <div className="relative inline-block rounded-lg border border-zinc-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="Logo preview" className="h-12 w-auto object-contain" />
            <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute -top-2 -right-2 size-5 rounded-full bg-zinc-800 text-white flex items-center justify-center">
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 hover:border-zinc-300">
            <Upload className="size-4" /> Upload logo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickLogo} className="hidden" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Link URL</Label>
        <Input id="url" name="url" type="url" placeholder="https://acme.com" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blurb">Blurb (one line)</Label>
        <Input id="blurb" name="blurb" maxLength={140} placeholder="The ATS built for talent teams." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="position">Placement *</Label>
          <select id="position" name="position" defaultValue="top" required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expires_at">Runs until *</Label>
          <Input id="expires_at" name="expires_at" type="date" required />
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? <><Loader2 className="size-4 animate-spin" /> Adding…</> : 'Add sponsor'}
      </Button>
    </form>
  )
}
