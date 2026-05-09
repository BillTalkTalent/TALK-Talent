import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NewsletterForm from '../newsletter-form'

export default async function NewNewsletterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any
  const { count: memberCount } = await adminDb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/newsletter" className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">New Newsletter</h1>
          <p className="text-sm text-zinc-500">Write your edition, preview it, then send or schedule</p>
        </div>
      </div>
      <NewsletterForm memberCount={memberCount ?? 0} />
    </div>
  )
}
