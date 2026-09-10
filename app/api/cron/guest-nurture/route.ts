import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// Nothing currently follows up with a guest (the no-account LinkedIn/email
// RSVP flow) after they actually attend — they get one confirmation email
// at RSVP time and then never hear from TALK again unless they happen to
// apply on their own. This runs daily and nudges guests from events that
// ended 1-3 days ago to apply and join, once per guest per event.
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

  // Events that ended 1-3 days ago — wide enough that a daily cron never
  // misses one regardless of what time of day the event was, narrow enough
  // that this doesn't retroactively email guests from months-old events.
  const now = new Date()
  const windowStart = new Date(now.getTime() - 72 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data: events } = await db
    .from('events')
    .select('id, title')
    .eq('status', 'published')
    .eq('is_test', false)
    .gte('event_date', windowStart.toISOString())
    .lte('event_date', windowEnd.toISOString())

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No events in nurture window' })
  }

  let totalSent = 0

  for (const event of events) {
    const { data: guests } = await db
      .from('event_guest_rsvps')
      .select('id, email, full_name')
      .eq('event_id', event.id)
      .eq('status', 'going')
      .is('nurture_sent_at', null)

    if (!guests || guests.length === 0) continue

    // Skip anyone whose guest-RSVP email already belongs to an existing
    // member — no reason to pitch "join TALK" to someone already in.
    const emails: string[] = guests.map((g: { email: string }) => g.email.toLowerCase())
    const { data: existingProfiles } = await db
      .from('profiles')
      .select('email')
      .in('email', emails)
    const memberEmails = new Set(
      (existingProfiles ?? []).map((p: { email: string }) => p.email.toLowerCase())
    )
    const toSend = guests.filter((g: { email: string }) => !memberEmails.has(g.email.toLowerCase()))
    if (toSend.length === 0) continue

    const signupUrl = `${origin}/signup?event=${event.id}&title=${encodeURIComponent(event.title)}`

    const batch = toSend.map((g: { email: string; full_name: string | null }) => ({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: g.email,
      subject: `Thanks for coming to ${event.title} — join TALK?`,
      html: buildNurtureEmail(g.full_name?.split(' ')[0] ?? 'there', event.title, signupUrl, origin),
    }))

    try {
      const { error } = await resend.batch.send(batch)
      if (!error) {
        totalSent += batch.length
        const sentIds = toSend.map((g: { id: string }) => g.id)
        await db
          .from('event_guest_rsvps')
          .update({ nurture_sent_at: new Date().toISOString() })
          .in('id', sentIds)
      }
    } catch (err) {
      console.error(`[guest-nurture] batch error for event ${event.id}:`, err)
    }
  }

  return NextResponse.json({ sent: totalSent, events: events.length })
}

function buildNurtureEmail(firstName: string, eventTitle: string, signupUrl: string, origin: string): string {
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
          <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0d0d0d;line-height:1.2;">
            Thanks for coming, ${firstName}!
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
            You joined us for <strong>${eventTitle}</strong> — hope it was worth the time. TALK runs events like
            this one regularly for TA leaders, plus a members-only community for swapping notes between events.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            It's free to join. Apply and we'll get you set up.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td style="background:linear-gradient(135deg,#E8503A,#F07058);border-radius:10px;">
              <a href="${signupUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:10px;">
                Apply to join TALK →
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            You&apos;re receiving this because you RSVPed to a TALK event.
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace('https://', '')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
