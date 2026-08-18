'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildBulkEmailHtml, buildBulkTextFromHtml } from '@/lib/email'
import { unsubUrl } from '@/lib/unsubscribe'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { resolveAudience, type AudienceRole } from '@/lib/email-audience'
import { sendBulkEmail } from '@/lib/send-bulk-email'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: me } = await supabase.from('profiles').select('role, email').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
  return { id: user.id, email: (me?.email as string | null) ?? user.email ?? null }
}

// Sending to literally everyone (no chapter, no role filter) is reserved for
// the super admin — a send narrowed to a chapter and/or board members only
// is a smaller, more deliberate audience any admin can send or schedule.
async function requireSendAccess(chapterId?: string | null, role?: AudienceRole | null) {
  if (!chapterId && !role) {
    return requireSuperAdmin()
  }
  const { id } = await requireAdmin()
  return id
}

// How many members a send would actually reach (approved minus unsubscribed),
// optionally narrowed to one chapter and/or one role.
export async function getAudienceCount(chapterId?: string | null, role?: AudienceRole | null): Promise<{ total: number }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { recipients } = await resolveAudience(admin, chapterId, role)
  return { total: recipients.length }
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
export async function sendTestEmail(subject: string, bodyHtml: string): Promise<{ ok: boolean; to?: string }> {
  const { email } = await requireAdmin()
  if (!email) return { ok: false }
  const subj = subject.trim()
  if (!subj || !isMeaningfulHtml(bodyHtml)) return { ok: false }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const u = unsubUrl(origin, email)
  try {
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: email,
      subject: `[TEST] ${subj}`,
      html: buildBulkEmailHtml({ bodyHtml, unsubscribeUrl: u }),
      text: buildBulkTextFromHtml(bodyHtml, u),
    })
    return { ok: true, to: email }
  } catch {
    return { ok: false }
  }
}

function isMeaningfulHtml(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').trim().length > 0
}

// Broadcast to approved members (minus unsubscribes) right now, in throttled
// batches. Narrowed to one chapter's members when chapterId is given, and/or
// to one role (e.g. board members only) when role is given — otherwise
// reaches everyone.
export async function sendToAllMembers(
  subject: string,
  bodyHtml: string,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<{ ok: boolean; sent: number; skipped: number; total: number; error?: string }> {
  await requireSendAccess(chapterId, role)
  const subj = subject.trim()
  if (!subj || !isMeaningfulHtml(bodyHtml)) {
    return { ok: false, sent: 0, skipped: 0, total: 0, error: 'Subject and message are required.' }
  }

  const admin = createAdminClient()
  const { sent, skipped, total } = await sendBulkEmail(admin, { subject: subj, bodyHtml, chapterId, role })
  return { ok: sent > 0, sent, skipped, total }
}

export type ScheduledEmail = {
  id: string
  subject: string
  body_html: string
  chapter_id: string | null
  audience_role: AudienceRole | null
  scheduled_for: string
  created_at: string
}

// Queues a send for later instead of sending immediately — picked up by
// app/api/cron/send-member-emails on its next run (every 15 minutes).
export async function scheduleMemberEmail(
  subject: string,
  bodyHtml: string,
  scheduledForIso: string,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<{ ok: boolean; error?: string }> {
  const createdBy = await requireSendAccess(chapterId, role)
  const subj = subject.trim()
  if (!subj || !isMeaningfulHtml(bodyHtml)) {
    return { ok: false, error: 'Subject and message are required.' }
  }
  const scheduledFor = new Date(scheduledForIso)
  if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
    return { ok: false, error: 'Pick a time in the future.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('scheduled_emails').insert({
    subject: subj,
    body_html: bodyHtml,
    chapter_id: chapterId ?? null,
    audience_role: role ?? null,
    scheduled_for: scheduledFor.toISOString(),
    created_by: createdBy,
  })
  if (error) return { ok: false, error: `Failed to schedule: ${error.message}` }

  revalidatePath('/admin/email')
  return { ok: true }
}

// Upcoming (not yet sent) scheduled sends, soonest first — powers the
// "Scheduled" list on the Email Members page.
export async function getScheduledEmails(): Promise<ScheduledEmail[]> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('scheduled_emails')
    .select('id, subject, body_html, chapter_id, audience_role, scheduled_for, created_at')
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true })
  return data ?? []
}

export async function cancelScheduledEmail(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: row } = await admin
    .from('scheduled_emails')
    .select('chapter_id, audience_role, status')
    .eq('id', id)
    .single()
  if (!row) return { ok: false, error: 'Not found.' }
  if (row.status !== 'scheduled') return { ok: false, error: 'Already sent or canceled.' }

  // Canceling a full-membership send needs the same authority that would've
  // been required to create or send it.
  await requireSendAccess(row.chapter_id, row.audience_role)

  const { error } = await admin.from('scheduled_emails').update({ status: 'canceled' }).eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/email')
  return { ok: true }
}
