import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow, format } from 'date-fns'
import { Users, LogIn, UserPlus, Clock, Activity } from 'lucide-react'
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
}

export default async function AdminActivityPage() {
  const adminDb = createAdminClient()

  // Fetch all auth users (service role only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: authData } = await (adminDb as any).auth.admin.listUsers({ perPage: 500 })
  const authUsers: AuthUser[] = authData?.users ?? []

  // Fetch all profiles for names/status
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, status, role')

  const profileMap: Record<string, Profile> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  // Merge auth + profile data
  const members = authUsers
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
      // Sort by most recent activity (last login, else join date)
      const aTime = a.last_login ?? a.joined_at
      const bTime = b.last_login ?? b.joined_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  // Stats
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const signupsToday = members.filter(m => new Date(m.joined_at) > oneDayAgo).length
  const signupsThisWeek = members.filter(m => new Date(m.joined_at) > sevenDaysAgo).length
  const activeThisWeek = members.filter(m => m.last_login && new Date(m.last_login) > sevenDaysAgo).length
  const activeThisMonth = members.filter(m => m.last_login && new Date(m.last_login) > thirtyDaysAgo).length
  const neverLoggedIn = members.filter(m => !m.last_login).length

  const stats = [
    { label: 'Signups today', value: signupsToday, icon: UserPlus, color: '#00b894' },
    { label: 'Signups this week', value: signupsThisWeek, icon: UserPlus, color: '#00d4aa' },
    { label: 'Active this week', value: activeThisWeek, icon: LogIn, color: '#8b5cf6' },
    { label: 'Active this month', value: activeThisMonth, icon: Activity, color: '#3b82f6' },
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
          <h1 className="text-lg font-bold text-zinc-900">Member Activity</h1>
          <p className="text-sm text-zinc-500">Signups, logins, and engagement across {members.length} accounts</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
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
