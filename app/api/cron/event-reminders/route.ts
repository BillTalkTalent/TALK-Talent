import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'

  // Find events happening in the next 24–25 hours
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data: events } = await db
    .from('events')
    .select('id, title, event_date, location, is_virtual, virtual_url')
    .eq('status', 'published')
    .gte('event_date', in24h.toISOString())
    .lte('event_date', in25h.toISOString())

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No events in reminder window' })
  }

  let totalSent = 0

  for (const event of events) {
    // Get all RSVPs for this event
    const { data: rsvps } = await db
      .from('event_rsvps')
      .select('user_id, profiles(email, full_name)')
      .eq('event_id', event.id)
      .eq('status', 'going')

    if (!rsvps || rsvps.length === 0) continue

    const eventDate = new Date(event.event_date)
    const dateStr = format(eventDate, "EEEE, MMMM d 'at' h:mm a")
    const locationLine = event.is_virtual ? 'Virtual event' : (event.location ?? 'Location TBD')

    // Send in batches of 50
    const emails = rsvps
      .filter((r: { profiles: { email: string; full_name: string | null } | null }) => r.profiles?.email)
      .map((r: { profiles: { email: string; full_name: string | null } }) => {
        const firstName = r.profiles.full_name?.split(' ')[0] ?? 'there'
        return {
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: r.profiles.email,
          subject: `Reminder: "${event.title}" is tomorrow`,
          html: buildReminderEmail(firstName, event, dateStr, locationLine, origin),
        }
      })

    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50)
      try {
        await resend.batch.send(batch)
        totalSent += batch.length
      } catch (err) {
        console.error(`[event-reminders] batch error for event ${event.id}:`, err)
      }
    }
  }

  return NextResponse.json({ sent: totalSent, events: events.length })
}

function buildReminderEmail(
  firstName: string,
  event: { id: string; title: string; is_virtual: boolean; virtual_url: string | null },
  dateStr: string,
  locationLine: string,
  origin: string
): string {
  const eventUrl = `${origin}/events/${event.id}`
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.08em;">Tomorrow</p>
          <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0d0d0d;line-height:1.2;">
            ${event.title}
          </p>
          <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:14px;color:#374151;">
              📅 <strong>${dateStr}</strong>
            </p>
            <p style="margin:0;font-size:14px;color:#374151;">
              📍 ${locationLine}
            </p>
            ${event.is_virtual && event.virtual_url
              ? `<p style="margin:8px 0 0;font-size:13px;"><a href="${event.virtual_url}" style="color:#E8503A;font-weight:600;">Join link →</a></p>`
              : ''}
          </div>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hi ${firstName}, just a reminder that you&apos;re going to this event tomorrow. See you there!
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td style="background:linear-gradient(135deg,#E8503A,#F07058);border-radius:10px;">
              <a href="${eventUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:10px;">
                View event details →
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            You&apos;re receiving this because you RSVPed to this event.
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace('https://', '')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
