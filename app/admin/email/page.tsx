import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminEmailComposer from '@/components/admin-email-composer'
import { getAudienceCount, getChapters } from './email-actions'
import { createClient } from '@/lib/supabase/server'

// Bulk sends run in throttled batches — give the action room to finish.
export const maxDuration = 300

export default async function EmailMembersPage() {
  const [{ total }, chapters, { total: boardMemberCount }] = await Promise.all([
    getAudienceCount(),
    getChapters(),
    getAudienceCount(null, 'board_member'),
  ])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user?.id ?? '')
    .single()
  const isSuperAdmin = !!viewerProfile?.is_superadmin

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Email Members</h1>
        <p className="text-sm text-zinc-500">Send a community-wide email through TALK, target a single chapter, or reach board members only.</p>
      </div>

      <AdminEmailComposer
        audienceCount={total}
        chapters={chapters}
        boardMemberCount={boardMemberCount}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
