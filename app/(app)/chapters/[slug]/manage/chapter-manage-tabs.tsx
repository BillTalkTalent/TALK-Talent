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

type LeadProfile = { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null }

export default function ChapterManageTabs({
  chapterId,
  chapterName,
  slug,
  currentUserId,
  roster,
  leads,
  leadIds,
  events,
  stats,
}: {
  chapterId: string
  chapterName: string
  slug: string
  currentUserId: string
  roster: RosterMember[]
  leads: LeadProfile[]
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

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Everything here is scoped to {chapterName} only — nothing you do affects other chapters.
          </p>

          <div className="pt-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Leadership team {leads.length > 0 && `(${leads.length})`}
            </p>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No leads assigned yet — TALK admins manage who leads this chapter.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/members/${lead.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors"
                  >
                    <Avatar className="size-9 ring-2 ring-amber-200">
                      {lead.avatar_url && <AvatarImage src={lead.avatar_url} alt={lead.full_name ?? ''} />}
                      <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-700">
                        {getInitials(lead.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">{lead.full_name}</p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <Star className="size-2.5 fill-amber-500 text-amber-500" /> Lead
                        </span>
                      </div>
                      {(lead.title || lead.company) && (
                        <p className="text-xs text-muted-foreground">{[lead.title, lead.company].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-border">
            <QuickLink icon={Users} label="View roster" onClick={() => setTab('roster')} />
            <QuickLink icon={Calendar} label="Manage events" onClick={() => setTab('events')} />
            <QuickLink icon={Mail} label="Message chapter" onClick={() => setTab('message')} />
          </div>
          <div className="pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="size-4" />
            <span>The chapter board is a separate, always-on discussion — visit it from the </span>
            <Link href={`/chapters/${slug}`} className="text-accent font-medium hover:underline">chapter page</Link>.
          </div>
        </div>
      )}

      {tab === 'roster' && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">{roster.length} member{roster.length !== 1 ? 's' : ''}</h3>
            <span className="text-xs text-muted-foreground">Lead assignment is managed by TALK admins</span>
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No members yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {roster.map((m) => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/60 -mx-2 px-2 rounded-lg transition-colors">
                  <Avatar size="sm">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ''} />}
                    <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{m.full_name ?? 'Unknown'}</p>
                    {(m.title || m.company) && (
                      <p className="text-xs text-muted-foreground truncate">{[m.title, m.company].filter(Boolean).join(' · ')}</p>
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
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">{chapterName} events</h3>
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
            <p className="text-sm text-muted-foreground italic">No events yet — create one to get started.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {events.map((ev) => {
                const canEdit = ev.status === 'draft'
                return (
                  <div key={ev.id} className="flex items-center gap-3 py-3">
                    <div className="w-11 text-center shrink-0 tabular-nums">
                      <div className="text-[10px] font-bold text-primary uppercase">
                        {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short' })}
                      </div>
                      <div className="text-base font-bold text-foreground">
                        {new Date(ev.event_date).toLocaleDateString(undefined, { day: '2-digit' })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ev.is_virtual ? 'Virtual' : (ev.venue_name || ev.location || 'In person')}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0', STATUS_STYLE[ev.status] ?? STATUS_STYLE.draft)}>
                      {ev.status}
                    </span>
                    {ev.visibility === 'leads_only' && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 bg-violet-50 text-violet-600 border-violet-100">
                        Leads only
                      </span>
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditEventForm(ev)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => onDelete(ev.id)} disabled={deleting === ev.id} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
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
    <div className="rounded-xl bg-card border border-border px-4 py-3">
      <div className="text-xl font-bold text-foreground tabular-nums">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function QuickLink({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border px-4 py-3 text-left hover:border-accent/40 hover:bg-muted/60 transition-colors"
    >
      <Icon className="size-4 text-accent" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  )
}
