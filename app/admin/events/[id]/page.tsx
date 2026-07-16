import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { TIME_ZONES, zonedWallTimeToUTC, utcToZonedInputValue } from '@/lib/timezone'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('events').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
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
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={event.location ?? ''} placeholder="City, Venue" />
            </div>
            <div className="space-y-2">
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

            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" render={<Link href="/admin/events" />}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
