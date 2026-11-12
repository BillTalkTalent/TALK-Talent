import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AppTopNav from '@/components/app-topnav'
import AppFooter from '@/components/app-footer'
import PageViewTracker from '@/components/page-view-tracker'
import IntercomMessenger from '@/components/intercom-messenger'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // middleware.ts lets /events/[id], /newsletter (the archive list), and
    // /newsletter/[id] through logged-out so they can show public content
    // instead of a login wall — render bare here too (no member-only
    // nav/footer chrome) rather than redirecting.
    const pathname = (await headers()).get('x-pathname') ?? ''
    if (pathname.startsWith('/events/') || pathname.startsWith('/newsletter')) {
      return <>{children}</>
    }
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // A member converted to a vendor contact (or anyone who only ever had a
  // vendor account) has no usable profile here — !profile or 'rejected'
  // either way. Bouncing them to /login with no explanation looks like a
  // broken sign-in: they already authenticated, land back on the login
  // screen, and reasonably assume it didn't take. Check whether they're
  // actually a vendor contact before giving up, and send them to the
  // portal that's actually theirs.
  if (!profile || profile.status === 'rejected') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vendorAccount } = await (supabase as any)
      .from('vendor_accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (vendorAccount) {
      redirect('/vendor-portal')
    }
    redirect('/login')
  }

  if (profile.status === 'pending') {
    redirect('/pending')
  }

  // Send new members through onboarding
  // (welcome is outside this layout group so no redirect loop possible)
  if (!(profile as any).has_onboarded) { // eslint-disable-line @typescript-eslint/no-explicit-any
    redirect('/welcome')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F5F8FC' }}>
      <PageViewTracker />
      <IntercomMessenger
        userId={user.id}
        email={profile.email}
        name={profile.full_name}
        createdAt={user.created_at}
      />
      <AppTopNav profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
        <AppFooter />
      </main>
    </div>
  )
}
