import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)' }}
      >
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="34" height="34" rx="9" fill="#00d4aa"/>
            <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
          </svg>
          <span className="text-white font-bold text-sm">Admin Panel</span>
          <span className="text-white/30 text-xs font-medium px-2 py-0.5 rounded-full border border-white/20">
            TALK
          </span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-3.5" />
          Back to Community
        </Link>
      </header>

      {/* Admin sub-nav */}
      <div className="border-b border-zinc-100 bg-white px-6 py-2 flex items-center gap-1 overflow-x-auto">
        {[
          { href: '/admin',               label: 'Overview' },
          { href: '/admin/members',       label: 'Members' },
          { href: '/admin/events',        label: 'Events' },
          { href: '/admin/jobs',          label: 'Jobs' },
          { href: '/admin/vendors',       label: 'Vendors' },
          { href: '/admin/newsletter',    label: 'Newsletter' },
          { href: '/admin/suggestions',   label: 'Suggestions & Invites' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all whitespace-nowrap"
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  )
}
