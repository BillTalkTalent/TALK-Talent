import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Send, Clock, FileText, Users } from 'lucide-react'
import NewsletterForm from './newsletter-form'

export default async function AdminNewsletterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  const [newslettersResult, memberCountResult] = await Promise.all([
    adminDb.from('newsletters').select('*').order('created_at', { ascending: false }),
    adminDb.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  const newsletters = newslettersResult.data ?? []
  const memberCount = memberCountResult.count ?? 0

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-zinc-100 text-zinc-500 border-zinc-200',
      scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
      sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    const labels: Record<string, string> = { draft: 'Draft', scheduled: 'Scheduled', sent: 'Sent ✓' }
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] ?? map.draft}`}>
        {labels[status] ?? status}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Newsletter</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Write, preview and send your weekly community newsletter</p>
        </div>
        <Link
          href="/admin/newsletter/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)', color: '#0d0d0d' }}
        >
          <Plus className="size-4" />
          Write new edition
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-100 bg-white p-4 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-[#F07058]/10 flex items-center justify-center">
            <Users className="size-4 text-[#E8503A]" />
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-900">{memberCount}</p>
            <p className="text-xs text-zinc-400">members on list</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Send className="size-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-900">{newsletters.filter((n: {status: string}) => n.status === 'sent').length}</p>
            <p className="text-xs text-zinc-400">editions sent</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock className="size-4 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-900">{newsletters.filter((n: {status: string}) => n.status === 'scheduled').length}</p>
            <p className="text-xs text-zinc-400">scheduled</p>
          </div>
        </div>
      </div>

      {/* Past newsletters */}
      {newsletters.length > 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">All editions</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {newsletters.map((n: {
              id: string; subject: string; status: string;
              created_at: string; sent_at?: string; scheduled_for?: string; recipient_count?: number
            }) => (
              <Link
                key={n.id}
                href={`/admin/newsletter/${n.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group"
              >
                <div className="size-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate group-hover:text-[#E8503A] transition-colors">
                    {n.subject || 'Untitled'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {n.status === 'sent' && n.sent_at
                      ? `Sent ${format(new Date(n.sent_at), 'MMM d, yyyy')} · ${n.recipient_count ?? 0} recipients`
                      : n.status === 'scheduled' && n.scheduled_for
                      ? `Scheduled for ${format(new Date(n.scheduled_for), 'MMM d, yyyy h:mm a')}`
                      : `Created ${format(new Date(n.created_at), 'MMM d, yyyy')}`}
                  </p>
                </div>
                {statusBadge(n.status)}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center">
          <Send className="size-8 text-zinc-200 mx-auto mb-3" />
          <p className="font-semibold text-zinc-400 mb-1">No newsletters yet</p>
          <p className="text-sm text-zinc-300 mb-6">Write your first edition and send it to all {memberCount} members</p>
          <Link
            href="/admin/newsletter/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)', color: '#0d0d0d' }}
          >
            <Plus className="size-4" /> Write first edition
          </Link>
        </div>
      )}

      {/* Quick compose if no drafts open */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
        <h2 className="text-sm font-bold text-zinc-700 mb-5 flex items-center gap-2">
          <Plus className="size-4 text-[#E8503A]" /> Quick compose
        </h2>
        <NewsletterForm memberCount={memberCount} />
      </div>
    </div>
  )
}
