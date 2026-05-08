import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateEventForm from './create-event-form'
import { ImageIcon } from 'lucide-react'

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
          <CreateEventForm />
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
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Thumbnail */}
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="size-14 rounded-lg object-cover flex-shrink-0 border border-zinc-100"
                      />
                    ) : (
                      <div className="size-14 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-100">
                        <ImageIcon className="size-5 text-zinc-300" />
                      </div>
                    )}
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
