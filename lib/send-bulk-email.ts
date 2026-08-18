// Shared "actually send an Email Members broadcast" logic — used by the
// immediate-send server action (app/admin/email/email-actions.ts) and the
// scheduled-send cron job (app/api/cron/send-member-emails), so the
// batching/throttling behavior can't drift between the two paths.
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBulkEmailHtml, buildBulkTextFromHtml } from '@/lib/email'
import { unsubUrl } from '@/lib/unsubscribe'
import { resolveAudience, type AudienceRole } from '@/lib/email-audience'

export async function sendBulkEmail(
  admin: ReturnType<typeof createAdminClient>,
  opts: { subject: string; bodyHtml: string; chapterId?: string | null; role?: AudienceRole | null },
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
      return {
        from,
        replyTo,
        to,
        subject: opts.subject,
        html: buildBulkEmailHtml({ bodyHtml: opts.bodyHtml, unsubscribeUrl: u }),
        text: buildBulkTextFromHtml(opts.bodyHtml, u),
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

  return { sent, skipped, total: recipients.length }
}
