import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureChapterPromptBotProfile } from '@/lib/bot-account'
import { CHAPTER_PROMPT_BANK, pickWeeklyPrompt } from '@/lib/chapter-prompts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Weekly, one prompt per topic-based chapter (Executive & Leadership, DEI,
// Tech & AI, etc.) — those categories mostly sit empty; this gives members
// something to react to instead of needing to originate a topic themselves.
// Same "disclosed bot account posts into a real category" shape as the TA
// news digest (app/api/cron/ta-news-digest), just a different bot identity
// and content source (a rotating prompt bank instead of researched news).
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any
  const botId = await ensureChapterPromptBotProfile()

  const slugs = Object.keys(CHAPTER_PROMPT_BANK)
  const { data: categories } = await adminDb
    .from('forum_categories')
    .select('id, slug, name')
    .in('slug', slugs)

  const weekStart = new Date()
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  weekStart.setUTCHours(0, 0, 0, 0)

  const posted: string[] = []
  const skipped: string[] = []

  for (const category of categories ?? []) {
    // Already posted this week? Don't double up if the cron gets re-fired.
    const { count } = await adminDb
      .from('forum_topics')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id)
      .eq('author_id', botId)
      .gte('created_at', weekStart.toISOString())

    if ((count ?? 0) > 0) {
      skipped.push(category.slug)
      continue
    }

    const prompt = pickWeeklyPrompt(category.slug)
    if (!prompt) {
      skipped.push(category.slug)
      continue
    }

    const { error } = await adminDb.from('forum_topics').insert({
      category_id: category.id,
      author_id: botId,
      title: prompt,
      body: `This week's discussion prompt for ${category.name}. Reply below — real answers from the community, not a survey.`,
      is_pinned: false,
      is_locked: false,
      views: 0,
    })

    if (!error) posted.push(category.slug)
  }

  revalidatePath('/forum')
  for (const slug of posted) revalidatePath(`/forum/${slug}`)

  return NextResponse.json({ posted, skipped })
}
