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
  const { data: me } = await supabase.from('profiles').select('role, email').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
  return { email: (me?.email as string | null) ?? user.email ?? null }
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Pull every approved member's email, paginating past Supabase's 1k row cap.
async function fetchApprovedEmails(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const emails = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('profiles')
      .select('email')
      .eq('status', 'approved')
      .not('email', 'is', null)
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    for (const r of data as { email: string | null }[]) {
      const e = (r.email ?? '').toLowerCase().trim()
      if (isEmail(e)) emails.add(e)
    }
    if (data.length < pageSize) break
  }
  return [...emails]
}

async function fetchUnsubscribed(admin: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const set = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('email_unsubscribes')
      .select('email')
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    for (const r of data as { email: string }[]) set.add(r.email.toLowerCase().trim())
    if (data.length < pageSize) break
  }
  return set
}

// How many members a full send would actually reach (approved minus unsubscribed).
export async function getAudienceCount(): Promise<{ total: number }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [emails, unsub] = await Promise.all([fetchApprovedEmails(admin), fetchUnsubscribed(admin)])
  const total = emails.filter((e) => !unsub.has(e)).length
  return { total }
}

// Send a single preview to the signed-in admin — always safe, never touches members.
export async function sendTestEmail(subject: string, body: string): Promise<{ ok: boolean; to?: string }> {
  const { email } = await requireAdmin()
  if (!email) return { ok: false }
  if (!subject.trim() || !body.trim()) return { ok: false }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const u = unsubUrl(origin, email)
  try {
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: email,
      subject: `[TEST] ${subject.trim()}`,
      html: buildBulkEmail({ bodyText: body, unsubscribeUrl: u }),
      text: buildBulkText({ bodyText: body, unsubscribeUrl: u }),
    })
    return { ok: true, to: email }
  } catch {
    return { ok: false }
  }
}

// Broadcast to all approved members (minus unsubscribes), in throttled batches.
export async function sendToAllMembers(
  subject: string,
  body: string,
): Promise<{ ok: boolean; sent: number; skipped: number; total: number; error?: string }> {
  await requireAdmin()
  const subj = subject.trim()
  const bodyText = body.trim()
  if (!subj || !bodyText) return { ok: false, sent: 0, skipped: 0, total: 0, error: 'Subject and message are required.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [allEmails, unsub] = await Promise.all([fetchApprovedEmails(admin), fetchUnsubscribed(admin)])
  const recipients = allEmails.filter((e) => !unsub.has(e))
  const skipped = allEmails.length - recipients.length

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com'

  let sent = 0
  // Resend batch endpoint: up to 100 messages per call. Space calls out to stay
  // well under rate limits and to be gentler on domain reputation.
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

  return { ok: sent > 0, sent, skipped, total: recipients.length }
}
