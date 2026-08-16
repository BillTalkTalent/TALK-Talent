import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Users, LogIn, UserPlus, Clock, Activity, MessageSquare, CalendarDays,
  Briefcase, MessagesSquare, BarChart3, GraduationCap, Building2,
  Sparkles, TrendingUp, Flame, AlertTriangle, Rocket, Compass, LineChart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AuthUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  confirmed_at: string | null
}

type Profile = {
  id: string
  full_name: string | null
  status: string
  role: string
  is_bot?: boolean
}

// auth.admin.listUsers caps each page at 1000 and defaults to page 1 only —
// paginate through all of them rather than silently truncating stats once
// the community passes that many signups.
async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>): Promise<AuthUser[]> {
  const perPage = 1000
  const all: AuthUser[] = []
  for (let page = 1; page <= 20; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).auth.admin.listUsers({ page, perPage })
    const users: AuthUser[] = data?.users ?? []
    all.push(...users)
    if (users.length < perPage) break
  }
  return all
}

// PostgREST silently caps any unpaginated select at 1000 rows — with
// 12,700+ profiles, a plain .select() here was only ever returning the
// first 1000, which quietly undercounted every metric derived from
// member status (approved counts, engagement rate, at-risk, activation).
// Page through with .range() instead.
async function listAllProfiles(admin: ReturnType<typeof createAdminClient>): Promise<Profile[]> {
  const pageSize = 1000
  const all: Profile[] = []
  for (let from = 0; ; from += pageSize) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, status, role, is_bot')
      .range(from, from + pageSize - 1)
    const rows: Profile[] = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
  }
  return all
}

