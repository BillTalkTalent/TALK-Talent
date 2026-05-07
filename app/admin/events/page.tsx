import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

async function createEvent(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventDate = formData.get('event_date') as string
  const endDate = formData.get('end_date') as string
  const maxAttendees = formData.get('max_attendees') as string

  await supabase.from('events').insert({
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    location: formData.get('location') as string || null,
    is_virtual: formData.get('is_virtual') === 'on',
    virtual_url: formData.get('virtual_url') as string || null,
    event_date: eventDate,
    end_date: endDate || null,
    max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
    status: (formData.get('status') as 'draft' | 'published' | 'cancelled') || 'draft',
    organizer_id: user.id,
  })
  revalidatePath('/admin/events')
}

async function deleteEvent(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/admin/events')
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  cancelled: 'destructive',
}

export default async function AdminEventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Create event form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="City, Venue" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual_url">Virtual URL</Label>
              <Input id="virtual_url" name="virtual_url" type="url" placeholder="https://zoom.us/..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Start Date &amp; Time *</Label>
              <Input id="event_date" name="event_date" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date &amp; Time</Label>
              <Input id="end_date" name="end_date" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_attendees">Max Attendees</Label>
              <Input id="max_attendees" name="max_attendees" type="number" min="1" placeholder="Unlimited" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="is_virtual" name="is_virtual" className="size-4 rounded border-zinc-300" />
              <Label htmlFor="is_virtual" className="cursor-pointer">Virtual event</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Event list */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <p className="text-sm text-zinc-500">No events yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {events.map((event) => (
                <li key={event.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-zinc-900">{event.title}</p>
                      <Badge variant={statusVariant[event.status] ?? 'outline'}>{event.status}</Badge>
                      {event.is_virtual && <Badge variant="outline">Virtual</Badge>}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {format(new Date(event.event_date), 'PPp')}
                      {event.end_date && ` – ${format(new Date(event.end_date), 'PPp')}`}
                    </p>
                    {event.location && (
                      <p className="text-xs text-zinc-400">{event.location}</p>
                    )}
                    {event.max_attendees && (
                      <p className="text-xs text-zinc-400">Max {event.max_attendees} attendees</p>
                    )}
                  </div>
                  <form action={deleteEvent.bind(null, event.id)}>
                    <Button type="submit" size="sm" variant="destructive">Delete</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
