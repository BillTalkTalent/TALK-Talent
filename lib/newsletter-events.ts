import { formatInZone } from '@/lib/timezone'

// Shared "next real, published, non-test event(s)" query — used by the
// newsletter's own single-event spotlight below (limit: 1 — the soonest
// upcoming event), the separate weekly event-digest email / admin preview
// (which wants every upcoming event capped at a row count instead), and the
// public newsletter teaser page (windowDays: 7). Callers pick whichever
// scoping they need; none of them is a sensible default for the others.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterEvent = {
  id: string
  title: string
  event_date: string
  timezone: string | null
  venue_name: string | null
  location: string | null
  is_virtual: boolean
  description: string | null
  chapters: { name: string } | null
  newsletter_feature?: boolean
}

export async function getUpcomingEventsForNewsletter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminDb: any,
  opts: { limit?: number; windowDays?: number } = {},
): Promise<NewsletterEvent[]> {
  // newsletter_feature first — an admin-flagged event always wins the
  // spotlight (and leads a full event list) over pure chronological order,
  // so two same-week events don't leave the wrong one picked just for
  // happening a couple hours earlier in the day.
  let query = adminDb
    .from('events')
    .select('id, title, event_date, timezone, venue_name, location, is_virtual, description, chapters(name), newsletter_feature')
    .eq('status', 'published')
    .eq('is_test', false)
    .eq('visibility', 'all')
    .gte('event_date', new Date().toISOString())
    .order('newsletter_feature', { ascending: false })
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

// The newsletter's events section used to be a list of every event in the
// next 7 days. In practice there's only ever one — the recurring weekly
// virtual discussion — so a generic list undersold it: no sense of what
// it's about or why to show up, just a date and a title. This spotlights
// that single soonest event instead, pulling its own description in as the
// "why come" pitch rather than making an admin write separate newsletter
// copy for something that already has a description.
//
// Matches the "soonest upcoming event" definition already used elsewhere
// (app/admin/events/page.tsx's "Share This Week's Event") — getUpcomingEventsForNewsletter(adminDb, { limit: 1 }).
//
// Returns '' (renders nothing) when there's no upcoming event, same
// graceful-hide pattern as the rest of the newsletter's blocks.
// Shared innards for the spotlight — just the badge/title/date/pitch/CTA
// stack, with no outer wrapper, so each caller can drop it into whatever
// table-row vs. plain-div shell its email shell expects.
function discussionCardInner(event: NewsletterEvent, origin: string, goingCount?: number): string {
  const tz = event.timezone || 'America/New_York'
  const dateLine = formatInZone(event.event_date, tz, { year: undefined })
  const city = event.is_virtual ? 'Virtual' : cityFor(event)
  const venue = event.venue_name || (event.is_virtual ? null : event.location) || null
  const locationLine = [city, venue].filter(Boolean).join(' · ')
  const url = `${origin}/events/${event.id}`

  const why = (event.description || '').trim()
  const whyLine = why
    ? (why.length > 320 ? `${why.slice(0, 317).trim()}…` : why)
    : "Join fellow TA leaders for this week's live discussion — bring your questions, trade notes with peers who've been there."

  // Social proof only once there's something to show off — an empty
  // "0 people going" line undercuts the urgency it's meant to create.
  const goingLine = goingCount && goingCount > 0
    ? `<p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#E8503A;">${goingCount} ${goingCount === 1 ? 'person' : 'people'} already going</p>`
    : ''

  return `
  <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">This week's discussion</p>
  <p style="margin:6px 0 4px;font-size:18px;font-weight:800;color:#0F1F35;line-height:1.3;">${esc(event.title)}</p>
  <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">${esc(dateLine)}${locationLine ? ` &middot; ${esc(locationLine)}` : ''}</p>
  ${goingLine}
  <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.6;">${esc(whyLine)}</p>
  <a href="${url}" style="display:inline-block;padding:11px 24px;background:#E8503A;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px;">Save Your Spot &rarr;</a>`
}

export function buildThisWeeksDiscussionBlock(event: NewsletterEvent | null | undefined, origin: string, goingCount?: number): string {
  if (!event) return ''

  return `
  <tr><td style="background:#fff;padding:6px 36px 26px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eef0f2;border-radius:14px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#E8503A,#F07058);height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:22px 24px;">
        ${discussionCardInner(event, origin, goingCount)}
      </td></tr>
    </table>
  </td></tr>`
}

// Same spotlight, as a standalone div for emails whose shell (lib/email.ts
// emailShell) drops the body straight into a <td> rather than building its
// own <table> of <tr> rows — e.g. the Thursday event-digest.
export function buildThisWeeksDiscussionCard(event: NewsletterEvent | null | undefined, origin: string, goingCount?: number): string {
  if (!event) return ''

  return `
  <div style="border:1px solid #eef0f2;border-radius:14px;overflow:hidden;margin-bottom:20px;">
    <div style="background:linear-gradient(90deg,#E8503A,#F07058);height:4px;line-height:4px;font-size:0;">&nbsp;</div>
    <div style="padding:22px 24px;">
      ${discussionCardInner(event, origin, goingCount)}
    </div>
  </div>`
}
