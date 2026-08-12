'use server'

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildBulkEmail, buildBulkText } from '@/lib/email'
import { unsubUrl } from '@/lib/unsubscribe'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Free events RSVP into event_rsvps; paid events register (and pay) into
// event_registrations — the audience for "everyone going" lives in whichever
// one this event actually uses.
async function fetchAttendeeEmails(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  isPaid: boolean
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any
  const { data } = isPaid
    ? await a.from('event_registrations').select('profiles(email)').eq('event_id', eventId).eq('status', 'completed')
    : await a.from('event_rsvps').select('profiles(email)').eq('event_id', eventId).eq('status', 'going')

  const emails = new Set<string>()
  for (const row of data ?? []) {
    const e = (row.profiles?.email ?? '').toLowerCase().trim()
    if (isEmail(e)) emails.add(e)
  }
  return [...emails]
}

async function fetchUnsubscribed(admin: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const { data } = await admin.from('email_unsubscribes').select('email')
  return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase().trim()))
}

export async function getRsvpAudienceCount(eventId: string, isPaid: boolean): Promise<{ total: number }> {
  await requireAdmin()
  const admin = createAdminClient()
  const [emails, unsub] = await Promise.all([
    fetchAttendeeEmails(admin, eventId, isPaid),
    fetchUnsubscribed(admin),
  ])
  return { total: emails.filter((e) => !unsub.has(e)).length }
}

export async function emailRsvps(
  eventId: string,
  isPaid: boolean,
  subject: string,
  body: string
): Promise<{ ok: boolean; sent: number; total: number; error?: string }> {
  await requireAdmin()
  const subj = subject.trim()
  const bodyText = body.trim()
  if (!subj || !bodyText) return { ok: false, sent: 0, total: 0, error: 'Subject and message are required.' }

  const admin = createAdminClient()
  const [allEmails, unsub] = await Promise.all([
    fetchAttendeeEmails(admin, eventId, isPaid),
    fetchUnsubscribed(admin),
  ])
  const recipients = allEmails.filter((e) => !unsub.has(e))
  if (recipients.length === 0) return { ok: false, sent: 0, total: 0, error: 'No attendees to email yet.' }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com'

  let sent = 0
  // Same throttled-batch pattern as the all-members broadcast.
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const batch = chunk.map((to) => {
      const u = unsubUrl(origin, to)
      return {
        from,
        replyTo,
        to,
        subject: subj,
        html: buildBulkEmail({ bodyText, unsubscribeUrl: u }),
        text: buildBulkText({ bodyText, unsubscribeUrl: u }),
      }
    })
    try {
      const { error } = await resend.batch.send(batch)
      if (!error) sent += chunk.length
    } catch {
      /* skip this batch, keep going */
    }
    if (i + 100 < recipients.length) await new Promise((r) => setTimeout(r, 600))
  }

  return { ok: sent > 0, sent, total: recipients.length }
}
