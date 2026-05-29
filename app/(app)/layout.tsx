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

  // Send new members through onboarding
  // (welcome is outside this layout group so no redirect loop possible)
  if (!(profile as any).has_onboarded) { // eslint-disable-line @typescript-eslint/no-explicit-any
    redirect('/welcome')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F5F8FC' }}>
      <AppTopNav profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
        <footer className="border-t border-zinc-100 py-4 px-6 mt-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400">© {new Date().getFullYear()} TALK Community</span>
            <div className="flex items-center gap-5 text-xs text-zinc-400">
              <a href="https://talktalent.com/privacy" className="hover:text-zinc-600 transition-colors">Privacy</a>
              <a href="https://talktalent.com/terms" className="hover:text-zinc-600 transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
