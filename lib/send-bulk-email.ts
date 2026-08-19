// Shared "resolve an audience and batch-send an email to it" logic — used by
// the Email Members immediate-send action and its cron
// (app/api/cron/send-member-emails), and by the weekly event digest
// (app/api/cron/event-digest), so the batching/throttling behavior can't
// drift between them.
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { unsubUrl } from '@/lib/unsubscribe'
import { resolveAudience, type AudienceRole } from '@/lib/email-audience'

export async function sendBulkEmail(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    subject: string
    chapterId?: string | null
    role?: AudienceRole | null
    // Each recipient gets their own signed unsubscribe link, so the HTML/text
    // body is rendered per-recipient rather than built once up front.
    renderEmail: (unsubscribeUrl: string) => { html: string; text: string }
  },
): Promise<{ sent: number; skipped: number; total: number }> {
  const { recipients, skipped } = await resolveAudience(admin, opts.chapterId, opts.role)

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com'

  let sent = 0
  // Resend batch endpoint: up to 100 messages per call. Space calls out to
  // stay well under rate limits and to be gentler on domain reputation.
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const batch = chunk.map((to) => {
      const u = unsubUrl(origin, to)
      const { html, text } = opts.renderEmail(u)
      return { from, replyTo, to, subject: opts.subject, html, text }
    })
    try {
      const { error } = await resend.batch.send(batch)
      if (!error) sent += chunk.length
    } catch {
      /* skip this batch, keep going */
    }
    if (i + 100 < recipients.length) await new Promise((r) => setTimeout(r, 600))
  }

  return { sent, skipped, total: recipients.length }
}
