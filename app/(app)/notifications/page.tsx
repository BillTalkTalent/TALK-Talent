import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { revalidatePath } from 'next/cache'

async function markAllRead() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  revalidatePath('/notifications')
}

async function dismissNotification(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('notifications').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/notifications')
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notifications } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = notifications ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)' }}>
            <Bell className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Notifications</h1>
            <p className="text-sm text-zinc-500">{items.length} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={markAllRead}>
            <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Check className="size-3.5" /> Mark all read
            </button>
          </form>
          <Link href="/notifications/settings" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            <Settings className="size-3.5" /> Settings
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <Bell className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No notifications</p>
          <p className="text-sm text-zinc-400 mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm divide-y divide-zinc-100">
          {items.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-zinc-50/50 transition-colors">
              {!n.is_read && <span className="mt-1.5 size-2 rounded-full bg-[#00d4aa] shrink-0" aria-label="unread" />}
              {n.is_read && <span className="mt-1.5 size-2 shrink-0" />}
              <div className="flex-1 min-w-0">
                {n.link ? (
                  <Link href={n.link} className="block">
                    <p className={`text-sm ${n.is_read ? 'text-zinc-600' : 'text-zinc-900 font-semibold'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>}
                  </Link>
                ) : (
                  <>
                    <p className={`text-sm ${n.is_read ? 'text-zinc-600' : 'text-zinc-900 font-semibold'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>}
                  </>
                )}
                <p className="text-xs text-zinc-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              <form action={dismissNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="text-zinc-300 hover:text-zinc-600 transition-colors" aria-label="Dismiss">
                  <X className="size-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
