'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Star, Calendar, MessageSquare, Users, Mail, Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ChapterEventForm, { type ChapterManageEvent } from './chapter-event-form'
import ChapterEmailComposer from './chapter-email-composer'

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

type RosterMember = { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null; joined_at: string }

const TABS = ['overview', 'roster', 'events', 'message'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  roster: 'Roster & Roles',
  events: 'Events',
  message: 'Message chapter',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-600 border-amber-100',
  published: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export default function ChapterManageTabs({
  chapterId,
  chapterName,
  slug,
  currentUserId,
  roster,
  leadIds,
  events,
  stats,
}: {
  chapterId: string
  chapterName: string
  slug: string
  currentUserId: string
  roster: RosterMember[]
  leadIds: string[]
  events: ChapterManageEvent[]
  stats: { roster: number; upcomingEvents: number; boardThreads: number; leads: number }
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ChapterManageEvent | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const leadSet = new Set(leadIds)

  function openNewEventForm() {
    setEditingEvent(null)
    setFormOpen(true)
  }

  function openEditEventForm(ev: ChapterManageEvent) {
    setEditingEvent(ev)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingEvent(null)
  }

  function onSaved() {
    closeForm()
    router.refresh()
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this draft event? This can\'t be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('events').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat n={stats.roster} label="Roster" />
        <Stat n={stats.upcomingEvents} label="Upcoming events" />
        <Stat n={stats.boardThreads} label="Board threads" />
        <Stat n={stats.leads} label={stats.leads === 1 ? 'Lead' : 'Leads'} />
      </div>

      <div className="flex gap-1 border-b border-zinc-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t ? 'border-[#1E4B82] text-[#1E4B82]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
          <p className="text-sm text-zinc-500">
            Everything here is scoped to {chapterName} only — nothing you do affects other chapters.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <QuickLink icon={Users} label="View roster" onClick={() => setTab('roster')} />
            <QuickLink icon={Calendar} label="Manage events" onClick={() => setTab('events')} />
            <QuickLink icon={Mail} label="Message chapter" onClick={() => setTab('message')} />
          </div>
          <div className="pt-4 border-t border-zinc-100 flex items-center gap-2 text-sm text-zinc-500">
            <MessageSquare className="size-4" />
            <span>The chapter board is a separate, always-on discussion — visit it from the </span>
            <Link href={`/chapters/${slug}`} className="text-[#1E4B82] font-medium hover:underline">chapter page</Link>.
          </div>
        </div>
      )}

      {tab === 'roster' && (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">{roster.length} member{roster.length !== 1 ? 's' : ''}</h3>
            <span className="text-xs text-zinc-400">Lead assignment is managed by TALK admins</span>
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No members yet.</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {roster.map((m) => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 py-2.5 hover:bg-zinc-50/60 -mx-2 px-2 rounded-lg transition-colors">
                  <Avatar size="sm">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ''} />}
                    <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">{m.full_name ?? 'Unknown'}</p>
                    {(m.title || m.company) && (
                      <p className="text-xs text-zinc-400 truncate">{[m.title, m.company].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  {leadSet.has(m.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                      <Star className="size-2.5 fill-amber-500 text-amber-500" /> Lead
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">{chapterName} events</h3>
            {!formOpen && (
              <Button size="sm" onClick={openNewEventForm}>
                <Plus className="size-4" /> New event
              </Button>
            )}
          </div>

          {formOpen ? (
            <ChapterEventForm
              chapterId={chapterId}
              organizerId={currentUserId}
              event={editingEvent}
              onSaved={onSaved}
              onCancel={closeForm}
            />
          ) : events.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No events yet — create one to get started.</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {events.map((ev) => {
                const canEdit = ev.status === 'draft'
                return (
                  <div key={ev.id} className="flex items-center gap-3 py-3">
                    <div className="w-11 text-center shrink-0">
                      <div className="text-[10px] font-bold text-[#E8503A] uppercase">
                        {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short' })}
                      </div>
                      <div className="text-base font-bold text-zinc-900">
                        {new Date(ev.event_date).toLocaleDateString(undefined, { day: '2-digit' })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{ev.title}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {ev.is_virtual ? 'Virtual' : (ev.venue_name || ev.location || 'In person')}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0', STATUS_STYLE[ev.status] ?? STATUS_STYLE.draft)}>
                      {ev.status}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditEventForm(ev)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => onDelete(ev.id)} disabled={deleting === ev.id} className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'message' && <ChapterEmailComposer chapterId={chapterId} chapterName={chapterName} />}
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-100 px-4 py-3">
      <div className="text-xl font-bold text-zinc-900 tabular-nums">{n}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  )
}

function QuickLink({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-4 py-3 text-left hover:border-zinc-200 hover:bg-zinc-50/60 transition-colors"
    >
      <Icon className="size-4 text-[#1E4B82]" />
      <span className="text-sm font-medium text-zinc-700">{label}</span>
    </button>
  )
}
