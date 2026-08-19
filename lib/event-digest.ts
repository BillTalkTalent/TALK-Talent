import { emailShell } from '@/lib/email'
import type { NewsletterEvent } from '@/lib/newsletter-events'
import { formatInZone } from '@/lib/timezone'

// Weekly "here's what's coming up" email — app/api/cron/event-digest.
// Groups events into In-Person / Virtual sections (rather than one flat
// list) and ends with a CTA to /topics/suggest so members can pitch what
// they want a future event or discussion to cover.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function eventRow(e: NewsletterEvent, origin: string, isLast: boolean): string {
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
}

function eventSection(label: string, badgeColor: string, events: NewsletterEvent[], origin: string): string {
  if (events.length === 0) return ''
  const rows = events.map((e, i) => eventRow(e, origin, i === events.length - 1)).join('')
  return `
  <div style="border:1px solid #eef0f2;border-radius:12px;padding:20px 22px;margin-bottom:16px;">
    <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${badgeColor};">${esc(label)}</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

const TOPIC_CTA_HTML = (origin: string) => `
  <div style="border:1px dashed #E8503A55;border-radius:12px;padding:18px 22px;text-align:center;margin-top:4px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1F35;">Want us to cover something specific?</p>
    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.5;">
      Tell us what topic or subject you&rsquo;d like a future event or discussion to dig into.
    </p>
    <a href="${origin}/topics/suggest" style="display:inline-block;padding:9px 20px;font-size:12px;font-weight:700;color:#ffffff;background:#E8503A;border-radius:8px;text-decoration:none;">
      Suggest a topic →
    </a>
  </div>`

export function buildEventDigestEmail(events: NewsletterEvent[], origin: string, unsubscribeUrl: string): string {
  const inPerson = events.filter((e) => !e.is_virtual)
  const virtual = events.filter((e) => e.is_virtual)

  const intro = `
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hi there,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      Here's what's coming up at TALK this week.
    </p>`

  const body = `${intro}
    ${eventSection('In-person events', '#E8503A', inPerson, origin)}
    ${eventSection('Virtual events', '#7c3aed', virtual, origin)}
    ${TOPIC_CTA_HTML(origin)}`

  return emailShell(body, unsubscribeUrl)
}

export function buildEventDigestText(events: NewsletterEvent[], origin: string, unsubscribeUrl: string): string {
  const inPerson = events.filter((e) => !e.is_virtual)
  const virtual = events.filter((e) => e.is_virtual)

  const lineFor = (e: NewsletterEvent) => {
    const tz = e.timezone || 'America/New_York'
    const when = formatInZone(e.event_date, tz, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    const where = e.is_virtual ? 'Virtual' : (e.venue_name || e.location || 'In person')
    return `- ${e.title} — ${when} · ${where}\n  ${origin}/events/${e.id}`
  }

  const section = (label: string, list: NewsletterEvent[]) =>
    list.length === 0 ? '' : `${label.toUpperCase()}\n${list.map(lineFor).join('\n\n')}\n\n`

  return `Hi there,

Here's what's coming up at TALK this week.

${section('In-person events', inPerson)}${section('Virtual events', virtual)}Want us to cover something specific? Suggest a topic for a future event or discussion:
${origin}/topics/suggest

— TALK Talent Community

Unsubscribe: ${unsubscribeUrl}`
}
