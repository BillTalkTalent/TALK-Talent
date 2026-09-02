import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, DollarSign, Video } from 'lucide-react'
import Link from 'next/link'
import { TIME_ZONES, zonedWallTimeToUTC, utcToZonedInputValue } from '@/lib/timezone'
import MaterialsManager from './materials-manager'

async function updateEvent(id: string, formData: FormData) {
  'use server'
  const supabase = await createClient()

  const isPaid = formData.get('is_paid') === 'on'
  const priceStr = formData.get('price') as string
  const priceCents = isPaid && priceStr ? Math.round(parseFloat(priceStr) * 100) : null
  const startDate = formData.get('event_date') as string
  const endDate = formData.get('end_date') as string
  const timezone = (formData.get('timezone') as string) || 'America/New_York'
  const maxAttendees = formData.get('max_attendees') as string
  const additionalChapterIds = formData.getAll('additional_chapter_ids') as string[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('events').update({
    title: formData.get('title') as string,
    additional_chapter_ids: additionalChapterIds,
    description: (formData.get('description') as string) || null,
    venue_name: (formData.get('venue_name') as string) || null,
    location: (formData.get('location') as string) || null,
    event_type: (formData.get('event_type') as string) || 'in_person',
    is_virtual: ((formData.get('event_type') as string) || 'in_person') !== 'in_person',
    virtual_url: (formData.get('virtual_url') as string) || null,
    // Interpret the naive datetime-local inputs in the chosen zone → UTC.
    event_date: zonedWallTimeToUTC(startDate, timezone).toISOString(),
    end_date: endDate ? zonedWallTimeToUTC(endDate, timezone).toISOString() : null,
    timezone,
    max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
    status: formData.get('status') as string,
    is_paid: isPaid,
    price: priceCents,
    currency: (formData.get('currency') as string) || 'usd',
    recording_url: (formData.get('recording_url') as string) || null,
  }).eq('id', id)

  revalidatePath('/admin/events')
  redirect('/admin/events')
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event } = await (supabase as any).from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: materials } = await supabase
    .from('event_materials')
    .select('id, title, file_url')
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chapters } = await (supabase as any).from('chapters').select('id, name, type').order('sort_order')
  const selectedChapterIds = new Set<string>(event.additional_chapter_ids ?? [])

  // Pre-fill datetime-local inputs with the event's wall-clock time in its own
  // timezone (not raw UTC), so editing round-trips correctly.
  const eventTz = event.timezone || 'America/New_York'
  const toLocalInput = (iso: string | null) => (iso ? utcToZonedInputValue(iso, eventTz) : '')

  const priceDollars = event.price ? (event.price / 100).toFixed(2) : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/admin/events" />}>
          <ArrowLeft className="size-4 mr-1" /> Back to Events
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateEvent.bind(null, id)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" defaultValue={event.title} required />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={event.description ?? ''}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_name">Venue name</Label>
              <Input id="venue_name" name="venue_name" defaultValue={event.venue_name ?? ''} placeholder="e.g. Thinking Cup Boston" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Address</Label>
              <Input id="location" name="location" defaultValue={event.location ?? ''} placeholder="85 Newbury St, Boston, MA 02116" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="virtual_url">Virtual URL</Label>
              <Input id="virtual_url" name="virtual_url" type="url" defaultValue={event.virtual_url ?? ''} placeholder="https://zoom.us/…" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Start Date &amp; Time *</Label>
              <Input id="event_date" name="event_date" type="datetime-local" defaultValue={toLocalInput(event.event_date)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date &amp; Time</Label>
              <Input id="end_date" name="end_date" type="datetime-local" defaultValue={toLocalInput(event.end_date)} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="timezone">Time Zone *</Label>
              <select id="timezone" name="timezone" defaultValue={eventTz} required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {TIME_ZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-400">Start/end times are in this zone. Members also see their own local time.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_attendees">Max Attendees</Label>
              <Input id="max_attendees" name="max_attendees" type="number" min="1" defaultValue={event.max_attendees ?? ''} placeholder="Unlimited" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={event.status}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="event_type">Format *</Label>
              <select id="event_type" name="event_type" required
                defaultValue={event.event_type === 'hybrid' ? 'hybrid' : event.is_virtual ? 'webinar' : 'in_person'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="in_person">📍 In person</option>
                <option value="webinar">🎥 Virtual</option>
                <option value="hybrid">🔀 Hybrid</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="additional_chapter_ids">Also show on chapter pages (optional)</Label>
              <select
                id="additional_chapter_ids"
                name="additional_chapter_ids"
                multiple
                size={6}
                defaultValue={[...selectedChapterIds]}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <optgroup label="Topical">
                  {(chapters ?? []).filter((c: { type: string }) => c.type === 'topic').map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Geographic">
                  {(chapters ?? []).filter((c: { type: string }) => c.type === 'geographic').map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-zinc-400">
                Hold Cmd/Ctrl to pick more than one. This event already shows on the main calendar
                for everyone — picking chapters here also surfaces it on those chapters&apos; own pages.
              </p>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-zinc-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_paid" name="is_paid" defaultChecked={event.is_paid} className="size-4 rounded border-zinc-300" />
                <Label htmlFor="is_paid" className="cursor-pointer font-semibold">
                  <DollarSign className="size-3.5 inline mr-0.5 text-emerald-600" />
                  Paid event
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-xs">Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                    <Input id="price" name="price" type="number" min="0.50" step="0.01"
                      placeholder="49.00" defaultValue={priceDollars} className="pl-7" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs">Currency</Label>
                  <select id="currency" name="currency" defaultValue={event.currency ?? 'usd'}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="usd">USD</option>
                    <option value="cad">CAD</option>
                    <option value="gbp">GBP</option>
                    <option value="eur">EUR</option>
                    <option value="aud">AUD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2 rounded-xl border border-zinc-200 p-4">
              <Label htmlFor="recording_url" className="font-semibold">
                <Video className="size-3.5 inline mr-0.5 text-indigo-600" />
                Recording URL
              </Label>
              <Input id="recording_url" name="recording_url" type="url" defaultValue={event.recording_url ?? ''} placeholder="https://…" />
              <p className="text-xs text-zinc-400">
                Once the event&apos;s recorded, paste the link here (Zoom, YouTube, Drive, etc.) — it shows up as
                &ldquo;Watch the recording&rdquo; on the event page for members.
              </p>
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" render={<Link href="/admin/events" />}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supporting Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialsManager eventId={id} initialMaterials={materials ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
