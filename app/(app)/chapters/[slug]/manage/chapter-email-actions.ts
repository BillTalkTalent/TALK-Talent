'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBulkEmailHtml, buildBulkTextFromHtml } from '@/lib/email'
import { unsubUrl } from '@/lib/unsubscribe'
import { sendBulkEmail } from '@/lib/send-bulk-email'
import { resolveAudience } from '@/lib/email-audience'
import { Resend } from 'resend'

// Every action here is scoped to exactly one chapter, resolved server-side
// from chapterId — there's no chapter picker on this surface the way the
// admin composer has one, so there's nothing for a caller to widen.
async function requireChapterAccess(chapterId: string): Promise<{ id: string; email: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: me } = await supabase.from('profiles').select('role, email').eq('id', user.id).single()
  if (me?.role === 'admin') return { id: user.id, email: (me.email as string | null) ?? user.email ?? null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leadRow } = await (supabase as any)
    .from('chapter_leads')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!leadRow) throw new Error('Forbidden')

  return { id: user.id, email: (me?.email as string | null) ?? user.email ?? null }
}

function isMeaningfulHtml(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').trim().length > 0
}

export async function sendTestChapterEmail(chapterId: string, subject: string, bodyHtml: string): Promise<{ ok: boolean; to?: string }> {
  const { email } = await requireChapterAccess(chapterId)
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

export async function sendChapterEmail(
  chapterId: string,
  subject: string,
  bodyHtml: string,
): Promise<{ ok: boolean; sent: number; skipped: number; total: number; error?: string }> {
  await requireChapterAccess(chapterId)
  const subj = subject.trim()
  if (!subj || !isMeaningfulHtml(bodyHtml)) {
    return { ok: false, sent: 0, skipped: 0, total: 0, error: 'Subject and message are required.' }
  }

  const admin = createAdminClient()
  const { sent, skipped, total } = await sendBulkEmail(admin, {
    subject: subj,
    chapterId,
    role: null,
    renderEmail: (u) => ({
      html: buildBulkEmailHtml({ bodyHtml, unsubscribeUrl: u }),
      text: buildBulkTextFromHtml(bodyHtml, u),
    }),
  })
  return { ok: sent > 0, sent, skipped, total }
}

export async function getChapterAudienceCount(chapterId: string): Promise<{ total: number }> {
  await requireChapterAccess(chapterId)
  const admin = createAdminClient()
  const { recipients } = await resolveAudience(admin, chapterId, null)
  return { total: recipients.length }
}
