import { formatInZone } from '@/lib/timezone'

// Shared "next real, published, non-test event(s)" query — used both by the
// newsletter's own "Upcoming events" block (scoped to the next 7 days, to
// match its "This week in TALK" framing) and by the separate weekly
// event-digest email / admin preview, which wants every upcoming event
// capped at a row count instead. Callers pick whichever scoping they need;
// neither is a sensible default for the other, so there isn't one.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterEvent = {
  id: string
  title: string
  event_date: string
  timezone: string | null
  venue_name: string | null
  location: string | null
  is_virtual: boolean
  chapters: { name: string } | null
}

export async function getUpcomingEventsForNewsletter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminDb: any,
  opts: { limit?: number; windowDays?: number } = {},
): Promise<NewsletterEvent[]> {
  let query = adminDb
    .from('events')
    .select('id, title, event_date, timezone, venue_name, location, is_virtual, chapters(name)')
    .eq('status', 'published')
    .eq('is_test', false)
    .eq('visibility', 'all')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })

  if (opts.windowDays) {
    query = query.lte('event_date', new Date(Date.now() + opts.windowDays * 24 * 60 * 60 * 1000).toISOString())
  }
  if (opts.limit) {
    query = query.limit(opts.limit)
  }

  const { data } = await query
  return data ?? []
}

// Chapter names are stored "ST · City" (e.g. "FL · Tampa Bay") — the city
// half is what reads naturally inline next to a venue. Falls back to
// pulling a city out of a freeform street address when there's no chapter
// link (e.g. a one-off event), and finally to nothing rather than guessing.
function cityFor(e: NewsletterEvent): string | null {
  if (e.chapters?.name) {
    const parts = e.chapters.name.split('·').map(p => p.trim())
    return parts[parts.length - 1] || e.chapters.name
  }
  if (e.location) {
    const segments = e.location.split(',').map(s => s.trim())
    if (segments.length >= 2) return segments[1]
  }
  return null
}

// Returns '' (renders nothing) when there are no upcoming events, same
// graceful-hide pattern as the homepage's events section.
export function buildUpcomingEventsBlock(events: NewsletterEvent[], origin: string): string {
  if (events.length === 0) return ''

  const rows = events.map((e, i) => {
    const isLast = i === events.length - 1
    const tz = e.timezone || 'America/New_York'
    const month = formatInZone(e.event_date, tz, {
      month: 'short', weekday: undefined, day: undefined, year: undefined, hour: undefined, minute: undefined, timeZoneName: undefined,
    }).toUpperCase()
    const day = formatInZone(e.event_date, tz, {
      day: 'numeric', weekday: undefined, month: undefined, year: undefined, hour: undefined, minute: undefined, timeZoneName: undefined,
    })
    const time = formatInZone(e.event_date, tz, {
      hour: 'numeric', minute: '2-digit', weekday: undefined, month: undefined, day: undefined, year: undefined,
    })
    const city = e.is_virtual ? 'Virtual' : cityFor(e)
    const venue = e.venue_name || (e.is_virtual ? null : e.location) || null
    const venueTime = [venue, time].filter(Boolean).join(' · ')
    const cityPill = city ? `<span style="display:inline-block;background:#fdece8;color:#E8503A;font-size:10px;font-weight:800;letter-spacing:0.02em;padding:2px 8px;border-radius:20px;margin-bottom:4px;">${esc(city)}</span><br>` : ''
    const url = `${origin}/events/${e.id}`
    return `
      <tr>
        <td style="padding:12px 0;${isLast ? '' : 'border-bottom:1px solid #eef0f2;'}">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="48" valign="top" style="padding-right:14px;">
              <div style="width:44px;background:linear-gradient(160deg,#0F1F35,#162D4A);border-radius:9px;text-align:center;padding:7px 0;">
                <div style="font-size:9px;font-weight:800;color:#F07058;letter-spacing:0.05em;">${esc(month)}</div>
                <div style="font-size:17px;font-weight:900;color:#ffffff;line-height:1.1;">${esc(day)}</div>
              </div>
            </td>
            <td valign="top">
              ${cityPill}
              <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(e.title)}</a>
              <p style="margin:3px 0 0;font-size:12px;color:#6b7280;">${esc(venueTime)}</p>
            </td>
          </tr></table>
        </td>
      </tr>`
  }).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="border:1px solid #eef0f2;border-radius:14px;padding:20px 22px;border-top:3px solid #E8503A;">
      <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">Upcoming events</p>
      <p style="margin:4px 0 16px;font-size:13px;font-weight:600;color:#0F1F35;">A national community, with local connections.</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
    </div>
  </td></tr>`
}
