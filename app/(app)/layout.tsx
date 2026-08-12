import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AppTopNav from '@/components/app-topnav'
import AppFooter from '@/components/app-footer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // middleware.ts lets /events/[id] through logged-out so it can show a
    // public teaser instead of a login wall — render bare here too (no
    // member-only nav/footer chrome) rather than redirecting.
    const pathname = (await headers()).get('x-pathname') ?? ''
    if (pathname.startsWith('/events/')) {
      return <>{children}</>
    }
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
        <AppFooter />
      </main>
    </div>
  )
}
