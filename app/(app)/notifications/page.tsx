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
          <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)' }}>
            <Bell className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">{items.length} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={markAllRead}>
            <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Check className="size-3.5" /> Mark all read
            </button>
          </form>
          <Link href="/notifications/settings" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="size-3.5" /> Settings
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <Bell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors">
              {!n.is_read && <span className="mt-1.5 size-2 rounded-full bg-[#F07058] shrink-0" aria-label="unread" />}
              {n.is_read && <span className="mt-1.5 size-2 shrink-0" />}
              <div className="flex-1 min-w-0">
                {n.link ? (
                  <Link href={n.link} className="block">
                    <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </Link>
                ) : (
                  <>
                    <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </>
                )}
                <p className="text-xs text-muted-foreground/70 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              <form action={dismissNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" aria-label="Dismiss">
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
