'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { researchTaNews, type TaNewsDraft } from '@/lib/ta-news'
import { revalidatePath } from 'next/cache'

async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Admins only')

  return user.id
}

export async function generateDraft(): Promise<TaNewsDraft> {
  await requireAdmin()
  return researchTaNews()
}

export async function postDraftToForum(
  categoryId: string,
  title: string,
  body: string,
): Promise<{ topicId: string; categorySlug: string }> {
  const userId = await requireAdmin()
  if (!title.trim() || !body.trim()) throw new Error('Title and body are required')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topic, error } = await (admin as any)
    .from('forum_topics')
    .insert({
      category_id: categoryId,
      author_id: userId,
      title: title.trim(),
      body: body.trim(),
      is_pinned: false,
      is_locked: false,
      views: 0,
    })
    .select('id, forum_categories(slug)')
    .single()

  if (error || !topic) throw new Error(error?.message ?? 'Failed to post topic')

  revalidatePath('/forum')

  return {
    topicId: topic.id as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categorySlug: (topic.forum_categories as any)?.slug as string,
  }
}
