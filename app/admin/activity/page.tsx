import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Users, LogIn, UserPlus, Clock, Activity, MessageSquare, CalendarDays,
  Briefcase, MessagesSquare, BarChart3, GraduationCap, Building2,
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

export default async function AdminActivityPage() {
  const admin = createAdminClient()
  const supabase = await createClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    authUsers,
    profilesResult,
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
  ] = await Promise.all([
    listAllAuthUsers(admin),
    supabase.from('profiles').select('id, full_name, status, role, is_bot'),
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
  ])

  const profiles = profilesResult.data ?? []
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

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoDate = new Date(thirtyDaysAgo)

  const signupsToday = members.filter(m => new Date(m.joined_at) > oneDayAgo).length
  const signupsThisWeek = members.filter(m => new Date(m.joined_at) > sevenDaysAgo).length
  const activeThisWeek = members.filter(m => m.last_login && new Date(m.last_login) > sevenDaysAgo).length
  const activeThisMonth = members.filter(m => m.last_login && new Date(m.last_login) > thirtyDaysAgoDate).length
  const neverLoggedIn = members.filter(m => !m.last_login).length
  const approvedMembers = members.filter(m => m.status === 'approved').length

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

      {/* Activity table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Users className="size-4" />
            All Members — sorted by most recent activity
          </CardTitle>
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
                {members.map((m) => (
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
