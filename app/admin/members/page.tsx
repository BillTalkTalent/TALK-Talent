import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MembersTable from './members-table'
import type { Profile } from '@/lib/supabase/types'
import { RotateCcw, AlertCircle } from 'lucide-react'

async function setRole(id: string, role: 'member' | 'board_member' | 'admin') {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update({ role }).eq('id', id)
  revalidatePath('/admin/members')
}

async function suspendMember(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update({ status: 'rejected', rejection_note: 'Removed by admin' }).eq('id', id)
  revalidatePath('/admin/members')
}

async function reactivateMember(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update({ status: 'approved', rejection_note: null }).eq('id', id)
  // Auto-fill profile from legacy staging data (matched by linkedin_url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('match_legacy_member', { p_profile_id: id })
  revalidatePath('/admin/members')
}

const PAGE_SIZE = 50

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const fromRow = (pageNum - 1) * PAGE_SIZE

  const supabase = await createClient()

  // Server-side search across the full roster (client-side filtering only ever
  // saw the capped first page, which is why members past the newest ~1k — like
  // early-provisioned accounts — were invisible).
  let membersQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')
  if (q) {
    // Strip characters that would break PostgREST's or() filter grammar.
    const like = `%${q.replace(/[,()*]/g, ' ').trim()}%`
    membersQuery = membersQuery.or(
      `full_name.ilike.${like},email.ilike.${like},company.ilike.${like},title.ilike.${like}`,
    )
  }

  const [
    { data: members, count },
    { count: totalApproved },
    { count: onboardedCount },
    { data: rejectedMembers },
  ] = await Promise.all([
    membersQuery.order('created_at', { ascending: false }).range(fromRow, fromRow + PAGE_SIZE - 1),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('has_onboarded', true),
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'rejected')
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const resultCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Active Members
            <Badge variant="secondary" className="ml-1">{(totalApproved ?? 0).toLocaleString()}</Badge>
            <span className="text-xs font-normal text-zinc-400">
              {(onboardedCount ?? 0).toLocaleString()} have set up their profile
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={members ?? []}
            setRole={setRole}
            suspendMember={suspendMember}
            query={q}
            page={pageNum}
            totalPages={totalPages}
            resultCount={resultCount}
          />
        </CardContent>
      </Card>

      {/* Rejected / Suspended members */}
      {(rejectedMembers ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-600">
              <AlertCircle className="size-4 text-amber-500" />
              Rejected / Suspended
              <Badge variant="secondary" className="ml-1">{(rejectedMembers ?? []).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="py-2.5 pr-4 pl-4 font-semibold">Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Email</th>
                  <th className="py-2.5 pr-4 font-semibold">Reason</th>
                  <th className="py-2.5 pr-4 font-semibold">Date</th>
                  <th className="py-2.5 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(rejectedMembers ?? []).map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 pr-4 pl-4 font-medium text-zinc-700">{member.full_name ?? '—'}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{member.email}</td>
                    <td className="py-3 pr-4 text-zinc-400 text-xs">{member.rejection_note ?? '—'}</td>
                    <td className="py-3 pr-4 text-zinc-400 text-xs">
                      {format(new Date(member.updated_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 pr-4">
                      <form action={reactivateMember.bind(null, member.id)}>
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="size-3" />
                          Reactivate
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
