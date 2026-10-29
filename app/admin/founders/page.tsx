import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Check, X } from 'lucide-react'
import StatusSelect from './status-select'
import VolunteerOpportunities from './volunteer-opportunities'

async function setStatus(id: string, status: string) {
  'use server'
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('founder_suggestions').update({ status }).eq('id', id)
  revalidatePath('/admin/founders')
}

// Approving a nomination only means something once the nominee is an
// approved TALK member — nominate (migration 113) is explicitly allowed to
// name someone who isn't a member yet, so this looks them up by email
// rather than assuming a profiles row already exists.
async function reviewNomination(id: string, decision: 'approve' | 'decline') {
  'use server'
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()

    if (decision === 'decline') {
      await db
        .from('founder_nominations')
        .update({ status: 'declined', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
        .eq('id', id)
      revalidatePath('/admin/founders')
      return
    }

    const { data: nomination } = await db.from('founder_nominations').select('email').eq('id', id).single()
    if (!nomination) throw new Error('Nomination not found.')

    const { data: matchedProfile } = await db
      .from('profiles')
      .select('id')
      .ilike('email', nomination.email)
      .eq('status', 'approved')
      .maybeSingle()

    if (!matchedProfile) {
      throw new Error(`No approved TALK member found with email ${nomination.email} yet — invite them first (via /invite), then approve this nomination.`)
    }

    await db.from('profiles').update({ is_founding_member: true }).eq('id', matchedProfile.id)
    await db
      .from('founder_nominations')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .eq('id', id)

    revalidatePath('/admin/founders')
    revalidatePath('/admin/members')
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to review nomination'
    redirect(`/admin/founders?error=${encodeURIComponent(message)}`)
  }
}

export default async function AdminFoundersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: actionError } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestions } = await (supabase as any)
    .from('founder_suggestions')
    .select('id, type, title, status, created_at, profiles(full_name), founder_suggestion_votes(voter_id)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: foundingCount } = await (supabase as any)
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_founding_member', true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: opportunities } = await (supabase as any)
    .from('founder_opportunities')
    .select('id, title, description, is_active, sort_order, founder_volunteer_signups(id, note, profiles(full_name))')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nominationsRaw } = await (supabase as any)
    .from('founder_nominations')
    .select('id, name, email, note, created_at, nominator_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // founder_nominations has two FK columns into profiles (nominator_id,
  // reviewed_by), which makes an embedded profiles(...) select ambiguous —
  // a separate lookup side-steps needing to know Postgres's auto-generated
  // constraint name, same approach used for vendor claim conversions above.
  const nominatorIds = [...new Set((nominationsRaw ?? []).map((n: { nominator_id: string }) => n.nominator_id))]
  const { data: nominatorProfiles } = nominatorIds.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase as any).from('profiles').select('id, full_name').in('id', nominatorIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nominatorMap = new Map<string, string | null>(
    (nominatorProfiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]),
  )
  const nominations = (nominationsRaw ?? []).map((n: { nominator_id: string }) => ({
    ...n,
    nominator_name: nominatorMap.get(n.nominator_id) ?? 'Unknown',
  }))

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{actionError}</p>
        </div>
      )}

      {(nominations ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Founder Nominations</CardTitle>
            <p className="text-sm text-zinc-500">
              Approving only works once the nominee is an approved TALK member — if they aren&apos;t yet, invite
              them from /invite first, then come back and approve.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(nominations ?? []).map((n: any) => (
                <li key={n.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-700">
                      {n.name} <span className="text-zinc-400 font-normal">— {n.email}</span>
                    </p>
                    {n.note && <p className="text-sm text-zinc-500">{n.note}</p>}
                    <p className="text-xs text-zinc-400">nominated by {n.nominator_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={reviewNomination.bind(null, n.id, 'approve')}>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <Check className="size-3" /> Approve
                      </button>
                    </form>
                    <form action={reviewNomination.bind(null, n.id, 'decline')}>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                      >
                        <X className="size-3" /> Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Founders Hub
            <span className="text-xs font-normal text-zinc-400">{foundingCount ?? 0} founding members</span>
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Grant access to someone on the Members page (the flag icon next to their role). Triage ideas and
            topics here — setting a status is what a founding member sees reflected on their submission.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {(suggestions ?? []).length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 text-center">Nothing submitted yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="py-2.5 pr-4 pl-4 font-semibold">Title</th>
                  <th className="py-2.5 pr-4 font-semibold">Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Votes</th>
                  <th className="py-2.5 pr-4 font-semibold">By</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(suggestions ?? []).map((s: any) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 pr-4 pl-4 font-medium text-zinc-700 max-w-xs truncate">{s.title}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs capitalize">{s.type}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{s.founder_suggestion_votes?.length ?? 0}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{s.profiles?.full_name ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusSelect suggestionId={s.id} status={s.status} setStatus={setStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Volunteer Opportunities</CardTitle>
          <p className="text-sm text-zinc-500">
            Shown to founding members at /founders/volunteer. Signups appear under each one.
          </p>
        </CardHeader>
        <CardContent>
          <VolunteerOpportunities opportunities={opportunities ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
