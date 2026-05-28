'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Home,
  Users,
  Building2,
  Calendar,
  MessageSquare,
  MessagesSquare,
  Settings,
  LogOut,
  Briefcase,
  BarChart2,
  BookOpen,
  GraduationCap,
  Bell,
  Zap,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

interface AppTopNavProps {
  profile: Profile
}

const mainNav = [
  { href: '/dashboard', label: 'Home',       icon: Home },
  { href: '/members',   label: 'Members',    icon: Users },
  { href: '/events',    label: 'Events',     icon: Calendar },
  { href: '/forum',     label: 'Forums',     icon: MessageSquare },
  { href: '/messages',  label: 'Chats',      icon: MessagesSquare },
  { href: '/jobs',      label: 'Jobs',       icon: Briefcase },
  { href: '/polls',     label: 'Polls',      icon: BarChart2 },
  { href: '/chapters',  label: 'Chapters',   icon: BookOpen },
  { href: '/vendors',   label: 'Vendors',    icon: Building2 },
  { href: '/mentorship',label: 'Mentorship', icon: GraduationCap },
  { href: '/talent',    label: 'Talent Pool',icon: Zap },
]


export default function AppTopNav({ profile }: AppTopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchUnread() {
      // Count messages in my conversations where I'm not the sender and is_read = false
      const { data: convs } = await supabase
        .from('dm_conversations')
        .select('id')
        .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)

      if (!convs || convs.length === 0) return

      const convIds = convs.map(c => c.id)
      const { count } = await supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', profile.id)
        .eq('is_read', false)

      setUnreadCount(count ?? 0)
    }

    fetchUnread()

    // Subscribe to new messages
    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
      }, (payload) => {
        const msg = payload.new as { sender_id: string }
        if (msg.sender_id !== profile.id) {
          setUnreadCount(c => c + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  // Reset unread when visiting messages
  useEffect(() => {
    if (pathname.startsWith('/messages')) setUnreadCount(0)
  }, [pathname])

  // Notifications: load unread count + subscribe to new ones
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setNotifCount(count ?? 0))

    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => setNotifCount(c => c + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  // Close notification dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function openNotifications() {
    const opening = !notifOpen
    setNotifOpen(opening)
    if (!opening) return

    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(15)

    setNotifications(data ?? [])

    // Mark all as read
    if (notifCount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      setNotifCount(0)
    }
  }

  function handleNotifClick(link: string | null) {
    setNotifOpen(false)
    if (link) router.push(link)
  }

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
        <Link href="/dashboard" className="flex items-center gap-2 mr-5 shrink-0">
          {/* Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="34" style={{ width: 'auto' }} aria-hidden="true">
            <defs>
              <linearGradient id="purpleAccent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#9B5CFF"/>
                <stop offset="100%" stopColor="#6F2CFF"/>
              </linearGradient>
            </defs>
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
          </svg>
          {/* Wordmark */}
          <span className="font-black text-white tracking-tight" style={{ fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
            T<span className="relative inline-block">
              A
              <span className="absolute rounded-full" style={{ width: 6, height: 6, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 3, left: '50%', transform: 'translateX(-50%)' }} />
            </span>LK
          </span>
        </Link>

        {/* ── Main nav ── */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isMessages = href === '/messages'
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-[#F07058] text-[#0d0d0d] font-semibold'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
                {isMessages && unreadCount > 0 && (
                  <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Right-side controls: bell + admin + profile ── */}
        <div className="flex items-center gap-1 ml-3 shrink-0">

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotifications}
              title="Notifications"
              className={cn(
                'relative flex items-center justify-center size-9 rounded-lg transition-all',
                notifOpen
                  ? 'bg-[#F07058] text-[#0d0d0d]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Bell className="size-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-1 leading-none">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl border border-zinc-100 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900">Notifications</span>
                  {notifications.some(n => !n.is_read) && (
                    <span className="text-xs text-[#E8503A] font-semibold">Marked as read</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="size-8 text-zinc-200 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n.link)}
                        className={cn(
                          'w-full text-left px-4 py-3 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors',
                          !n.is_read && 'bg-[#F07058]/5'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.is_read && (
                            <span className="mt-1.5 size-1.5 rounded-full bg-[#F07058] shrink-0" />
                          )}
                          <div className={cn('flex-1 min-w-0', n.is_read && 'ml-4')}>
                            <p className="text-sm font-semibold text-zinc-900 truncate">{n.title}</p>
                            {n.body && (
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                {n.type === "forum_topic" ? `New post in ${n.body}` : n.body}
                              </p>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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

          {/* Profile dropdown */}
          <div className="relative group/profile">
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/15 transition-colors">
              <Avatar className="size-7 ring-2 ring-[#F07058]/60 shrink-0">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ''} />
                )}
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)', color: '#0d0d0d' }}
                >
                  {profile.full_name?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-white/70 hidden md:block group-hover/profile:text-white transition-colors">
                {profile.full_name?.split(' ')[0]}
              </span>
            </button>
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white shadow-lg border border-zinc-100 py-1 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all z-50">
              <Link href="/profile" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                My Profile
              </Link>
              <Link href="/registrations" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                My Registrations
              </Link>
            </div>
          </div>

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
