import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureDigestBotProfile } from '@/lib/bot-account'
import { researchTaNews } from '@/lib/ta-news'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CATEGORY_SLUG = 'industry-news'

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const [botId, { data: category }] = await Promise.all([
    ensureDigestBotProfile(),
    admin.from('forum_categories').select('id').eq('slug', CATEGORY_SLUG).single(),
  ])

  if (!category) {
    return NextResponse.json({ error: `Forum category '${CATEGORY_SLUG}' not found` }, { status: 500 })
  }

  const draft = await researchTaNews()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topic, error } = await (admin as any)
    .from('forum_topics')
    .insert({
      category_id: category.id,
      author_id: botId,
      title: draft.title,
      body: draft.body,
      is_pinned: false,
      is_locked: false,
      views: 0,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/forum')
  revalidatePath(`/forum/${CATEGORY_SLUG}`)

  return NextResponse.json({ posted: true, topicId: topic.id, title: draft.title })
}
