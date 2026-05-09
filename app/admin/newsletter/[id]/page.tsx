import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import NewsletterForm from '../newsletter-form'

export default async function EditNewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  const [{ data: newsletter }, { count: memberCount }] = await Promise.all([
    adminDb.from('newsletters').select('*').eq('id', id).single(),
    adminDb.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  if (!newsletter) redirect('/admin/newsletter')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/newsletter" className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-900">{newsletter.subject || 'Untitled draft'}</h1>
          <p className="text-sm text-zinc-500">
            {newsletter.status === 'sent' && newsletter.sent_at
              ? `Sent ${format(new Date(newsletter.sent_at), 'MMM d, yyyy h:mm a')} · ${newsletter.recipient_count ?? 0} recipients`
              : newsletter.status === 'scheduled' && newsletter.scheduled_for
              ? `Scheduled for ${format(new Date(newsletter.scheduled_for), 'MMM d, yyyy h:mm a')}`
              : `Last updated ${format(new Date(newsletter.updated_at), 'MMM d, yyyy h:mm a')}`}
          </p>
        </div>
        {newsletter.status === 'sent' && (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Sent ✓
          </span>
        )}
      </div>

      {newsletter.status === 'sent' ? (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-8">
          <p className="text-sm font-semibold text-zinc-500 mb-4">This edition was already sent — read-only view</p>
          <div
            className="prose prose-sm max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: newsletter.body_html }}
          />
        </div>
      ) : (
        <NewsletterForm
          id={newsletter.id}
          initialSubject={newsletter.subject}
          initialPreview={newsletter.preview_text ?? ''}
          initialBody={newsletter.body_html}
          memberCount={memberCount ?? 0}
        />
      )}
    </div>
  )
}
