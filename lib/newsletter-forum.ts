// "From the forum" newsletter block — a real teaser from this week's forum
// activity, or (when there isn't any) a prompt to be the first to post
// instead of just hiding. Forum engagement is thin right now (most weeks
// have a couple of organic topics, half get zero replies) — this section is
// partly a fix for that, so it needs to invite participation even on a
// quiet week rather than pretend the forum doesn't exist.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type ForumTeaser = {
  id: string
  title: string
  body: string
  authorName: string | null
  categoryName: string
  categorySlug: string
  replyCount: number
} | null

const LEGACY_CATEGORY_SLUG = 'legacy-national'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getForumTeaserForNewsletter(adminDb: any, windowDays = 7): Promise<ForumTeaser> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates } = await adminDb
    .from('forum_topics')
    .select('id, title, body, created_at, profiles(full_name, is_bot), forum_categories(name, slug)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const real = (candidates ?? []).filter((t: any) =>
    !t.profiles?.is_bot && t.forum_categories?.slug !== LEGACY_CATEGORY_SLUG
  )
  if (real.length === 0) return null

  const { data: replyRows } = await adminDb
    .from('forum_replies')
    .select('topic_id')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .in('topic_id', real.map((t: any) => t.id))

  const replyCounts = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (replyRows ?? []) as any[]) {
    replyCounts.set(r.topic_id, (replyCounts.get(r.topic_id) ?? 0) + 1)
  }

  // Most-replied topic wins (the real engagement signal); ties/all-zero fall
  // back to most recent, since `real` is already sorted newest-first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winner = [...real].sort((a: any, b: any) =>
    (replyCounts.get(b.id) ?? 0) - (replyCounts.get(a.id) ?? 0)
  )[0]

  return {
    id: winner.id,
    title: winner.title,
    body: winner.body,
    authorName: winner.profiles?.full_name ?? null,
    categoryName: winner.forum_categories?.name ?? 'General Discussion',
    categorySlug: winner.forum_categories?.slug ?? 'general',
    replyCount: replyCounts.get(winner.id) ?? 0,
  }
}

export function buildForumTeaserBlock(teaser: ForumTeaser, origin: string): string {
  const card = (inner: string) => `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eef0f2;border-radius:14px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#E8503A,#F07058);height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:20px 22px;">${inner}</td></tr>
    </table>
  </td></tr>`

  const eyebrow = `
    <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">From the forum</p>
    <p style="margin:4px 0 16px;font-size:13px;font-weight:600;color:#0F1F35;">Real conversations from TALK members this week.</p>`

  if (!teaser) {
    return card(`
      ${eyebrow}
      <p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.6;">Quiet week in the forum — nobody's posted yet. Be the first to ask a question or share what's on your mind.</p>
      <a href="${origin}/forum/new" style="display:inline-block;font-size:12.5px;font-weight:700;color:#E8503A;text-decoration:none;">Start a conversation &rarr;</a>
    `)
  }

  const snippet = teaser.body.length > 180 ? `${teaser.body.slice(0, 177).trim()}…` : teaser.body
  const url = `${origin}/forum/${teaser.categorySlug}/${teaser.id}`
  const replyBadge = teaser.replyCount > 0
    ? `<span style="display:inline-block;background:#fdece8;color:#E8503A;font-size:9px;font-weight:800;letter-spacing:0.02em;padding:2px 7px;border-radius:20px;margin-bottom:6px;">${teaser.replyCount} repl${teaser.replyCount === 1 ? 'y' : 'ies'}</span><br>`
    : ''

  return card(`
    ${eyebrow}
    ${replyBadge}
    <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(teaser.title)}</a>
    <p style="margin:3px 0 10px;font-size:12px;color:#6b7280;">${esc(teaser.authorName ?? 'A TALK member')} &middot; ${esc(teaser.categoryName)}</p>
    <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.6;">${esc(snippet)}</p>
    <a href="${url}" style="display:inline-block;font-size:12.5px;font-weight:700;color:#E8503A;text-decoration:none;">Join the conversation &rarr;</a>
  `)
}
