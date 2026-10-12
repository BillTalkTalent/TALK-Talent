import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBulkEmail } from '@/lib/send-bulk-email'
import { getUpcomingEventsForNewsletter } from '@/lib/newsletter-events'
import { buildEventDigestEmail, buildEventDigestText } from '@/lib/event-digest'

export const maxDuration = 300

// Weekly "what's coming up" digest — every real, published, non-test event
// that hasn't happened yet, sent to every approved member. Runs Thursdays at
// 9am ET (vercel.json: "0 13 * * 4" — that's 13:00 UTC, correct for EDT;
// like the app's other fixed-UTC crons, it'll read as 8am ET once the US
// switches to EST in November unless the schedule is bumped an hour then).
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

  const events = await getUpcomingEventsForNewsletter(db, { limit: 25 })
  if (events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No upcoming events — nothing to send' })
  }

  // The soonest event (events[0], same "next real event" ordering the
  // newsletter's own spotlight uses) gets led with as its own card instead
  // of buried in the flat list — same reasoning as the newsletter's
  // single-event spotlight: this is the one real RSVP-driving CTA, the
  // rest below is just an fyi calendar.
  const spotlight = events[0]
  const restEvents = events.slice(1)

  const [{ count: memberGoing }, { count: guestGoing }, { data: extRow }] = await Promise.all([
    db.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', spotlight.id).eq('status', 'going'),
    db.from('event_guest_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', spotlight.id).eq('status', 'going'),
    db.from('events').select('external_attendee_count').eq('id', spotlight.id).single(),
  ])
  const spotlightGoingCount = (memberGoing ?? 0) + (guestGoing ?? 0) + (extRow?.external_attendee_count ?? 0)

  const { sent, skipped, total } = await sendBulkEmail(admin, {
    subject: `${events.length} upcoming event${events.length > 1 ? 's' : ''} at TALK`,
    renderEmail: (u) => ({
      html: buildEventDigestEmail(spotlight, spotlightGoingCount, restEvents, origin, u),
      text: buildEventDigestText(spotlight, spotlightGoingCount, restEvents, origin, u),
    }),
  })

  return NextResponse.json({ sent, skipped, total, events: events.length, spotlightGoingCount })
}
