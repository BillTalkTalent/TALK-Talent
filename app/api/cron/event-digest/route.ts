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
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = await getUpcomingEventsForNewsletter(admin as any, 25)
  if (events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No upcoming events — nothing to send' })
  }

  const { sent, skipped, total } = await sendBulkEmail(admin, {
    subject: `${events.length} upcoming event${events.length > 1 ? 's' : ''} at TALK`,
    renderEmail: (u) => ({
      html: buildEventDigestEmail(events, origin, u),
      text: buildEventDigestText(events, origin, u),
    }),
  })

  return NextResponse.json({ sent, skipped, total, events: events.length })
}
