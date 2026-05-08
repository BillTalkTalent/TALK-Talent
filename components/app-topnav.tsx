'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  MessageSquare,
  Hash,
  Mail,
  Settings,
  LogOut,
  Briefcase,
  BarChart2,
  BookOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface AppTopNavProps {
  profile: Profile
}

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members',   label: 'Members',   icon: Users },
  { href: '/events',    label: 'Events',     icon: Calendar },
  { href: '/forum',     label: 'Forum',      icon: MessageSquare },
  { href: '/jobs',      label: 'Jobs',       icon: Briefcase },
  { href: '/polls',     label: 'Polls',      icon: BarChart2 },
  { href: '/chapters',  label: 'Chapters',   icon: BookOpen },
  { href: '/vendors',   label: 'Vendors',    icon: Building2 },
]

const iconNav = [
  { href: '/chat',     label: 'Chat',     icon: Hash },
  { href: '/messages', label: 'Messages', icon: Mail },
]

export default function AppTopNav({ profile }: AppTopNavProps) {
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)' }}
    >
      <div className="px-5 flex items-center h-14 gap-1">

        {/* ── Logo ── */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-5 shrink-0">
          {/* Icon mark: rounded square + two lines */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="34" height="34" rx="9" fill="#00d4aa"/>
            <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
          </svg>
          {/* Wordmark */}
          <span
            className="hidden sm:block font-black tracking-tight text-white"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
          >
            TALK
          </span>
        </Link>

        {/* ── Main nav ── */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-[#00d4aa] text-[#0d0d0d] shadow-sm font-semibold'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'text-[#0d0d0d]' : '')} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* ── Icon nav + admin + profile ── */}
        <div className="flex items-center gap-1 ml-3 shrink-0">
          {iconNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  'flex items-center justify-center size-9 rounded-lg transition-all',
                  active
                    ? 'bg-[#00d4aa] text-[#0d0d0d]'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="size-4" />
              </Link>
            )
          })}

          {profile.role === 'admin' && (
            <Link
              href="/admin"
              title="Admin Panel"
              className={cn(
                'flex items-center justify-center size-9 rounded-lg transition-all',
                pathname.startsWith('/admin')
                  ? 'bg-[#00d4aa] text-[#0d0d0d]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Settings className="size-4" />
            </Link>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Profile */}
          <Link
            href="/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/15 transition-colors group"
          >
            <Avatar className="size-7 ring-2 ring-[#00d4aa]/60 shrink-0">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ''} />
              )}
              <AvatarFallback
                className="text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d' }}
              >
                {profile.full_name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-white/70 hidden md:block group-hover:text-white transition-colors">
              {profile.full_name?.split(' ')[0]}
            </span>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center justify-center size-9 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-all"
          >
            <LogOut className="size-4" />
          </button>
        </div>

      </div>
    </header>
  )
}
