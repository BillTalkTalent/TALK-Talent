import { formatInZone } from '@/lib/timezone'

// Auto-generated "Upcoming events" block for the newsletter — pulls real,
// published, non-test events rather than relying on an admin to paste them
// into a text section by hand. Placed right under the sponsor block, same
// as the sponsor callouts this mirrors visually.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterEvent = {
  id: string
  title: string
  event_date: string
  timezone: string | null
  venue_name: string | null
  location: string | null
  is_virtual: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUpcomingEventsForNewsletter(adminDb: any, limit = 3): Promise<NewsletterEvent[]> {
  const { data } = await adminDb
    .from('events')
    .select('id, title, event_date, timezone, venue_name, location, is_virtual')
    .eq('status', 'published')
    .eq('is_test', false)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(limit)
  return data ?? []
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
    const where = e.is_virtual ? 'Virtual' : (e.venue_name || e.location || 'In person')
    const url = `${origin}/events/${e.id}`
    return `
      <tr>
        <td style="padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #eef0f2;'}">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="46" valign="top" style="padding-right:12px;">
              <div style="width:42px;background:#f4f0ff;border-radius:8px;text-align:center;padding:6px 0;">
                <div style="font-size:9px;font-weight:800;color:#7c3aed;letter-spacing:0.05em;">${esc(month)}</div>
                <div style="font-size:16px;font-weight:900;color:#111827;line-height:1.1;">${esc(day)}</div>
              </div>
            </td>
            <td valign="top">
              <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(e.title)}</a>
              <p style="margin:3px 0 0;font-size:12px;color:#6b7280;">${esc(time)} &middot; ${esc(where)}</p>
            </td>
          </tr></table>
        </td>
      </tr>`
  }).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="border:1px solid #eef0f2;border-radius:12px;padding:20px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">Upcoming events</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
    </div>
  </td></tr>`
}
