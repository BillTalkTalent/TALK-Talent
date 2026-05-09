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
  GraduationCap,
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
  { href: '/events',    label: 'Events & Classes', icon: Calendar },
  { href: '/forum',     label: 'Forum',      icon: MessageSquare },
  { href: '/jobs',      label: 'Jobs',       icon: Briefcase },
  { href: '/polls',     label: 'Polls',      icon: BarChart2 },
  { href: '/chapters',   label: 'Chapters',    icon: BookOpen },
  { href: '/vendors',    label: 'Vendors',     icon: Building2 },
  { href: '/mentorship', label: 'Mentorship',  icon: GraduationCap },
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
      className="sticky top-0 z-50"
      style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)' }}
    >
      <div className="px-5 flex items-center h-14 gap-1">

        {/* ── Logo ── */}
        <Link href="/dashboard" className="flex items-center mr-5 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 500" height="38" style={{ width: 'auto' }} aria-label="TALK">
            <defs>
              <linearGradient id="purpleAccent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#9B5CFF"/>
                <stop offset="100%" stopColor="#6F2CFF"/>
              </linearGradient>
            </defs>
            {/* Icon */}
            <g transform="translate(110 95)">
              <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z"
                fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
              <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z"
                fill="url(#purpleAccent)"/>
              <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z"
                fill="#FFFFFF"/>
              <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
              <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z"
                fill="#000000" opacity="0.92"/>
            </g>
            {/* Wordmark */}
            <g transform="translate(610 128)" fontFamily="Poppins, Arial Black, sans-serif" fontWeight="900" fontSize="235" fill="#FFFFFF">
              <text x="0" y="235">T</text>
              {/* Custom A with purple dot */}
              <path d="M240 235 L338 0 H395 L493 235 H432 L414 190 H318 L300 235 Z M337 140 H395 L366 65 Z" fill="#FFFFFF"/>
              <circle cx="366" cy="198" r="28" fill="url(#purpleAccent)"/>
              <text x="530" y="235">LK</text>
            </g>
          </svg>
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
                    ? 'bg-[#00d4aa] text-[#0d0d0d] font-semibold'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="size-4 shrink-0" />
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
                  ? 'bg-white/25 text-white'
                  : 'text-white/60 hover:bg-white/15 hover:text-white'
              )}
            >
              <Settings className="size-4" />
            </Link>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-white/25 mx-1" />

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
            className="flex items-center justify-center size-9 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all"
          >
            <LogOut className="size-4" />
          </button>
        </div>

      </div>
    </header>
  )
}
