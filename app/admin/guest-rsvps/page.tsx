import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { formatInZone } from '@/lib/timezone'
import { Resend } from 'resend'
import { icsFor, buildGuestConfirmedEmail } from '@/lib/guest-rsvp-email'

// Approving sends the actual confirmation (calendar invite included) that
// used to go out the instant someone submitted the form — see migration 099
// and app/api/events/[id]/guest-rsvp/route.ts, which now only sends a
// holding "we got your RSVP" email. Relies on RLS ("Admins can manage event
// guest RSVPs") rather than its own role check — a non-admin's update
// simply matches zero rows.
async function approveGuestRsvp(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: guest } = await db
    .from('event_guest_rsvps')
    .select('id, full_name, email, event_id, status')
    .eq('id', id)
    .single()
  if (!guest || guest.status !== 'pending') {
    revalidatePath('/admin/guest-rsvps')
    return
  }

  const { data: event } = await db
    .from('events')
    .select('id, title, description, event_date, end_date, is_virtual, virtual_url, venue_name, location, timezone')
    .eq('id', guest.event_id)
    .single()
  if (!event) { revalidatePath('/admin/guest-rsvps'); return }

  const { data: updated } = await db
    .from('event_guest_rsvps')
    .update({ status: 'going' })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
  if (!updated || updated.length === 0) { revalidatePath('/admin/guest-rsvps'); return }

  // Best-effort — approval itself already succeeded above regardless.
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const when = formatInZone(event.event_date, event.timezone || 'America/New_York')
    const cancelUrl = `${origin}/events/${event.id}/cancel-rsvp?rsvp=${id}`

    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: guest.email,
      subject: `You're confirmed: ${event.title}`,
      html: buildGuestConfirmedEmail({
        firstName: (guest.full_name as string).split(' ')[0],
        eventTitle: event.title,
        eventId: event.id,
        when,
        origin,
        cancelUrl,
      }),
      attachments: [{ filename: 'event.ics', content: icsFor(event) }],
    })
  } catch {
    /* confirmation email failed — approval still stands */
  }

  revalidatePath('/admin/guest-rsvps')
}

async function rejectGuestRsvp(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('event_guest_rsvps').update({ status: 'rejected' }).eq('id', id).eq('status', 'pending')
  revalidatePath('/admin/guest-rsvps')
}

// The per-event admin page already lists an event's own guest RSVPs, but
// there was no cross-event view — guest RSVP is now on by default for
// every event (migration 086), so a rollup of how much this channel is
// actually generating matters, not just a per-event count buried in each
// event's page.
export default async function AdminGuestRsvpsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: events } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('is_test', false)

  const eventById = new Map((events ?? []).map((e: { id: string; title: string; event_date: string }) => [e.id, e]))
  const eventIds = [...eventById.keys()]

  const { data: guestRsvps } = eventIds.length
    ? await db
        .from('event_guest_rsvps')
        .select('id, event_id, full_name, email, linkedin_url, status, created_at')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pending = (guestRsvps ?? []).filter((g: { status: string }) => g.status === 'pending')
  const going = (guestRsvps ?? []).filter((g: { status: string }) => g.status === 'going')
  const cancelled = (guestRsvps ?? []).filter((g: { status: string }) => g.status === 'cancelled')
  const rejected = (guestRsvps ?? []).filter((g: { status: string }) => g.status === 'rejected')

  // Per-event breakdown, most guest RSVPs first — shows which events are
  // actually pulling in non-members vs. which have the toggle on but no
  // guest traffic.
  const countByEvent = new Map<string, number>()
  for (const g of going as { event_id: string }[]) {
    countByEvent.set(g.event_id, (countByEvent.get(g.event_id) ?? 0) + 1)
  }
  const eventBreakdown = [...countByEvent.entries()]
    .map(([eventId, count]) => ({ eventId, count, event: eventById.get(eventId) as { title: string; event_date: string } | undefined }))
    .filter((row) => row.event)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Guest RSVPs</h1>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">Back to Admin</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-zinc-500">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-zinc-900">{going.length}</p>
            <p className="text-xs text-zinc-500">Confirmed (going)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-zinc-900">{eventBreakdown.length}</p>
            <p className="text-xs text-zinc-500">Events with a guest RSVP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-zinc-900">{cancelled.length + rejected.length}</p>
            <p className="text-xs text-zinc-500">Cancelled / rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting review ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">Nothing waiting on you right now.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {pending.map((g: { id: string; event_id: string; full_name: string; email: string; linkedin_url: string; created_at: string }) => {
                const event = eventById.get(g.event_id) as { title: string } | undefined
                return (
                  <div key={g.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{g.full_name}</p>
                      <p className="text-xs text-zinc-500">
                        <a href={`mailto:${g.email}`} className="hover:underline">{g.email}</a>
                        {" · "}
                        <a href={g.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <ExternalLink className="size-3" /> LinkedIn
                        </a>
                        {event && (
                          <>
                            {" · "}
                            <Link href={`/admin/events/${g.event_id}`} className="hover:underline">{event.title}</Link>
                          </>
                        )}
                        {" · "}
                        {format(new Date(g.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <form action={approveGuestRsvp.bind(null, g.id)}>
                        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="size-3.5" /> Approve
                        </Button>
                      </form>
                      <form action={rejectGuestRsvp.bind(null, g.id)}>
                        <Button type="submit" size="sm" variant="outline" className="text-zinc-500 hover:text-red-600">
                          <XCircle className="size-3.5" /> Reject
                        </Button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {eventBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-100">
              {eventBreakdown.map(({ eventId, count, event }) => (
                <div key={eventId} className="py-2.5 flex items-center justify-between gap-3">
                  <Link href={`/admin/events/${eventId}`} className="text-sm font-medium text-zinc-900 hover:underline">
                    {event!.title}
                  </Link>
                  <span className="text-sm font-semibold text-zinc-500">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Confirmed guest RSVPs ({going.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {going.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No confirmed guest RSVPs yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {going.map((g: { id: string; event_id: string; full_name: string; email: string; linkedin_url: string; created_at: string }) => {
                const event = eventById.get(g.event_id) as { title: string } | undefined
                return (
                  <div key={g.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{g.full_name}</p>
                      <p className="text-xs text-zinc-500">
                        <a href={`mailto:${g.email}`} className="hover:underline">{g.email}</a>
                        {" · "}
                        <a href={g.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <ExternalLink className="size-3" /> LinkedIn
                        </a>
                        {event && (
                          <>
                            {" · "}
                            <Link href={`/admin/events/${g.event_id}`} className="hover:underline">{event.title}</Link>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">{format(new Date(g.created_at), 'MMM d, yyyy')}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
