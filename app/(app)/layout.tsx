import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppTopNav from '@/components/app-topnav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (profile.status === 'pending') {
    redirect('/pending')
  }

  if (profile.status === 'rejected') {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <AppTopNav profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