export default async function AdminActivityPage() {
  const admin = createAdminClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    authUsers,
    profiles,
    forumTopicsTotal,
    forumTopics30d,
    forumReplies30d,
    upcomingEventsCount,
    eventRsvps30d,
    eventRegistrations30d,
    jobsActive,
    jobs30d,
    chatMessages30d,
    pollsActive,
    pollVotes30d,
    mentorshipActive,
    mentorshipPending,
    vendorReviews30d,
    engagedForumTopics,
    engagedForumReplies,
    engagedEventRsvps,
    engagedEventRegs,
    engagedChatMessages,
    engagedPollVotes,
    engagedJobPosts,
    engagedMentorshipConnections,
    engagedMentorshipRequests,
    engagedVendorReviews,
    pageViews30d,
    dailySnapshots,
  ] = await Promise.all([
    listAllAuthUsers(admin),
    listAllProfiles(admin),
    admin.from('forum_topics').select('id', { count: 'exact', head: true }),
    admin.from('forum_topics').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('forum_replies').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('is_test', false).gte('event_date', now.toISOString()),
    admin.from('event_rsvps').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('event_registrations').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    admin.from('job_posts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('job_posts').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('chat_messages').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('polls').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('poll_votes').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('mentorship_connections').select('id', { count: 'exact', head: true }).eq('is_active', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('mentorship_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('vendor_reviews').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    // Lifetime "who has ever actually done something", with timestamps —
    // feeds the engaged-members north star metric, the activation-rate KPI
    // (first action vs. join date), and the "most engaging areas" ranking
    // (same rows, filtered to the last 30 days in JS below). Ordered
    // ascending so a 5000-row cap keeps the earliest actions, which is what
    // the activation-rate check needs.
    admin.from('forum_topics').select('author_id, created_at').order('created_at', { ascending: true }).limit(5000),
    admin.from('forum_replies').select('author_id, created_at').order('created_at', { ascending: true }).limit(5000),
    admin.from('event_rsvps').select('user_id, created_at').order('created_at', { ascending: true }).limit(5000),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('event_registrations').select('user_id, created_at').eq('status', 'completed').order('created_at', { ascending: true }).limit(5000),
    admin.from('chat_messages').select('user_id, created_at').order('created_at', { ascending: true }).limit(5000),
    admin.from('poll_votes').select('user_id, created_at').order('created_at', { ascending: true }).limit(5000),
    admin.from('job_posts').select('poster_id, created_at').order('created_at', { ascending: true }).limit(5000),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('mentorship_connections').select('mentor_id, mentee_id, connected_at').order('connected_at', { ascending: true }).limit(5000),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('mentorship_requests').select('requester_id, created_at').order('created_at', { ascending: true }).limit(5000),
    admin.from('vendor_reviews').select('reviewer_id, created_at').order('created_at', { ascending: true }).limit(5000),
    // Route-level navigation, last 30 days — "where members are going".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('page_views').select('user_id, path, created_at').gte('created_at', thirtyDaysAgo).limit(20000),
    // Daily north-star rollups — powers the retention/trend view.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('activity_snapshots').select('snapshot_date, engagement_rate, usage_rate_30d, stickiness_rate').order('snapshot_date', { ascending: true }).limit(30),
  ])

  const profileMap: Record<string, Profile> = {}
  for (const p of profiles) profileMap[p.id] = p as Profile

  // Merge auth + profile data, drop the disclosed digest bot — it's not a
  // real member and skews every stat below (signups, active-this-week, etc).
  const members = authUsers
    .filter((u) => !profileMap[u.id]?.is_bot)
    .map((u) => ({
      id: u.id,
      email: u.email,
      full_name: profileMap[u.id]?.full_name ?? null,
      status: profileMap[u.id]?.status ?? 'unknown',
      role: profileMap[u.id]?.role ?? 'member',
      joined_at: u.created_at,
      last_login: u.last_sign_in_at,
      confirmed: !!u.confirmed_at,
    }))
    .sort((a, b) => {
      const aTime = a.last_login ?? a.joined_at
      const bTime = b.last_login ?? b.joined_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  // The full member list can run into the thousands — rendering all of it
  // as one HTML table is what was making this page slow to load. This
  // dashboard is for the activity deep-dive, not member management (that's
  // /admin/members, which has its own paginated table), so only show the
  // most-recently-active slice here and link out for the rest.
  const recentMembers = members.slice(0, 100)

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoDate = new Date(thirtyDaysAgo)

  const signupsToday = members.filter(m => new Date(m.joined_at) > oneDayAgo).length
  const signupsThisWeek = members.filter(m => new Date(m.joined_at) > sevenDaysAgo).length
  const activeToday = members.filter(m => m.last_login && new Date(m.last_login) > oneDayAgo).length
  const activeThisWeek = members.filter(m => m.last_login && new Date(m.last_login) > sevenDaysAgo).length
  const activeThisMonth = members.filter(m => m.last_login && new Date(m.last_login) > thirtyDaysAgoDate).length
  const neverLoggedIn = members.filter(m => !m.last_login).length
  const approvedMembers = members.filter(m => m.status === 'approved').length
  const approvedMemberIds = new Set(members.filter(m => m.status === 'approved').map(m => m.id))

  // North star: "engaged" = has ever posted, replied, RSVP'd, chatted,
  // voted, posted a job, or joined mentorship — not just logged in.
  // Same pass also tracks each member's first-ever action (for the
  // activation-rate KPI) and buckets last-30-day actions by feature (for
  // the "most engaging areas" ranking below).
  const engagedIds = new Set<string>()
  const firstActionAt: Record<string, number> = {}
  const featureBuckets = {
    Forum: new Set<string>(),
    Events: new Set<string>(),
    Jobs: new Set<string>(),
    Chat: new Set<string>(),
    Polls: new Set<string>(),
    Mentorship: new Set<string>(),
    Vendors: new Set<string>(),
  }
  const thirtyDaysAgoMs = thirtyDaysAgoDate.getTime()

  function noteAction(userId: string | null | undefined, createdAt: string | null | undefined, bucket?: keyof typeof featureBuckets) {
    if (!userId) return
    engagedIds.add(userId)
    if (!createdAt) return
    const t = new Date(createdAt).getTime()
    if (!firstActionAt[userId] || t < firstActionAt[userId]) firstActionAt[userId] = t
    if (bucket && t >= thirtyDaysAgoMs) featureBuckets[bucket].add(userId)
  }

  for (const r of engagedForumTopics.data ?? []) noteAction(r.author_id, r.created_at, 'Forum')
  for (const r of engagedForumReplies.data ?? []) noteAction(r.author_id, r.created_at, 'Forum')
  for (const r of engagedEventRsvps.data ?? []) noteAction(r.user_id, r.created_at, 'Events')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (engagedEventRegs.data ?? []) as any[]) noteAction(r.user_id, r.created_at, 'Events')
  for (const r of engagedChatMessages.data ?? []) noteAction(r.user_id, r.created_at, 'Chat')
  for (const r of engagedPollVotes.data ?? []) noteAction(r.user_id, r.created_at, 'Polls')
  for (const r of engagedJobPosts.data ?? []) noteAction(r.poster_id, r.created_at, 'Jobs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (engagedMentorshipConnections.data ?? []) as any[]) {
    noteAction(r.mentor_id, r.connected_at, 'Mentorship')
    noteAction(r.mentee_id, r.connected_at, 'Mentorship')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (engagedMentorshipRequests.data ?? []) as any[]) noteAction(r.requester_id, r.created_at, 'Mentorship')
  for (const r of engagedVendorReviews.data ?? []) noteAction(r.reviewer_id, r.created_at, 'Vendors')

  const engagedMembersCount = [...engagedIds].filter(id => approvedMemberIds.has(id)).length
  const engagementRate = approvedMembers > 0 ? (engagedMembersCount / approvedMembers) * 100 : 0
  const usageRate30d = approvedMembers > 0 ? (activeThisMonth / approvedMembers) * 100 : 0
  const stickinessRate = activeThisMonth > 0 ? (activeToday / activeThisMonth) * 100 : 0

  // "Engaged members" also shown against the total number of profiles in
  // the system (every signup, any status) — the denominator Bill asked for
  // alongside the approved-members rate.
  const totalMembers = profiles.filter(p => !(p as Profile).is_bot).length
  const engagementRateOfTotal = totalMembers > 0 ? (engagedMembersCount / totalMembers) * 100 : 0

  // Most engaging areas: distinct approved members who touched each
  // feature in the last 30 days, ranked — a participation-based proxy for
  // "which sections are most engaging" from data we already have.
  const mostEngagingAreas = Object.entries(featureBuckets)
    .map(([label, set]) => ({ label, count: [...set].filter(id => approvedMemberIds.has(id)).length }))
    .sort((a, b) => b.count - a.count)
  const maxAreaCount = Math.max(1, ...mostEngagingAreas.map(a => a.count))

  // Activation: of members who joined in the last 30 days, what % took a
  // first action within 7 days of joining.
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const recentSignupMembers = members.filter(m => new Date(m.joined_at) > thirtyDaysAgoDate)
  const activatedCount = recentSignupMembers.filter(m => {
    const first = firstActionAt[m.id]
    return !!first && first <= new Date(m.joined_at).getTime() + 7 * 24 * 60 * 60 * 1000
  }).length
  const activationRate = recentSignupMembers.length > 0 ? (activatedCount / recentSignupMembers.length) * 100 : null

  // At risk: approved members who were active before but haven't logged in
  // in the last 30 days (last login 30–60 days ago) — an early warning
  // list, distinct from "never logged in" (who never started at all).
  const atRiskCount = members.filter(m => {
    if (m.status !== 'approved' || !m.last_login) return false
    const t = new Date(m.last_login).getTime()
    return t <= thirtyDaysAgoMs && t > sixtyDaysAgo.getTime()
  }).length

  // Where members are going: route navigation grouped by top-level
  // section, last 30 days. Real page-view data (not a click/scroll
  // heatmap) — populates as PageViewTracker logs visits going forward.
  const sectionLabels: Record<string, string> = {
    forum: 'Forum', events: 'Events', jobs: 'Job Board', chat: 'Chat',
    mentorship: 'Mentorship', vendors: 'Vendor Reviews', polls: 'Polls',
    members: 'Member Directory', dashboard: 'Dashboard', profile: 'Profile',
    messages: 'Messages', notifications: 'Notifications', talent: 'Talent',
    chapters: 'Chapters', registrations: 'My Registrations',
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageViewRows = (pageViews30d.data ?? []) as any[]
  const sectionStats: Record<string, { views: number; users: Set<string> }> = {}
  for (const row of pageViewRows) {
    const seg = String(row.path ?? '').split('/').filter(Boolean)[0] ?? ''
    const label = sectionLabels[seg] ?? (seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Home')
    if (!sectionStats[label]) sectionStats[label] = { views: 0, users: new Set() }
    sectionStats[label].views += 1
    if (row.user_id) sectionStats[label].users.add(row.user_id)
  }
  const whereGoing = Object.entries(sectionStats)
    .map(([label, v]) => ({ label, views: v.views, users: v.users.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
  const maxViews = Math.max(1, ...whereGoing.map(w => w.views))

  // Retention trend: daily snapshots written by the activity-snapshot
  // cron. Empty until the first cron run lands.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshots = (dailySnapshots.data ?? []) as any[]

  const northStarStats = [
    {
      label: 'Engaged members',
      value: engagementRate,
      caption: `${engagedMembersCount.toLocaleString()} of ${approvedMembers.toLocaleString()} approved members have ever posted, RSVP'd, voted, or otherwise participated`,
      icon: Sparkles,
      color: '#7c3aed',
      secondary: {
        label: 'of total profiles in the system',
        value: engagementRateOfTotal,
        caption: `${engagedMembersCount.toLocaleString()} of ${totalMembers.toLocaleString()} total profiles`,
      },
    },
    {
      label: '30-day usage',
      value: usageRate30d,
      caption: `${activeThisMonth.toLocaleString()} of ${approvedMembers.toLocaleString()} members logged in over the last 30 days`,
      icon: TrendingUp,
      color: '#0d9488',
    },
    {
      label: 'Stickiness (DAU/MAU)',
      value: stickinessRate,
      caption: `${activeToday.toLocaleString()} active today vs. ${activeThisMonth.toLocaleString()} active this month`,
      icon: Flame,
      color: '#E8503A',
    },
  ]

  const pulseStats = [
    { label: 'Approved members', value: approvedMembers, icon: Users, color: '#1E4B82' },
    { label: 'Signups this week', value: signupsThisWeek, icon: UserPlus, color: '#E8503A' },
    { label: 'Active this week', value: activeThisWeek, icon: LogIn, color: '#8b5cf6' },
    { label: 'Active this month', value: activeThisMonth, icon: Activity, color: '#3b82f6' },
  ]

  const eventRegs30d = (eventRsvps30d.count ?? 0) + (eventRegistrations30d.count ?? 0)

  const breakdown = [
    { label: 'New forum topics', sub: '30 days', value: forumTopics30d.count ?? 0, total: forumTopicsTotal.count ?? 0, icon: MessageSquare, color: '#8b5cf6' },
    { label: 'Forum replies', sub: '30 days', value: forumReplies30d.count ?? 0, icon: MessagesSquare, color: '#7c3aed' },
    { label: 'Event RSVPs', sub: '30 days', value: eventRegs30d, icon: CalendarDays, color: '#0d9488' },
    { label: 'Upcoming events', sub: 'published, real', value: upcomingEventsCount.count ?? 0, icon: CalendarDays, color: '#14b8a6' },
    { label: 'Active job posts', sub: `${jobs30d.count ?? 0} new in 30d`, value: jobsActive.count ?? 0, icon: Briefcase, color: '#d97706' },
    { label: 'Chat messages', sub: '30 days', value: chatMessages30d.count ?? 0, icon: MessagesSquare, color: '#3b82f6' },
    { label: 'Poll votes', sub: '30 days', value: pollVotes30d.count ?? 0, icon: BarChart3, color: '#db2777' },
    { label: 'Active polls', sub: 'open now', value: pollsActive.count ?? 0, icon: BarChart3, color: '#ec4899' },
    { label: 'Mentorship connections', sub: `${mentorshipPending.count ?? 0} requests pending`, value: mentorshipActive.count ?? 0, icon: GraduationCap, color: '#f59e0b' },
    { label: 'Vendor reviews', sub: '30 days', value: vendorReviews30d.count ?? 0, icon: Building2, color: '#0ea5e9' },
  ]

  function statusBadge(status: string) {
    if (status === 'approved') return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold text-xs">Approved</Badge>
    if (status === 'pending') return <Badge className="bg-amber-50 text-amber-700 border border-amber-100 font-semibold text-xs">Pending</Badge>
    if (status === 'rejected') return <Badge className="bg-red-50 text-red-700 border border-red-100 font-semibold text-xs">Rejected</Badge>
    return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }

  function roleBadge(role: string) {
    if (role === 'admin') return <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">Admin</span>
    if (role === 'board_member') return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">Board</span>
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
          <Activity className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Community Activity</h1>
          <p className="text-sm text-zinc-500">Signups, engagement, and activity across every part of TALK</p>
        </div>
      </div>

      {/* North star metrics */}
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4 text-violet-600" />
          <h2 className="text-xs font-bold uppercase tracking-wide text-violet-600">North Star Metrics</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {northStarStats.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-500">{s.label}</span>
                <s.icon className="size-4" style={{ color: s.color }} />
              </div>
              <p className="text-3xl font-black text-zinc-900">{s.value.toFixed(0)}%</p>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden mt-2.5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, s.value))}%`, background: s.color }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{s.caption}</p>
              {'secondary' in s && s.secondary && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-medium text-zinc-400">{s.secondary.label}</span>
                    <span className="text-sm font-bold text-zinc-700">{s.secondary.value.toFixed(1)}%</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{s.secondary.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pulse stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {pulseStats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{s.label}</span>
              <s.icon className="size-4" style={{ color: s.color }} />
            </div>
            <p className="text-3xl font-black text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Never logged in callout */}
      {neverLoggedIn > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 flex items-center gap-3">
          <Clock className="size-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">{neverLoggedIn} member{neverLoggedIn !== 1 ? 's' : ''}</span> signed up but have never logged in.
          </p>
        </div>
      )}

      {/* Activation & at-risk — are new members getting hooked, and who's
          drifting away before they churn entirely. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-500">Activation rate</span>
              <Rocket className="size-4 text-emerald-600" />
            </div>
            {activationRate === null ? (
              <p className="text-sm text-zinc-400 mt-2">No new signups in the last 30 days</p>
            ) : (
              <>
                <p className="text-3xl font-black text-zinc-900">{activationRate.toFixed(0)}%</p>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  {activatedCount.toLocaleString()} of {recentSignupMembers.length.toLocaleString()} members who joined in the last 30 days took a first action (post, RSVP, vote, etc.) within 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-500">At risk — going quiet</span>
              <AlertTriangle className="size-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-zinc-900">{atRiskCount.toLocaleString()}</p>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Approved members who logged in before, but not in the last 30 days (last seen 30–60 days ago)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retention trend — daily snapshots from the activity-snapshot cron,
          so these numbers can be watched over time instead of read once. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <LineChart className="size-4" />
            Engagement Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No trend data yet — a daily snapshot starts tonight. Check back tomorrow to see engagement rate move over time.
            </p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {snapshots.map((s) => (
                <div key={s.snapshot_date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className="w-full rounded-t bg-violet-500/80 group-hover:bg-violet-600 transition-colors"
                    style={{ height: `${Math.max(4, Math.min(100, s.engagement_rate))}%` }}
                    title={`${format(new Date(s.snapshot_date), 'MMM d')}: ${s.engagement_rate}% engaged`}
                  />
                </div>
              ))}
            </div>
          )}
          {snapshots.length > 0 && (
            <p className="text-[11px] text-zinc-400 mt-2">Engaged-members % by day, most recent {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</p>
          )}
        </CardContent>
      </Card>

      {/* Activity breakdown — the deep-dive part: what's actually happening
          across the community, not just who's signing in. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <BarChart3 className="size-4" />
            Activity by Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {breakdown.map((b) => (
              <div key={b.label} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5">
                <b.icon className="size-4 mb-2" style={{ color: b.color }} />
                <p className="text-xl font-black text-zinc-900 leading-none">{b.value.toLocaleString()}</p>
                <p className="text-xs font-medium text-zinc-500 mt-1.5">{b.label}</p>
                <p className="text-[11px] text-zinc-400">{b.sub}{b.total !== undefined ? ` · ${b.total.toLocaleString()} all-time` : ''}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Most engaging areas & where members are going — the closest thing
          to a heat map we can build from data this app actually has: a
          participation ranking (who's doing what, by feature) and a
          navigation ranking (which sections get visited most). Not a
          click/scroll heatmap — that needs a tool like PostHog or Hotjar
          instrumented separately. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <BarChart3 className="size-4" />
              Most Engaging Areas
            </CardTitle>
            <p className="text-xs text-zinc-400">Distinct members who participated, last 30 days</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {mostEngagingAreas.every(a => a.count === 0) ? (
              <p className="text-sm text-zinc-400">No feature activity in the last 30 days yet.</p>
            ) : mostEngagingAreas.map((a) => (
              <div key={a.label} className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-600 w-24 shrink-0">{a.label}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${(a.count / maxAreaCount) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-zinc-700 w-8 text-right">{a.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Compass className="size-4" />
              Where Members Are Going
            </CardTitle>
            <p className="text-xs text-zinc-400">Page views by section, last 30 days</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {whereGoing.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No page views logged yet — tracking started today, check back once members browse the app.
              </p>
            ) : whereGoing.map((w) => (
              <div key={w.label} className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-600 w-24 shrink-0">{w.label}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(w.views / maxViews) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-zinc-700 w-16 text-right">{w.views} · {w.users}u</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Users className="size-4" />
              Most Recently Active — top {recentMembers.length.toLocaleString()} of {members.length.toLocaleString()} members
            </CardTitle>
          </div>
          <Link href="/admin/members" className="text-xs font-semibold text-violet-600 hover:text-violet-700 shrink-0">
            View full member directory →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="py-2.5 pl-5 pr-4 font-semibold">Member</th>
                  <th className="py-2.5 pr-4 font-semibold">Email</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-4 font-semibold">Joined</th>
                  <th className="py-2.5 pr-4 font-semibold">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {recentMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800">
                          {m.full_name ?? <span className="text-zinc-400 italic">No profile</span>}
                        </span>
                        {roleBadge(m.role)}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{m.email}</td>
                    <td className="py-3 pr-4">{statusBadge(m.status)}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs whitespace-nowrap">
                      <span title={format(new Date(m.joined_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs whitespace-nowrap">
                      {m.last_login ? (
                        <span className="text-zinc-500" title={format(new Date(m.last_login), 'PPpp')}>
                          {formatDistanceToNow(new Date(m.last_login), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
