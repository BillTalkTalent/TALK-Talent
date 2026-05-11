import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { Briefcase, Star, Trash2, Eye, EyeOff } from 'lucide-react'

async function deleteJob(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('job_posts').delete().eq('id', id)
  revalidatePath('/admin/jobs')
}

async function toggleFeatured(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('job_posts').update({ is_featured: !current }).eq('id', id)
  revalidatePath('/admin/jobs')
}

async function toggleStatus(id: string, current: string) {
  'use server'
  const supabase = await createClient()
  const next = current === 'active' ? 'closed' : 'active'
  await supabase.from('job_posts').update({ status: next }).eq('id', id)
  revalidatePath('/admin/jobs')
}

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  fractional: 'Fractional',
  interim: 'Interim',
}

export default async function AdminJobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('job_posts')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  const active = (jobs ?? []).filter(j => j.status === 'active')
  const closed = (jobs ?? []).filter(j => j.status !== 'active')

  function JobRow({ job }: { job: typeof jobs extends (infer T)[] | null ? T : never }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poster = (job as any).profiles as { full_name: string | null; email: string | null } | null
    const isActive = job.status === 'active'

    return (
      <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
        <td className="py-3 pr-4 pl-5">
          <div>
            <Link href={`/jobs/${job.id}`} className="font-semibold text-sm text-zinc-900 hover:text-indigo-600 transition-colors">
              {job.title}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500">{job.company}</span>
              {job.location && <span className="text-xs text-zinc-400">· {job.location}</span>}
              {job.is_remote && <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full font-medium">Remote</span>}
            </div>
          </div>
        </td>
        <td className="py-3 pr-4 text-xs text-zinc-500">
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </td>
        <td className="py-3 pr-4 text-xs text-zinc-500">
          {poster?.full_name ?? poster?.email ?? '—'}
        </td>
        <td className="py-3 pr-4 text-xs text-zinc-400">
          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </td>
        <td className="py-3 pr-4">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-zinc-100 text-zinc-500'}`}>
            {isActive ? 'Active' : 'Closed'}
          </span>
        </td>
        <td className="py-3 pr-5">
          <div className="flex items-center gap-2 justify-end">
            {/* Feature toggle */}
            <form action={toggleFeatured.bind(null, job.id, job.is_featured ?? false)}>
              <button
                type="submit"
                title={job.is_featured ? 'Remove featured' : 'Mark featured'}
                className={`p-1.5 rounded-lg transition-colors ${job.is_featured ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-zinc-300 hover:text-amber-400 hover:bg-amber-50'}`}
              >
                <Star className="size-3.5" fill={job.is_featured ? 'currentColor' : 'none'} />
              </button>
            </form>

            {/* Active/closed toggle */}
            <form action={toggleStatus.bind(null, job.id, job.status)}>
              <button
                type="submit"
                title={isActive ? 'Close listing' : 'Reopen listing'}
                className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' : 'text-zinc-300 hover:text-green-600 hover:bg-green-50'}`}
              >
                {isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </form>

            {/* Delete */}
            <form action={deleteJob.bind(null, job.id)}>
              <button
                type="submit"
                title="Delete job"
                className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                onClick={(e) => { if (!confirm('Delete this job listing?')) e.preventDefault() }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </form>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl flex items-center justify-center bg-indigo-600">
            <Briefcase className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Job Listings</h1>
            <p className="text-xs text-zinc-500">{active.length} active · {closed.length} closed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 pl-5 uppercase tracking-wide">Job</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Type</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Posted by</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Date</th>
              <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Status</th>
              <th className="py-2.5 pr-5" />
            </tr>
          </thead>
          <tbody>
            {active.map(job => <JobRow key={job.id} job={job} />)}
            {closed.length > 0 && active.length > 0 && (
              <tr>
                <td colSpan={6} className="py-2 pl-5 text-xs font-bold text-zinc-400 uppercase tracking-wide bg-zinc-50/30">
                  Closed listings
                </td>
              </tr>
            )}
            {closed.map(job => <JobRow key={job.id} job={job} />)}
            {(jobs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                  No job listings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
