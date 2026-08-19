import { emailShell } from '@/lib/email'
import { buildUpcomingEventsBlock, type NewsletterEvent } from '@/lib/newsletter-events'
import { formatInZone } from '@/lib/timezone'

// Weekly "here's what's coming up" email — app/api/cron/event-digest.
// Reuses the same event-listing card the newsletter's "Upcoming events"
// section already renders (lib/newsletter-events.ts), just as the entire
// email body instead of one section among several.

export function buildEventDigestEmail(events: NewsletterEvent[], origin: string, unsubscribeUrl: string): string {
  const intro = `
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hi there,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      Here's what's coming up at TALK this week.
    </p>`
  // buildUpcomingEventsBlock returns a single <tr> — wrap it in its own
  // table so it's valid standalone HTML, then hand the whole thing to
  // emailShell as the body (not through the rich-text bulk-email path,
  // since this is a data-driven card list, not composer HTML).
  const eventsTable = `<table cellpadding="0" cellspacing="0" width="100%">${buildUpcomingEventsBlock(events, origin)}</table>`
  return emailShell(`${intro}${eventsTable}`, unsubscribeUrl)
}

export function buildEventDigestText(events: NewsletterEvent[], origin: string, unsubscribeUrl: string): string {
  const lines = events.map((e) => {
    const tz = e.timezone || 'America/New_York'
    const when = formatInZone(e.event_date, tz, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    const where = e.is_virtual ? 'Virtual' : (e.venue_name || e.location || 'In person')
    return `- ${e.title} — ${when} · ${where}\n  ${origin}/events/${e.id}`
  })

  return `Hi there,

Here's what's coming up at TALK this week.

${lines.join('\n\n')}

— TALK Talent Community

Unsubscribe: ${unsubscribeUrl}`
}
