import { Resend } from 'resend'
import { unsubUrl } from '@/lib/unsubscribe'

// Hardened newsletter/bulk sender shared by the admin send + the scheduled cron.
// Reaches ALL approved members (paginates past Supabase's 1k row cap), skips
// anyone on the unsubscribe list, throttles Resend batches, and injects a signed
// per-recipient unsubscribe link via the buildHtml callback.

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any

async function fetchApprovedMembers(adminDb: AdminDb): Promise<{ email: string; full_name: string | null }[]> {
  const out: { email: string; full_name: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await adminDb
      .from('profiles')
      .select('email, full_name')
      .eq('status', 'approved')
      .not('email', 'is', null)
      .range(from, from + 999)
    if (error || !data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function fetchUnsubscribed(adminDb: AdminDb): Promise<Set<string>> {
  const set = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await adminDb.from('email_unsubscribes').select('email').range(from, from + 999)
    if (error || !data || data.length === 0) break
    for (const r of data) set.add((r.email || '').toLowerCase().trim())
    if (data.length < 1000) break
  }
  return set
}

export async function sendNewsletter(
  adminDb: AdminDb,
  subject: string,
  // Returns the full email HTML for one recipient, given their first name and
  // a ready-to-use unsubscribe URL to place in the footer.
  buildHtml: (firstName: string, unsubscribeUrl: string) => string,
): Promise<{ sent: number; skipped: number; total: number }> {
  const [members, unsub] = await Promise.all([fetchApprovedMembers(adminDb), fetchUnsubscribed(adminDb)])

  const seen = new Set<string>()
  const recipients: { email: string; first: string }[] = []
  for (const m of members) {
    const e = (m.email || '').toLowerCase().trim()
    if (!isEmail(e) || unsub.has(e) || seen.has(e)) continue
    seen.add(e)
    recipients.push({ email: e, first: m.full_name?.split(' ')[0] ?? 'there' })
  }
  const skipped = members.length - recipients.length

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com'
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

  let sent = 0
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50)
    try {
      const { error } = await resend.batch.send(
        batch.map((r) => ({ from, replyTo, to: r.email, subject, html: buildHtml(r.first, unsubUrl(origin, r.email)) })),
      )
      if (!error) sent += batch.length
    } catch {
      /* skip this batch, keep going */
    }
    if (i + 50 < recipients.length) await sleep(500)
  }

  return { sent, skipped, total: recipients.length }
}
