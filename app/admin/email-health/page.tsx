import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Mail, AlertOctagon, ShieldAlert, ShieldCheck, Ban, ArrowUp, ArrowDown } from 'lucide-react'

async function suspendBouncedMember(id: string) {
  'use server'
  await requireSuperAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('profiles')
    .update({ status: 'rejected', rejection_note: 'Email undeliverable (permanent bounce)' })
    .eq('id', id)
  revalidatePath('/admin/email-health')
}

const PAGE_SIZE = 50

// Cap how many raw bounce rows feed the member-matching query below — with
// up to ~5k rows in some categories, matching every single one against
// profiles risks an oversized query. The most recent N is what's actually
// actionable anyway (older bounces are more likely already stale/handled).
const MATCH_CAP = 500

type FilterKey = 'suppressed' | 'bounced' | 'permanent' | 'transient' | 'complained'

const FILTERS: { key: FilterKey; label: string; icon: typeof Mail; tone: string }[] = [
  { key: 'bounced', label: 'Bounces (30d)', icon: Mail, tone: 'text-zinc-600' },
  { key: 'permanent', label: 'Permanent bounces (30d)', icon: Ban, tone: 'text-red-600' },
  { key: 'transient', label: 'Transient bounces (30d)', icon: AlertOctagon, tone: 'text-amber-600' },
  { key: 'complained', label: 'Complaints (30d)', icon: ShieldAlert, tone: 'text-red-600' },
  { key: 'suppressed', label: 'Auto-suppressed', icon: ShieldCheck, tone: 'text-emerald-600' },
]

type BounceRow = { email: string; event_type: string; bounce_type: string | null; reason: string | null; created_at: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, filter: FilterKey, since30d: string) {
  switch (filter) {
    case 'permanent':
      return query.eq('bounce_type', 'Permanent').gte('created_at', since30d)
    case 'transient':
      return query.eq('bounce_type', 'Transient').gte('created_at', since30d)
    case 'complained':
      return query.eq('event_type', 'complained').gte('created_at', since30d)
    case 'bounced':
      return query.eq('event_type', 'bounced').gte('created_at', since30d)
    case 'suppressed':
    default:
      // All-time, not 30-day scoped — matches what "Auto-suppressed" counts.
      return query.eq('suppressed', true)
  }
}

function describeReason(bounce: BounceRow | undefined): string {
  if (!bounce) return '—'
  if (bounce.event_type === 'complained') return 'Marked as spam'
  return bounce.bounce_type ?? 'Bounced'
}

