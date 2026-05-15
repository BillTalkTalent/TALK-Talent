import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SettingsForm from './settings-form'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prefs } = await (supabase as any)
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/notifications" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Back to notifications
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Notification Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Choose what you want to be notified about.</p>
      </div>
      <SettingsForm userId={user.id} initialPrefs={prefs} />
    </div>
  )
}
