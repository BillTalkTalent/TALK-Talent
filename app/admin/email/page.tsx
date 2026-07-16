import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminEmailComposer from '@/components/admin-email-composer'
import { getAudienceCount } from './email-actions'

// Bulk sends run in throttled batches — give the action room to finish.
export const maxDuration = 300

export default async function EmailMembersPage() {
  const { total } = await getAudienceCount()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Email Members</h1>
        <p className="text-sm text-zinc-500">Send a community-wide email through TALK.</p>
      </div>

      <AdminEmailComposer audienceCount={total} />
    </div>
  )
}
