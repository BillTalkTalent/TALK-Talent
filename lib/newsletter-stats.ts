// "Community pulse" stats block for the newsletter — real weekly counts,
// not copy an admin has to keep hand-updating. Cheap head-count queries
// only, no distinct-user set-building, since this runs once per send.

export type NewsletterStats = {
  newMembers: number
  forumPosts: number
  eventRsvps: number
  newJobs: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNewsletterStats(adminDb: any): Promise<NewsletterStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [newMembers, forumTopics, forumReplies, eventRsvps, eventRegs, newJobs] = await Promise.all([
    adminDb.from('profiles').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').eq('is_bot', false).gte('created_at', sevenDaysAgo),
    adminDb.from('forum_topics').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminDb.from('forum_replies').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminDb.from('event_rsvps').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminDb.from('event_registrations').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', sevenDaysAgo),
    adminDb.from('job_posts').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ])

  return {
    newMembers: newMembers.count ?? 0,
    forumPosts: (forumTopics.count ?? 0) + (forumReplies.count ?? 0),
    eventRsvps: (eventRsvps.count ?? 0) + (eventRegs.count ?? 0),
    newJobs: newJobs.count ?? 0,
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Renders nothing when every number is zero — a wall of zeroes reads worse
// than no block at all (e.g. a brand-new or very quiet community).
//
// Single compact line, not a boxed tile grid — this sits directly under the
// header's accent bar now, and needs to read as part of that masthead
// rather than a separate card with its own vertical weight.
export function buildStatsBlock(stats: NewsletterStats): string {
  const items = [
    { n: stats.newMembers, singular: 'new member', plural: 'new members' },
    { n: stats.forumPosts, singular: 'forum post', plural: 'forum posts' },
    { n: stats.eventRsvps, singular: 'event RSVP', plural: 'event RSVPs' },
    { n: stats.newJobs, singular: 'new job', plural: 'new jobs' },
  ].filter(t => t.n > 0)
  if (items.length === 0) return ''

  const parts = items
    .map(t => `<strong style="color:#111827;">${t.n.toLocaleString()}</strong> ${esc(t.n === 1 ? t.singular : t.plural)}`)
    .join(' &nbsp;&middot;&nbsp; ')

  return `
  <tr><td style="background:#f9fafb;padding:11px 36px;text-align:center;">
    <p style="margin:0;font-size:12.5px;color:#6b7280;line-height:1.5;">
      <span style="font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;font-size:10px;">This week in TALK</span>
      &nbsp;&middot;&nbsp; ${parts}
    </p>
  </td></tr>`
}
