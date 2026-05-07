'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  profile: Profile
}

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/vendors', label: 'Vendors', icon: Building2 },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/polls', label: 'Polls', icon: BarChart2 },
  { href: '/chapters', label: 'Chapters', icon: BookOpen },
  { href: '/chat', label: 'Chat', icon: Hash },
  { href: '/messages', label: 'Messages', icon: Mail },
]

export default function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col h-full text-indigo-100" style={{background: 'linear-gradient(180deg, #1e1b4b 0%, #16133d 100%)'}}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
            <span className="text-sm font-black text-amber-950 tracking-tighter">T</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-black tracking-tight text-white leading-none">TALK</p>
            <p className="text-[10px] text-indigo-400 mt-0.5 leading-tight">Talent Acquisition<br />Leadership Keynotes</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-indigo-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('size-4 flex-shrink-0', active ? 'text-indigo-600' : '')} />
              {label}
            </Link>
          )
        })}

        {profile.role === 'admin' && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest">Admin</p>
            </div>
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                pathname.startsWith('/admin')
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-indigo-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <Settings className={cn('size-4 flex-shrink-0', pathname.startsWith('/admin') ? 'text-indigo-600' : '')} />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl transition-all duration-150 group border',
            pathname === '/profile'
              ? 'bg-white/10 border-white/20'
              : 'border-transparent hover:bg-white/8 hover:border-white/10'
          )}
        >
          <Avatar className="size-8 ring-2 ring-amber-400/50 shrink-0">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ''} />
            )}
            <AvatarFallback className="text-xs font-bold" style={{background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white'}}>
              {profile.full_name?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
            <p className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
              Edit profile →
            </p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-indigo-400 hover:text-white hover:bg-white/10 rounded-lg"
          onClick={handleSignOut}
        >
          <LogOut className="size-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
