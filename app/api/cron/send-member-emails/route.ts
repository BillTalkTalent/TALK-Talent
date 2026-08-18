import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBulkEmail } from '@/lib/send-bulk-email'
import type { AudienceRole } from '@/lib/email-audience'

export const maxDuration = 300

// Runs every 15 minutes (vercel.json) — drains any "Email Members" broadcast
// whose scheduled_for has arrived. The 15-minute lookback matches the cron
// interval so nothing scheduled between runs gets skipped.
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  const now = new Date()
  const lookback = new Date(now.getTime() - 15 * 60 * 1000)

  const { data: due } = await adminDb
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'scheduled')
    .gte('scheduled_for', lookback.toISOString())
    .lte('scheduled_for', now.toISOString())

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: [] })
  }

  const results = []
  for (const row of due) {
    try {
      const { sent, skipped, total } = await sendBulkEmail(admin, {
        subject: row.subject,
        bodyHtml: row.body_html,
        chapterId: row.chapter_id,
        role: row.audience_role as AudienceRole | null,
      })
      await adminDb.from('scheduled_emails').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: sent,
        skipped_count: skipped,
      }).eq('id', row.id)
      results.push({ id: row.id, sent, skipped, total })
    } catch (err) {
      await adminDb.from('scheduled_emails').update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }).eq('id', row.id)
      results.push({ id: row.id, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return NextResponse.json({ sent: results })
}
