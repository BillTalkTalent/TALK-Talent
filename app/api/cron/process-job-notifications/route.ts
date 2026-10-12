import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPrefs, wants } from '@/lib/notification-prefs'

export const maxDuration = 300

// Processes the queue notify_on_new_job() (migration 101) enqueues on every
// new job post. Same batching rationale as process-topic-notifications /
// process-poll-notifications: a bulk insert of ~12,700 notification rows
// was directly confirmed elsewhere in this codebase to hit Postgres's
// statement_timeout.
const BATCH_SIZE = 300
const MAX_JOBS_PER_RUN = 5

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: pending } = await db
    .from('pending_job_notifications')
    .select('id, job_id, title, company, poster_id')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(MAX_JOBS_PER_RUN)

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending job notifications' })
  }

  let processedCount = 0
  let totalNotifications = 0

  for (const item of pending) {
    try {
      const posterId = item.poster_id ?? '00000000-0000-0000-0000-000000000000'
      const link = `/jobs/${item.job_id}`
      const titleShort = item.title.length > 50 ? item.title.slice(0, 47) + '…' : item.title
      let sent = 0
      let offset = 0

      for (;;) {
        const { data: page } = await db
          .from('profiles')
          .select('id')
          .eq('status', 'approved')
          .eq('is_bot', false)
          .neq('id', posterId)
          .range(offset, offset + BATCH_SIZE - 1)

        if (!page || page.length === 0) break

        const ids = page.map((p: { id: string }) => p.id)
        const prefs = await loadPrefs(db, ids)
        const rows = ids
          .filter((id: string) => wants(prefs, id, 'push_new_jobs'))
          .map((id: string) => ({
            user_id: id,
            type: 'new_job',
            title: `New job: ${titleShort} at ${item.company}`,
            body: null,
            link,
          }))

        if (rows.length > 0) {
          const { error: insertError } = await db.from('notifications').insert(rows)
          if (insertError) throw insertError
        }

        sent += rows.length
        if (page.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }

      await db
        .from('pending_job_notifications')
        .update({ processed_at: new Date().toISOString(), last_error: null })
        .eq('id', item.id)

      processedCount += 1
      totalNotifications += sent
    } catch (err) {
      console.error(`[process-job-notifications] failed for job ${item.job_id}:`, err)
      await db
        .from('pending_job_notifications')
        .update({ last_error: err instanceof Error ? err.message : String(err) })
        .eq('id', item.id)
      // Leave processed_at null so the next run retries it.
    }
  }

  return NextResponse.json({ processed: processedCount, notifications: totalNotifications, queued: pending.length })
}
