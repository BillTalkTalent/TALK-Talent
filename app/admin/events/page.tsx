import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { formatInZone } from '@/lib/timezone'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUpcomingEventsForNewsletter } from '@/lib/newsletter-events'
import { buildEventDigestEmail, buildEventDigestText } from '@/lib/event-digest'
import { unsubUrl } from '@/lib/unsubscribe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateEventForm from './create-event-form'
import DeleteEventButton from './delete-event-button'
import SendTestDigestButton from './send-test-digest-button'
import { ImageIcon, Pencil, FlaskConical } from 'lucide-react'

// Previews the weekly "what's coming up" digest (app/api/cron/event-digest)
// by sending it to just the calling admin's own inbox — same content and
// audience-resolution the real Thursday send uses, minus actually reaching
// the membership.
async function sendEventDigestTest(): Promise<{ ok: boolean; to?: string; error?: string }> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single()
  const to = profile?.email ?? user.email
  if (!to) return { ok: false, error: 'No email on your account.' }

  const admin = createAdminClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = await getUpcomingEventsForNewsletter(admin as any, 25)
  if (events.length === 0) return { ok: false, error: 'No upcoming events to preview right now.' }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const u = unsubUrl(origin, to)
  try {
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to,
      subject: `[TEST] ${events.length} upcoming event${events.length > 1 ? 's' : ''} at TALK`,
      html: buildEventDigestEmail(events, origin, u),
      text: buildEventDigestText(events, origin, u),
    })
    return { ok: true, to }
  } catch {
    return { ok: false, error: 'Send failed — check RESEND_API_KEY.' }
  }
}

async function deleteEvent(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/admin/events')
}

// Duplicates a real event as a "test" copy — same content, reachable by
// direct link so the LinkedIn-share -> apply -> approve loop can be tested
// end-to-end with a real member account, but excluded from every public and
// member-facing listing (see migration 052) so it never shows up to real
// members browsing events.
async function cloneAsTestEvent(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: source } = await db.from('events').select('*').eq('id', id).single()
  if (!source) throw new Error('Event not found')

  const { data: clone, error } = await db
    .from('events')
    .insert({
      title: `[TEST] ${source.title}`,
      description: source.description,
      venue_name: source.venue_name,
      location: source.location,
      event_type: source.event_type,
      is_virtual: source.is_virtual,
      virtual_url: source.virtual_url,
      event_date: source.event_date,
      end_date: source.end_date,
      timezone: source.timezone,
      max_attendees: source.max_attendees,
      status: 'published',
      is_test: true,
      image_url: source.image_url,
      is_paid: source.is_paid,
      price: source.price,
      currency: source.currency,
      organizer_id: user.id,
    })
    .select('id')
    .single()

  if (error || !clone) throw new Error(error?.message ?? 'Failed to clone event')

  revalidatePath('/admin/events')
  redirect(`/admin/events/${clone.id}`)
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
      {/* Weekly event digest preview */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Event Digest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-500">
            Every published, upcoming event goes out automatically to all approved members every
            Thursday at 9am ET. Send yourself a preview with today&apos;s real event list.
          </p>
          <SendTestDigestButton sendTest={sendEventDigestTest} />
        </CardContent>
      </Card>

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
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(event as any).is_test && (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                            <FlaskConical className="size-2.5" /> Test — not listed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">
                        {formatInZone(event.event_date, event.timezone || 'America/New_York', {
                          weekday: undefined, month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                      {(event.venue_name || event.location) && (
                        <p className="text-xs text-zinc-400">
                          {[event.venue_name, event.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {event.max_attendees && (
                        <p className="text-xs text-zinc-400">Max {event.max_attendees} attendees</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" render={<Link href={`/admin/events/${event.id}`} />}>
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {!(event as any).is_test && (
                      <form action={cloneAsTestEvent.bind(null, event.id)}>
                        <Button size="sm" variant="outline" type="submit" title="Duplicate as a hidden test event — for testing the LinkedIn share/apply loop without showing real members">
                          <FlaskConical className="size-3.5 mr-1" /> Clone as test
                        </Button>
                      </form>
                    )}
                    <form action={deleteEvent.bind(null, event.id)}>
                      <DeleteEventButton title={event.title} />
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
