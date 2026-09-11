import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

// Processes the queue notify_on_forum_topic() (migration 090) enqueues on
// every new forum topic. Runs the actual fan-out to every approved member
// here, in small batches, outside the transaction that creates the topic —
// a single bulk insert of ~12,700 notification rows was directly confirmed
// to hit Postgres's statement_timeout, which is what made topic creation
// itself fail intermittently. BATCH_SIZE is kept well under that failure
// point (measured: 1,000 rows took ~3.5s including network overhead, so
// 300 leaves a wide safety margin per statement).
const BATCH_SIZE = 300
const MAX_TOPICS_PER_RUN = 5

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: pending } = await db
    .from('pending_topic_notifications')
    .select('id, topic_id, category_slug, category_name, title, author_id')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(MAX_TOPICS_PER_RUN)

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending topic notifications' })
  }

  let processedCount = 0
  let totalNotifications = 0

  for (const item of pending) {
    try {
      // Approved members, excluding the topic's own author, paginated so
      // each fan-out INSERT stays well under the row count that times out.
      let offset = 0
      let sent = 0
      for (;;) {
        const { data: page } = await db
          .from('profiles')
          .select('id')
          .eq('status', 'approved')
          .neq('id', item.author_id ?? '00000000-0000-0000-0000-000000000000')
          .range(offset, offset + BATCH_SIZE - 1)

        if (!page || page.length === 0) break

        const rows = page.map((p: { id: string }) => ({
          user_id: p.id,
          type: 'forum_topic',
          title: item.title,
          body: item.category_name,
          link: `/forum/${item.category_slug}/${item.topic_id}`,
        }))
        const { error: insertError } = await db.from('notifications').insert(rows)
        if (insertError) throw insertError

        sent += rows.length
        if (page.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }

      await db
        .from('pending_topic_notifications')
        .update({ processed_at: new Date().toISOString(), last_error: null })
        .eq('id', item.id)

      processedCount += 1
      totalNotifications += sent
    } catch (err) {
      console.error(`[process-topic-notifications] failed for topic ${item.topic_id}:`, err)
      await db
        .from('pending_topic_notifications')
        .update({ last_error: err instanceof Error ? err.message : String(err) })
        .eq('id', item.id)
      // Leave processed_at null so the next run retries it.
    }
  }

  return NextResponse.json({ processed: processedCount, notifications: totalNotifications, queued: pending.length })
}
