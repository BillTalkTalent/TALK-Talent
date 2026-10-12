import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPrefs, wants } from '@/lib/notification-prefs'

export const maxDuration = 300

// One-time-per-event in-app nudge for approved members who haven't RSVP'd
// to the week's spotlighted discussion, sent 2 days out (migration 102).
// Same batching rationale as process-poll-notifications /
// process-job-notifications: a bulk insert at full member count was
// directly confirmed elsewhere in this codebase to hit Postgres's
// statement_timeout. Unlike those, there's no insert-trigger queue here —
// this is calendar-driven, so the daily run does the fan-out itself.
const BATCH_SIZE = 300
const MAX_EVENTS_PER_RUN = 5

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Events happening in ~48-49 hours — same 1-hour-window-on-a-daily-cron
  // pattern as event-reminders' 24-25h window. Runs at 17:00 UTC
  // (vercel.json) to line up with the weekly discussion's usual 1pm ET
  // slot — like event-digest's note on the same DST issue, this'll read an
  // hour off once the US switches to EST in November unless bumped then.
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const in49h = new Date(now.getTime() + 49 * 60 * 60 * 1000)

  const { data: events } = await db
    .from('events')
    .select('id, title')
    .eq('status', 'published')
    .eq('is_test', false)
    .eq('visibility', 'all')
    .is('rsvp_nudge_sent_at', null)
    .gte('event_date', in48h.toISOString())
    .lte('event_date', in49h.toISOString())
    .limit(MAX_EVENTS_PER_RUN)

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No events in nudge window' })
  }

  let eventsProcessed = 0
  let totalNotifications = 0

  for (const event of events) {
    // Claim first (conditional update, same guard as the newsletter send
    // race fix) so an overlapping run can't double-send for this event.
    const { data: claimed } = await db
      .from('events')
      .update({ rsvp_nudge_sent_at: new Date().toISOString() })
      .eq('id', event.id)
      .is('rsvp_nudge_sent_at', null)
      .select('id')

    if (!claimed || claimed.length === 0) continue

    try {
      const { data: going } = await db
        .from('event_rsvps')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'going')

      const goingIds = new Set((going ?? []).map((r: { user_id: string }) => r.user_id))
      const titleShort = event.title.length > 50 ? event.title.slice(0, 47) + '…' : event.title
      const link = `/events/${event.id}`

      let sent = 0
      let offset = 0

      for (;;) {
        const { data: page } = await db
          .from('profiles')
          .select('id')
          .eq('status', 'approved')
          .eq('is_bot', false)
          .range(offset, offset + BATCH_SIZE - 1)

        if (!page || page.length === 0) break

        const ids = page
          .map((p: { id: string }) => p.id)
          .filter((id: string) => !goingIds.has(id))

        const prefs = await loadPrefs(db, ids)
        const rows = ids
          .filter((id: string) => wants(prefs, id, 'push_events'))
          .map((id: string) => ({
            user_id: id,
            type: 'event_rsvp_nudge',
            title: `Still time to join: ${titleShort}`,
            body: null,
            link,
          }))

        if (rows.length > 0) {
          const { error: insertError } = await db.from('notifications').insert(rows)
          if (insertError) throw insertError
        }

        sent += rows.length
        if (page.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }

      eventsProcessed += 1
      totalNotifications += sent
    } catch (err) {
      console.error(`[rsvp-nudge] failed for event ${event.id}:`, err)
      // rsvp_nudge_sent_at is already claimed — on failure this event is
      // simply skipped going forward rather than retried, since retrying
      // would risk double-notifying members the first pass already reached.
    }
  }

  return NextResponse.json({ processed: eventsProcessed, notifications: totalNotifications, queued: events.length })
}
