import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Zap, Briefcase, Mail, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, formatDistanceToNow } from 'date-fns'
import JobsList from '../jobs/jobs-list'

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const workPrefColor: Record<string, string> = {
  remote:   'bg-blue-50 text-blue-700 border-blue-100',
  hybrid:   'bg-violet-50 text-violet-700 border-violet-100',
  onsite:   'bg-orange-50 text-orange-700 border-orange-100',
  flexible: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}
const workPrefLabel: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site', flexible: 'Flexible',
}

export default async function CareersPage() {
  const supabase = await createClient()

  const [jobsRes, poolRes] = await Promise.all([
    supabase
      .from('job_posts')
      .select('*, profiles(full_name, company)')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('talent_pool')
      .select('*, profiles(id, full_name, avatar_url, title, company)')
      .order('updated_at', { ascending: false }),
  ])

  const jobs = jobsRes.data ?? []
  const pool = (poolRes.data ?? []) as {
    id: string
    user_id: string
    headline: string
    seeking: string
    work_pref: string
    available_from: string | null
    updated_at: string
    profiles: { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null } | null
  }[]

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Careers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pool.length} member{pool.length !== 1 ? 's' : ''} open to opportunities · {jobs.length} active job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile#talent"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1E4B82, #2563EB)' }}
          >
            <Zap className="size-4" />
            I&apos;m open to work
          </Link>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl"
            render={<Link href="/jobs/new" />}
          >
            <Plus className="size-4" />
            Post a Job
          </Button>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: Talent Pool ── */}
        <aside className="w-80 shrink-0">
          <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-[#1E4B82]" />
                <span className="font-bold text-sm text-zinc-900">Open to Work</span>
                <span className="text-xs text-zinc-400 font-medium bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded-full">{pool.length}</span>
              </div>
            </div>

            {pool.length === 0 ? (
              <div className="p-8 text-center">
                <Zap className="size-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No one in the talent pool yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50 max-h-[calc(100vh-200px)] overflow-y-auto">
                {pool.map(entry => {
                  const p = entry.profiles
                  return (
                    <div key={entry.id} className="p-4 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <Link href={`/members/${entry.user_id}`} className="shrink-0">
                          <Avatar className="size-10 ring-2 ring-offset-1 ring-[#1E4B82]/20">
                            {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ''} />}
                            <AvatarFallback
                              className="text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #1E4B82, #2563EB)' }}
                            >
                              {getInitials(p?.full_name ?? null)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <Link href={`/members/${entry.user_id}`}>
                              <p className="text-sm font-bold text-zinc-900 hover:text-[#1E4B82] transition-colors leading-tight truncate">
                                {p?.full_name ?? 'Member'}
                              </p>
                            </Link>
                            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${workPrefColor[entry.work_pref] ?? workPrefColor.flexible}`}>
                              {workPrefLabel[entry.work_pref] ?? entry.work_pref}
                            </span>
                          </div>
                          {(p?.title || p?.company) && (
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              {[p?.title, p?.company].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {entry.headline && (
                            <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed italic">
                              &ldquo;{entry.headline}&rdquo;
                            </p>
                          )}
                          {entry.available_from && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1.5">
                              <Calendar className="size-3" />
                              Available {format(new Date(entry.available_from), 'MMM d')}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-400">
                              {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                            </span>
                            <Link
                              href={`/messages?with=${entry.user_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
                              style={{ background: 'linear-gradient(135deg, #1E4B82, #2563EB)' }}
                            >
                              <Mail className="size-2.5" />
                              Message
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT: Jobs ── */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
              <Briefcase className="size-4 text-indigo-600" />
              <span className="font-bold text-sm text-zinc-900">Open Positions</span>
              <span className="text-xs text-zinc-400 font-medium bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded-full">{jobs.length}</span>
            </div>
            <div className="p-4">
              <JobsList jobs={jobs} />
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}
