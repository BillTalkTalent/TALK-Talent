'use server'

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildBulkEmail, buildBulkText } from '@/lib/email'
import { unsubUrl } from '@/lib/unsubscribe'
import { requireSuperAdmin } from '@/lib/admin-auth'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: me } = await supabase.from('profiles').select('role, email').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
  return { email: (me?.email as string | null) ?? user.email ?? null }
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Chapter member ids for a chapter-scoped send — null chapterId means
// "everyone," no membership filter applied.
async function fetchChapterMemberIds(admin: ReturnType<typeof createAdminClient>, chapterId: string): Promise<string[]> {
  const { data } = await admin.from('chapter_memberships').select('user_id').eq('chapter_id', chapterId)
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

// Only role that's meaningful to target directly — everyone else is 'member'
// or 'admin', and admins aren't a mailing audience in their own right.
export type AudienceRole = 'board_member'

// Pull every approved member's email, paginating past Supabase's 1k row cap.
// Restricts to a single chapter's members when chapterId is given, and/or to
// a single role (e.g. board members) when role is given — the two combine,
// so "board members in the Boston chapter" is just both filters at once.
async function fetchApprovedEmails(
  admin: ReturnType<typeof createAdminClient>,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<string[]> {
  let memberIdFilter: string[] | null = null
  if (chapterId) {
    memberIdFilter = await fetchChapterMemberIds(admin, chapterId)
    if (memberIdFilter.length === 0) return []
  }

  const emails = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from('profiles')
      .select('email')
      .eq('status', 'approved')
      .eq('is_bot', false)
      .not('email', 'is', null)
    if (memberIdFilter) query = query.in('id', memberIdFilter)
    if (role) query = query.eq('role', role)
    const { data, error } = await query.range(from, from + pageSize - 1)
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

// How many members a send would actually reach (approved minus unsubscribed),
// optionally narrowed to one chapter and/or one role.
export async function getAudienceCount(chapterId?: string | null, role?: AudienceRole | null): Promise<{ total: number }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [emails, unsub] = await Promise.all([fetchApprovedEmails(admin, chapterId, role), fetchUnsubscribed(admin)])
  const total = emails.filter((e) => !unsub.has(e)).length
  return { total }
}

export type ChapterOption = { id: string; name: string; slug: string; memberCount: number }

// Chapters + how many approved members are actually reachable in each —
// powers the "Send to" audience picker so admins can target a specific
// local chapter for local events instead of blasting everyone.
export async function getChapters(): Promise<ChapterOption[]> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: chapters } = await admin
    .from('chapters')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })
  if (!chapters) return []

  const withCounts = await Promise.all(
    (chapters as { id: string; name: string; slug: string }[]).map(async (c) => {
      const { total } = await getAudienceCount(c.id)
      return { ...c, memberCount: total }
    })
  )
  return withCounts
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

// Broadcast to approved members (minus unsubscribes), in throttled batches.
// Narrowed to one chapter's members when chapterId is given, and/or to one
// role (e.g. board members only) when role is given — otherwise reaches
// everyone.
export async function sendToAllMembers(
  subject: string,
  body: string,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<{ ok: boolean; sent: number; skipped: number; total: number; error?: string }> {
  // Blasting literally everyone is reserved for the super admin. A send
  // narrowed to a chapter and/or board members only is a smaller, more
  // deliberate audience — any admin can send those.
  if (!chapterId && !role) {
    await requireSuperAdmin()
  } else {
    await requireAdmin()
  }
  const subj = subject.trim()
  const bodyText = body.trim()
  if (!subj || !bodyText) return { ok: false, sent: 0, skipped: 0, total: 0, error: 'Subject and message are required.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [allEmails, unsub] = await Promise.all([fetchApprovedEmails(admin, chapterId, role), fetchUnsubscribed(admin)])
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