function pageHref(filter: FilterKey, sort: 'asc' | 'desc', page: number) {
  const params = new URLSearchParams()
  if (filter !== 'suppressed') params.set('filter', filter)
  if (sort !== 'desc') params.set('sort', sort)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/admin/email-health${qs ? `?${qs}` : ''}`
}

export default async function EmailHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; sort?: string }>
}) {
  const sp = await searchParams
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const fromRow = (pageNum - 1) * PAGE_SIZE
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as FilterKey) : 'suppressed'
  const sort: 'asc' | 'desc' = sp.sort === 'asc' ? 'asc' : 'desc'

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  const since30dDate = new Date()
  since30dDate.setUTCDate(since30dDate.getUTCDate() - 30)
  const since30d = since30dDate.toISOString()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [
    { count: bounces30d },
    { count: permanent30d },
    { count: transient30d },
    { count: complaints30d },
    { count: suppressedCount },
    { count: bouncesToday },
    { count: complaintsToday },
    { data: rawBounceRows },
  ] = await Promise.all([
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'bounced').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('bounce_type', 'Permanent').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('bounce_type', 'Transient').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'complained').gte('created_at', since30d),
    adminDb.from('email_unsubscribes').select('email', { count: 'exact', head: true }),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'bounced').gte('created_at', todayStart.toISOString()),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'complained').gte('created_at', todayStart.toISOString()),
    applyFilter(
      adminDb.from('email_bounces').select('email, event_type, bounce_type, reason, created_at'),
      filter,
      since30d,
    ).order('created_at', { ascending: false }).limit(MATCH_CAP),
  ])

  // One bounce row per email — the most recent (rows came back newest-first).
  const latestBounceByEmail = new Map<string, BounceRow>()
  for (const row of (rawBounceRows ?? []) as BounceRow[]) {
    if (!latestBounceByEmail.has(row.email)) latestBounceByEmail.set(row.email, row)
  }
  const candidateEmails = [...latestBounceByEmail.keys()]

  // Match against approved members — the actionable subset. A bounced
  // address that isn't any member's email (legacy import, some other flow)
  // has nothing to act on here.
  const { data: matchedMembers } = candidateEmails.length > 0
    ? await adminDb
        .from('profiles')
        .select('id, full_name, email, company, status')
        .in('email', candidateEmails)
        .eq('is_bot', false)
    : { data: [] }

  type MatchedMember = { id: string; full_name: string | null; email: string; company: string | null; status: string }
  const sorted = ((matchedMembers ?? []) as MatchedMember[])
    .map((m) => ({ ...m, bounce: latestBounceByEmail.get(m.email) }))
    .sort((a, b) => {
      const at = a.bounce ? new Date(a.bounce.created_at).getTime() : 0
      const bt = b.bounce ? new Date(b.bounce.created_at).getTime() : 0
      return sort === 'asc' ? at - bt : bt - at
    })

  const totalMatched = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalMatched / PAGE_SIZE))
  const pageItems = sorted.slice(fromRow, fromRow + PAGE_SIZE)
  const nextSort = sort === 'desc' ? 'asc' : 'desc'

  const statValues: Record<FilterKey, number> = {
    bounced: bounces30d ?? 0,
    permanent: permanent30d ?? 0,
    transient: transient30d ?? 0,
    complained: complaints30d ?? 0,
    suppressed: suppressedCount ?? 0,
  }

  const activeLabel = FILTERS.find((f) => f.key === filter)?.label ?? 'Auto-suppressed'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Email Health</h1>
        <p className="text-sm text-zinc-500">
          Bounce and complaint activity recorded from Resend&apos;s webhook. For open/click rates and
          true delivery percentages, check the Resend dashboard directly — this only tracks what
          bounced or was reported as spam.
        </p>
      </div>

      {/* Today */}
      {((bouncesToday ?? 0) > 0 || (complaintsToday ?? 0) > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Today: {(bouncesToday ?? 0).toLocaleString()} bounce{bouncesToday === 1 ? '' : 's'}
            {(complaintsToday ?? 0) > 0 && <>, {complaintsToday} complaint{complaintsToday === 1 ? '' : 's'}</>}
          </p>
        </div>
      )}

      {/* Stats — click one to filter the list below to that category */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {FILTERS.map(({ key, label, icon: Icon, tone }) => {
          const active = key === filter
          return (
            <Link key={key} href={pageHref(key, sort, 1)}>
              <Card className={cn('transition-colors cursor-pointer hover:border-zinc-300', active && 'border-zinc-900 ring-1 ring-zinc-900')}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-md', active ? 'bg-zinc-900' : 'bg-zinc-100')}>
                      <Icon className={cn('size-4', active ? 'text-white' : tone)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-zinc-900">{statValues[key].toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Matching members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            Members Matching &ldquo;{activeLabel}&rdquo;
            <Badge variant="secondary" className="ml-1">{totalMatched.toLocaleString()}</Badge>
            {candidateEmails.length >= MATCH_CAP && (
              <span className="text-xs font-normal text-zinc-400">(most recent {MATCH_CAP} bounces checked)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 -mt-1 mb-4">
            {filter === 'suppressed'
              ? "Addresses that permanently bounced or reported the mail as spam — already excluded from every future send. This list is for cleaning up stale membership records, not for re-enabling delivery."
              : 'Approved members whose email shows up in this category. Transient bounces are temporary (full mailbox, greylisting) — usually nothing to act on unless they persist.'}
          </p>
          {pageItems.length === 0 ? (
            <p className="text-sm text-zinc-400">No approved members match this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                    <th className="py-2.5 pr-4 pl-3 font-semibold">Name</th>
                    <th className="py-2.5 pr-4 font-semibold">Email</th>
                    <th className="py-2.5 pr-4 font-semibold">Company</th>
                    <th className="py-2.5 pr-4 font-semibold">Reason</th>
                    <th className="py-2.5 pr-4 font-semibold">
                      <Link href={pageHref(filter, nextSort, 1)} className="inline-flex items-center gap-1 hover:text-zinc-700">
                        Last seen
                        {sort === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
                      </Link>
                    </th>
                    <th className="py-2.5 pr-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {pageItems.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 pr-4 pl-3 font-medium text-zinc-900">{m.full_name ?? '—'}</td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs">{m.email}</td>
                      <td className="py-3 pr-4 text-zinc-500">{m.company ?? '—'}</td>
                      <td className="py-3 pr-4 text-zinc-400 text-xs max-w-xs truncate" title={m.bounce?.reason ?? ''}>
                        {describeReason(m.bounce)}
                      </td>
                      <td className="py-3 pr-4 text-zinc-400 text-xs">
                        {m.bounce ? format(new Date(m.bounce.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        {m.status === 'rejected' ? (
                          <span className="text-xs text-zinc-300 italic">Already suspended</span>
                        ) : (
                          <form action={suspendBouncedMember.bind(null, m.id)}>
                            <button
                              type="submit"
                              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                            >
                              Suspend
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-zinc-400">Page {pageNum} of {totalPages}</span>
              <div className="flex items-center gap-2">
                {pageNum > 1 && (
                  <Link href={pageHref(filter, sort, pageNum - 1)} className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                    Prev
                  </Link>
                )}
                {pageNum < totalPages && (
                  <Link href={pageHref(filter, sort, pageNum + 1)} className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
