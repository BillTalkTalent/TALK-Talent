'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { TIME_ZONES, zonedWallTimeToUTC, localZone, utcToZonedInputValue } from '@/lib/timezone'

const DEFAULT_TZ = (() => {
  const z = localZone()
  return TIME_ZONES.some((t) => t.value === z) ? z : 'America/New_York'
})()

export type ChapterManageEvent = {
  id: string
  title: string
  description: string | null
  venue_name: string | null
  location: string | null
  event_type: string
  is_virtual: boolean
  virtual_url: string | null
  event_date: string
  end_date: string | null
  timezone: string
  max_attendees: number | null
  status: string
  image_url: string | null
}

interface ChapterEventFormProps {
  chapterId: string
  organizerId: string
  event?: ChapterManageEvent | null
  onSaved: () => void
  onCancel: () => void
}

export default function ChapterEventForm({ chapterId, organizerId, event, onSaved, onCancel }: ChapterEventFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image_url ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)

    startTransition(async () => {
      const supabase = createClient()
      let imageUrl: string | null = event?.image_url ?? null

      if (imageFile) {
        setUploadingImage(true)
        const ext = imageFile.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('event-images').upload(path, imageFile, { upsert: false })
        if (uploadError) {
          setError(`Image upload failed: ${uploadError.message}`)
          setUploadingImage(false)
          return
        }
        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
        setUploadingImage(false)
      }

      const eventDate = fd.get('event_date') as string
      const endDate = fd.get('end_date') as string
      const timezone = (fd.get('timezone') as string) || DEFAULT_TZ
      const maxAttendees = fd.get('max_attendees') as string
      const eventDateUtc = zonedWallTimeToUTC(eventDate, timezone).toISOString()
      const endDateUtc = endDate ? zonedWallTimeToUTC(endDate, timezone).toISOString() : null
      const eventType = (fd.get('event_type') as string) || 'in_person'
      const isVirtual = eventType !== 'in_person'

      const payload = {
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || null,
        venue_name: (fd.get('venue_name') as string) || null,
        location: (fd.get('location') as string) || null,
        event_type: eventType,
        is_virtual: isVirtual,
        virtual_url: (fd.get('virtual_url') as string) || null,
        event_date: eventDateUtc,
        end_date: endDateUtc,
        timezone,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        image_url: imageUrl,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { error: dbError } = event
        ? await sb.from('events').update(payload).eq('id', event.id)
        : await sb.from('events').insert({ ...payload, chapter_id: chapterId, organizer_id: organizerId, status: 'draft' })

      if (dbError) {
        setError(dbError.message)
        return
      }

      onSaved()
    })
  }

  const eventDateLocal = event ? utcToZonedInputValue(event.event_date, event.timezone) : ''
  const endDateLocal = event?.end_date ? utcToZonedInputValue(event.end_date, event.timezone) : ''

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {!event && (
        <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm text-amber-800">
          Submitted as a draft — a TALK admin reviews and publishes it before members see it.
        </div>
      )}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={event?.title} required />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={event?.description ?? ''}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          placeholder="Describe the event…"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label>Event Image</Label>
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border aspect-[16/6] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button type="button" onClick={clearImage} className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border hover:border-[#f97316] hover:bg-[#f97316]/5 transition-all py-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-[#f97316]"
          >
            <Upload className="size-6" />
            <span className="text-sm font-medium">Click to upload event image</span>
            <span className="text-xs">PNG, JPG, WEBP up to 5MB</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue_name">Venue name</Label>
        <Input id="venue_name" name="venue_name" defaultValue={event?.venue_name ?? ''} placeholder="e.g. Thinking Cup Boston" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Address</Label>
        <Input id="location" name="location" defaultValue={event?.location ?? ''} placeholder="85 Newbury St, Boston, MA 02116" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="virtual_url">Virtual URL</Label>
        <Input id="virtual_url" name="virtual_url" type="url" defaultValue={event?.virtual_url ?? ''} placeholder="https://zoom.us/…" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_date">Start Date &amp; Time *</Label>
        <Input id="event_date" name="event_date" type="datetime-local" defaultValue={eventDateLocal} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_date">End Date &amp; Time</Label>
        <Input id="end_date" name="end_date" type="datetime-local" defaultValue={endDateLocal} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="timezone">Time Zone *</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={event?.timezone ?? DEFAULT_TZ}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TIME_ZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_attendees">Max Attendees</Label>
        <Input id="max_attendees" name="max_attendees" type="number" min="1" defaultValue={event?.max_attendees ?? ''} placeholder="Unlimited" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="event_type">Format *</Label>
        <select
          id="event_type"
          name="event_type"
          defaultValue={event?.event_type ?? 'in_person'}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="in_person">📍 In person</option>
          <option value="webinar">🎥 Virtual</option>
          <option value="hybrid">🔀 Hybrid</option>
        </select>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex items-center gap-2">
        <Button type="submit" disabled={isPending || uploadingImage}>
          {uploadingImage ? (
            <><Loader2 className="size-4 animate-spin mr-2" /> Uploading image…</>
          ) : isPending ? (
            <><Loader2 className="size-4 animate-spin mr-2" /> Saving…</>
          ) : (
            <><ImageIcon className="size-4 mr-2" /> {event ? 'Save changes' : 'Submit as draft'}</>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
