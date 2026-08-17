import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MembersTable from './members-table'
import type { Profile } from '@/lib/supabase/types'
import { RotateCcw, AlertCircle, AlertTriangle } from 'lucide-react'
import { requireSuperAdmin } from '@/lib/admin-auth'

export type UpdateProfileState = { error: string } | { ok: true } | null

// Lets the super admin correct a member's profile directly — typo'd name,
// stale company/title, wrong LinkedIn URL, etc. Modeled as a return value
// (not a throw) per Next's guidance for expected/validation failures, so
// the edit dialog can show the error inline via useActionState instead of
// crashing the page the way an uncaught throw would.
async function updateMemberProfile(
  id: string,
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  'use server'
  await requireSuperAdmin()
  const supabase = await createClient()

  const fullName = (formData.get('full_name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const company = (formData.get('company') as string)?.trim() || null
  const title = (formData.get('title') as string)?.trim() || null
  const linkedinUrl = (formData.get('linkedin_url') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const avatarUrl = (formData.get('avatar_url') as string)?.trim() || null

  if (!fullName) return { error: 'Full name is required.' }
  if (!email) return { error: 'Email is required.' }

  const { data: current } = await supabase.from('profiles').select('email').eq('id', id).single()

  // Email doubles as their login — keep auth.users in sync *before* touching
  // profiles, so a rejected change (e.g. address already in use) doesn't
  // leave profiles.email pointing at an address they can no longer log in with.
  if (current?.email && current.email.toLowerCase() !== email) {
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
    if (authError) return { error: `Failed to update email: ${authError.message}` }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      company,
      title,
      linkedin_url: linkedinUrl,
      bio,
      avatar_url: avatarUrl,
    })
    .eq('id', id)
  if (error) return { error: `Failed to save profile: ${error.message}` }

  revalidatePath('/admin/members')
  return { ok: true }
}

async function setRole(id: string, role: 'member' | 'board_member' | 'admin') {
  'use server'
  const viewerId = await requireSuperAdmin()
  if (id === viewerId && role !== 'admin') {
    throw new Error("You can't change your own role away from admin.")
  }
  const supabase = await createClient()
  await supabase.from('profiles').update({ role }).eq('id', id)
  revalidatePath('/admin/members')
}

async function setSuperAdmin(id: string, value: boolean) {
  'use server'
  const viewerId = await requireSuperAdmin()
  if (id === viewerId && !value) {
    throw new Error("You can't remove your own super admin access.")
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  await supabase.from('profiles').update({ is_superadmin: value }).eq('id', id)
  revalidatePath('/admin/members')
}

async function suspendMember(id: string) {
  'use server'
  const viewerId = await requireSuperAdmin()
  if (id === viewerId) throw new Error("You can't remove your own access.")
  const supabase = await createClient()
  await supabase.from('profiles').update({ status: 'rejected', rejection_note: 'Removed by admin' }).eq('id', id)
  revalidatePath('/admin/members')
}

async function reactivateMember(id: string) {
  'use server'
  try {
    await requireSuperAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').update({ status: 'approved', rejection_note: null }).eq('id', id)
    if (error) {
      throw new Error(error.message.includes('LinkedIn') ? error.message : `Failed to reactivate member: ${error.message}`)
    }
    // Auto-fill profile from legacy staging data (matched by linkedin_url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('match_legacy_member', { p_profile_id: id })
    revalidatePath('/admin/members')
  } catch (err) {
    // Same failure mode as approveMember (app/admin/page.tsx): an uncaught
    // throw here — most commonly the profiles_require_linkedin_for_approval
    // trigger blocking a member with no LinkedIn URL on file — would bubble
    // to the root error boundary and crash the entire app instead of just
    // this one row.
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to reactivate member'
    redirect(`/admin/members?error=${encodeURIComponent(message)}`)
  }
}

const PAGE_SIZE = 50

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const actionError = sp.error
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const fromRow = (pageNum - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user?.id ?? '')
    .single()
  const isSuperAdmin = !!viewerProfile?.is_superadmin

  // Server-side search across the full roster (client-side filtering only ever
  // saw the capped first page, which is why members past the newest ~1k — like
  // early-provisioned accounts — were invisible).
  let membersQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_bot', false)
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
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('is_bot', false),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_bot', false)
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
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{actionError}</p>
        </div>
      )}

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
            setSuperAdmin={setSuperAdmin}
            suspendMember={suspendMember}
            updateMemberProfile={updateMemberProfile}
            isSuperAdmin={isSuperAdmin}
            currentUserId={user?.id ?? ''}
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
                      {isSuperAdmin ? (
                        <form action={reactivateMember.bind(null, member.id)}>
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <RotateCcw className="size-3" />
                            Reactivate
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-zinc-300 italic">Super admin only</span>
                      )}
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
