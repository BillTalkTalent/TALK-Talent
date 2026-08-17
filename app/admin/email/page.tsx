import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminEmailComposer from '@/components/admin-email-composer'
import { getAudienceCount, getChapters } from './email-actions'
import { createClient } from '@/lib/supabase/server'

// Bulk sends run in throttled batches — give the action room to finish.
export const maxDuration = 300

export default async function EmailMembersPage() {
  const [{ total }, chapters] = await Promise.all([getAudienceCount(), getChapters()])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user?.id ?? '')
    .single()
  const isSuperAdmin = !!viewerProfile?.is_superadmin

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Email Members</h1>
        <p className="text-sm text-zinc-500">Send a community-wide email through TALK, or target a single chapter.</p>
      </div>

      <AdminEmailComposer audienceCount={total} chapters={chapters} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
