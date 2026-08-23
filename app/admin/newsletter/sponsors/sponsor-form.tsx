'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, X, Loader2 } from 'lucide-react'

export type SponsorInitial = {
  id: string
  name: string
  logo_url: string | null
  url: string | null
  blurb: string | null
  offer: string | null
  offer_url: string | null
  offer_cta: string | null
  expires_at: string
  placement: 'masthead' | 'mid'
}

export default function SponsorForm({
  saveSponsor,
  initial,
}: {
  saveSponsor: (fd: FormData) => Promise<void>
  initial?: SponsorInitial | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [placement, setPlacement] = useState<'masthead' | 'mid'>(initial?.placement ?? 'masthead')
  const editing = !!initial

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Logo must be under 5MB'); return }
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
    setLogoRemoved(false)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setSubmitting(true)
    try {
      // Keep the existing logo when editing unless it's replaced or removed.
      let logoUrl = editing && !logoRemoved ? (initial?.logo_url ?? '') : ''
      if (logoFile) {
        const supabase = createClient()
        const ext = logoFile.name.split('.').pop()
        const path = `sponsors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('event-images').upload(path, logoFile, { upsert: false })
        if (error) throw error
        logoUrl = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl
      }
      fd.set('logo_url', logoUrl)
      if (editing) fd.set('id', initial!.id)
      await saveSponsor(fd)
      toast.success(editing ? 'Sponsor updated' : 'Sponsor added')
      if (editing) {
        router.push('/admin/newsletter/sponsors')
      } else {
        form.reset()
        setLogoFile(null)
        setLogoPreview(null)
      }
      router.refresh() // re-fetch the list so changes show immediately
    } catch (err) {
      toast.error(err instanceof Error ? `Couldn't save: ${err.message}` : 'Failed to save sponsor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Placement *</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'masthead' as const, label: 'Masthead', desc: 'Top banner + bottom offer' },
            { value: 'mid' as const, label: 'Mid-newsletter', desc: 'Compact banner mid-email' },
          ]).map(opt => (
            <label
              key={opt.value}
              className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 cursor-pointer text-sm ${
                placement === opt.value ? 'border-[#0F1F35] bg-[#0F1F35]/5' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-zinc-900">
                <input
                  type="radio"
                  name="placement"
                  value={opt.value}
                  checked={placement === opt.value}
                  onChange={() => setPlacement(opt.value)}
                  className="size-3.5"
                />
                {opt.label}
              </span>
              <span className="text-xs text-zinc-400 pl-5.5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Sponsor name *</Label>
        <Input id="name" name="name" required defaultValue={initial?.name ?? ''} placeholder="Acme ATS" />
      </div>

      <div className="space-y-1.5">
        <Label>Logo</Label>
        {logoPreview ? (
          <div className="relative inline-block rounded-lg border border-zinc-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="Logo preview" className="h-12 w-auto object-contain" />
            <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoRemoved(true); if (fileRef.current) fileRef.current.value = '' }}
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
        <Input id="url" name="url" type="url" defaultValue={initial?.url ?? ''} placeholder="https://acme.com" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blurb">Blurb (one line)</Label>
        <Input id="blurb" name="blurb" maxLength={140} defaultValue={initial?.blurb ?? ''} placeholder="The ATS built for talent teams." />
        <p className="text-xs text-zinc-400">
          {placement === 'mid' ? 'Shown in the compact mid-newsletter banner.' : 'Shown in the "Presented by" masthead at the top.'}
        </p>
      </div>

      {/* Optional offer/perk line. Masthead gets the full callout (renders as its
          own card at the bottom, with a button); mid just gets a second
          highlighted line inside the same compact banner — no separate card. */}
      {placement === 'masthead' ? (
        <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-800">Special offer <span className="font-normal text-zinc-400">(optional — shows at the bottom)</span></p>
          <div className="space-y-1.5">
            <Label htmlFor="offer">Offer</Label>
            <Input id="offer" name="offer" maxLength={160} defaultValue={initial?.offer ?? ''} placeholder="30% off your first year for TALK members." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="offer_url" className="text-xs">Offer link</Label>
              <Input id="offer_url" name="offer_url" type="url" defaultValue={initial?.offer_url ?? ''} placeholder="https://acme.com/talk" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer_cta" className="text-xs">Button label</Label>
              <Input id="offer_cta" name="offer_cta" maxLength={30} defaultValue={initial?.offer_cta ?? ''} placeholder="Claim offer" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="offer">Member perk line <span className="font-normal text-zinc-400">(optional)</span></Label>
          <Input id="offer" name="offer" maxLength={100} defaultValue={initial?.offer ?? ''} placeholder="TALK members get preferred pricing." />
          <p className="text-xs text-zinc-400">Shown as a highlighted second line in the mid-newsletter banner.</p>
        </div>
      )}

      <div className="space-y-1.5 max-w-[200px]">
        <Label htmlFor="expires_at">Runs until *</Label>
        <Input id="expires_at" name="expires_at" type="date" required defaultValue={initial?.expires_at ?? ''} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : editing ? 'Save changes' : 'Add sponsor'}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={() => router.push('/admin/newsletter/sponsors')}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
