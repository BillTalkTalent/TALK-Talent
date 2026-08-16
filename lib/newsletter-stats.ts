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
export function buildStatsBlock(stats: NewsletterStats): string {
  const tiles = [
    { n: stats.newMembers, label: 'New members' },
    { n: stats.forumPosts, label: 'Forum posts' },
    { n: stats.eventRsvps, label: 'Event RSVPs' },
    { n: stats.newJobs, label: 'New jobs' },
  ]
  if (tiles.every(t => t.n === 0)) return ''

  const cells = tiles.map(t => `
    <td width="25%" align="center" style="padding:14px 4px;">
      <div style="font-size:22px;font-weight:900;color:#111827;line-height:1;">${t.n.toLocaleString()}</div>
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;margin-top:5px;">${esc(t.label)}</div>
    </td>`).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="background:#f9fafb;border:1px solid #eef0f2;border-radius:12px;">
      <p style="margin:0;padding:14px 20px 0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">This week in TALK</p>
      <table cellpadding="0" cellspacing="0" width="100%"><tr>${cells}</tr></table>
    </div>
  </td></tr>`
}
