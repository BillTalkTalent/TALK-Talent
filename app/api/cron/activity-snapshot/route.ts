import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Writes one row/day of the north-star numbers shown on /admin/activity,
// so that page can plot a real trend instead of a single point-in-time
// snapshot. Mirrors the same "engaged" definition used there: a member who
// has ever posted, replied, RSVP'd, chatted, voted, posted a job, or
// joined mentorship — not just logged in.
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const allUsers: { id: string; last_sign_in_at: string | null }[] = []
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    allUsers.push(...users.map(u => ({ id: u.id, last_sign_in_at: u.last_sign_in_at ?? null })))
    if (users.length < 1000) break
  }

  const { data: profiles } = await admin.from('profiles').select('id, status, is_bot')
  const profileMap: Record<string, { status: string; is_bot?: boolean }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p as { status: string; is_bot?: boolean }

  const approvedIds = new Set(
    allUsers.filter(u => !profileMap[u.id]?.is_bot && profileMap[u.id]?.status === 'approved').map(u => u.id)
  )

  const activeToday = allUsers.filter(u => approvedIds.has(u.id) && u.last_sign_in_at && new Date(u.last_sign_in_at) > oneDayAgo).length
  const activeThisWeek = allUsers.filter(u => approvedIds.has(u.id) && u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo).length
  const activeThisMonth = allUsers.filter(u => approvedIds.has(u.id) && u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo).length

  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()
  const engagedIds = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const [topics, replies, rsvps, regs, chats, votes, jobs, connections, requests, reviews] = await Promise.all([
    db.from('forum_topics').select('author_id').limit(5000),
    db.from('forum_replies').select('author_id').limit(5000),
    db.from('event_rsvps').select('user_id').limit(5000),
    db.from('event_registrations').select('user_id').eq('status', 'completed').limit(5000),
    db.from('chat_messages').select('user_id').limit(5000),
    db.from('poll_votes').select('user_id').limit(5000),
    db.from('job_posts').select('poster_id').limit(5000),
    db.from('mentorship_connections').select('mentor_id, mentee_id').limit(5000),
    db.from('mentorship_requests').select('requester_id').limit(5000),
    db.from('vendor_reviews').select('reviewer_id').limit(5000),
  ])

  for (const r of topics.data ?? []) if (r.author_id) engagedIds.add(r.author_id)
  for (const r of replies.data ?? []) if (r.author_id) engagedIds.add(r.author_id)
  for (const r of rsvps.data ?? []) if (r.user_id) engagedIds.add(r.user_id)
  for (const r of regs.data ?? []) if (r.user_id) engagedIds.add(r.user_id)
  for (const r of chats.data ?? []) if (r.user_id) engagedIds.add(r.user_id)
  for (const r of votes.data ?? []) if (r.user_id) engagedIds.add(r.user_id)
  for (const r of jobs.data ?? []) if (r.poster_id) engagedIds.add(r.poster_id)
  for (const r of connections.data ?? []) {
    if (r.mentor_id) engagedIds.add(r.mentor_id)
    if (r.mentee_id) engagedIds.add(r.mentee_id)
  }
  for (const r of requests.data ?? []) if (r.requester_id) engagedIds.add(r.requester_id)
  for (const r of reviews.data ?? []) if (r.reviewer_id) engagedIds.add(r.reviewer_id)

  const engagedMembers = [...engagedIds].filter(id => approvedIds.has(id)).length
  const approvedMembers = approvedIds.size

  const engagementRate = approvedMembers > 0 ? (engagedMembers / approvedMembers) * 100 : 0
  const usageRate30d = approvedMembers > 0 ? (activeThisMonth / approvedMembers) * 100 : 0
  const stickinessRate = activeThisMonth > 0 ? (activeToday / activeThisMonth) * 100 : 0

  const snapshotDate = now.toISOString().slice(0, 10)

  const { error } = await db.from('activity_snapshots').upsert({
    snapshot_date: snapshotDate,
    approved_members: approvedMembers,
    engaged_members: engagedMembers,
    active_today: activeToday,
    active_this_week: activeThisWeek,
    active_this_month: activeThisMonth,
    engagement_rate: Math.round(engagementRate * 10) / 10,
    usage_rate_30d: Math.round(usageRate30d * 10) / 10,
    stickiness_rate: Math.round(stickinessRate * 10) / 10,
  }, { onConflict: 'snapshot_date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ snapshot_date: snapshotDate, approved_members: approvedMembers, engaged_members: engagedMembers })
}
