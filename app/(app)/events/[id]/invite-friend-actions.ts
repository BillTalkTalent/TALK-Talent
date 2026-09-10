'use server'

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatInZone } from '@/lib/timezone'

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Any signed-in member can invite someone outside TALK to a specific event —
// distinct from admin-only Email RSVPs (that blasts everyone already
// going). Deliberately doesn't require allow_guest_rsvp: the invite still
// forwards the event either way, just with different copy depending on
// whether the recipient can RSVP directly or needs to apply to join.
export async function inviteFriendToEvent(
  eventId: string,
  email: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You need to be signed in to invite someone.' }

  const to = email.trim().toLowerCase()
  if (!isEmail(to)) return { ok: false, error: 'Enter a valid email address.' }

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const inviterName = (inviterProfile as { full_name: string | null } | null)?.full_name?.trim() || 'A TALK member'
  const inviterFirstName = inviterName.split(' ')[0]

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any
  const { data: event } = await adminDb
    .from('events')
    .select('id, title, description, event_date, timezone, is_virtual, venue_name, location, image_url, allow_guest_rsvp, status, visibility')
    .eq('id', eventId)
    .single()

  if (!event || event.status === 'cancelled' || event.visibility === 'leads_only') {
    return { ok: false, error: "This event isn't available to invite people to." }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const eventUrl = `${origin}/events/${eventId}`
  const when = formatInZone(event.event_date, event.timezone || 'America/New_York')
  const whereLine = event.is_virtual ? 'Virtual' : [event.venue_name, event.location].filter(Boolean).join(', ')
  const ctaLine = event.allow_guest_rsvp
    ? 'You can RSVP in a minute — no TALK membership needed.'
    : 'RSVPing means applying to join TALK, the free community for TA leaders.'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to,
      subject: `${inviterFirstName} invited you to ${event.title}`,
      html: `
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> thinks you'd like <strong>${event.title}</strong> — ${when}${whereLine ? `, ${whereLine}` : ''}.</p>
        ${note.trim() ? `<p style="padding:12px 16px;background:#f8fafc;border-radius:8px;color:#374151;">"${note.trim().slice(0, 500)}"</p>` : ''}
        <p>${ctaLine}</p>
        <p><a href="${eventUrl}" style="display:inline-block;padding:12px 24px;background:#E8503A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;">View the event</a></p>
      `,
    })
  } catch {
    return { ok: false, error: 'Something went wrong sending the invite. Please try again.' }
  }

  return { ok: true }
}
