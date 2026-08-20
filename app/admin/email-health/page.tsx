import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, AlertOctagon, ShieldAlert, ShieldCheck, Ban } from 'lucide-react'

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

export default async function EmailHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const fromRow = (pageNum - 1) * PAGE_SIZE

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
    { data: suppressedEmailRows, count: suppressedTotal },
  ] = await Promise.all([
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'bounced').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('bounce_type', 'Permanent').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('bounce_type', 'Transient').gte('created_at', since30d),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'complained').gte('created_at', since30d),
    adminDb.from('email_unsubscribes').select('email', { count: 'exact', head: true }),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'bounced').gte('created_at', todayStart.toISOString()),
    adminDb.from('email_bounces').select('id', { count: 'exact', head: true }).eq('event_type', 'complained').gte('created_at', todayStart.toISOString()),
    adminDb.from('email_unsubscribes').select('email', { count: 'exact' }).order('email', { ascending: true }).range(fromRow, fromRow + PAGE_SIZE - 1),
  ])

  const suppressedEmails = (suppressedEmailRows ?? []).map((r: { email: string }) => r.email)

  // Match suppressed addresses against approved members — the actionable
  // subset. A suppressed address that isn't any member's email (an old
  // legacy import, a bounce from some other flow) has nothing to act on.
  const { data: matchedMembers } = suppressedEmails.length > 0
    ? await adminDb
        .from('profiles')
        .select('id, full_name, email, company, status')
        .in('email', suppressedEmails)
        .eq('is_bot', false)
    : { data: [] }

  const latestBounceByEmail = new Map<string, { event_type: string; bounce_type: string | null; reason: string | null; created_at: string }>()
  // One query per page of emails would be wasteful — instead pull the most
  // recent bounce row per shown email in a single follow-up query.
  if (suppressedEmails.length > 0) {
    const { data: rows } = await adminDb
      .from('email_bounces')
      .select('email, event_type, bounce_type, reason, created_at')
      .in('email', suppressedEmails)
      .order('created_at', { ascending: false })
    for (const row of rows ?? []) {
      if (!latestBounceByEmail.has(row.email)) latestBounceByEmail.set(row.email, row)
    }
  }

  const totalPages = Math.max(1, Math.ceil((suppressedTotal ?? 0) / PAGE_SIZE))

  const stats = [
    { label: 'Bounces (30d)', value: bounces30d ?? 0, icon: Mail, tone: 'text-zinc-600' },
    { label: 'Permanent bounces (30d)', value: permanent30d ?? 0, icon: Ban, tone: 'text-red-600' },
    { label: 'Transient bounces (30d)', value: transient30d ?? 0, icon: AlertOctagon, tone: 'text-amber-600' },
    { label: 'Complaints (30d)', value: complaints30d ?? 0, icon: ShieldAlert, tone: 'text-red-600' },
    { label: 'Auto-suppressed', value: suppressedCount ?? 0, icon: ShieldCheck, tone: 'text-emerald-600' },
  ]

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-md">
                  <Icon className={`size-4 ${tone}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{value.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suppressed members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Members With a Dead Email
            <Badge variant="secondary" className="ml-1">{(matchedMembers ?? []).length.toLocaleString()} on this page</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 -mt-1 mb-4">
            These addresses permanently bounced or reported the mail as spam, so they&apos;re
            already auto-suppressed from every future send — this list is for cleaning up stale
            membership records, not for re-enabling delivery.
          </p>
          {!matchedMembers || matchedMembers.length === 0 ? (
            <p className="text-sm text-zinc-400">No approved members currently have a suppressed email.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                    <th className="py-2.5 pr-4 pl-3 font-semibold">Name</th>
                    <th className="py-2.5 pr-4 font-semibold">Email</th>
                    <th className="py-2.5 pr-4 font-semibold">Company</th>
                    <th className="py-2.5 pr-4 font-semibold">Reason</th>
                    <th className="py-2.5 pr-4 font-semibold">Last seen</th>
                    <th className="py-2.5 pr-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {matchedMembers.map((m: any) => {
                    const bounce = latestBounceByEmail.get(m.email)
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 pr-4 pl-3 font-medium text-zinc-900">{m.full_name ?? '—'}</td>
                        <td className="py-3 pr-4 text-zinc-500 text-xs">{m.email}</td>
                        <td className="py-3 pr-4 text-zinc-500">{m.company ?? '—'}</td>
                        <td className="py-3 pr-4 text-zinc-400 text-xs max-w-xs truncate" title={bounce?.reason ?? ''}>
                          {bounce ? (bounce.event_type === 'complained' ? 'Marked as spam' : (bounce.bounce_type ?? 'Bounced')) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-zinc-400 text-xs">
                          {bounce ? format(new Date(bounce.created_at), 'MMM d, yyyy') : '—'}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-zinc-400">Page {pageNum} of {totalPages}</span>
              <div className="flex items-center gap-2">
                {pageNum > 1 && (
                  <a href={`/admin/email-health?page=${pageNum - 1}`} className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                    Prev
                  </a>
                )}
                {pageNum < totalPages && (
                  <a href={`/admin/email-health?page=${pageNum + 1}`} className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
