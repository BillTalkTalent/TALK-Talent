import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Star } from 'lucide-react'
import ChapterManageTabs from './chapter-manage-tabs'

export default async function ChapterManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chapter } = await (supabase as any)
    .from('chapters')
    .select('*')
    .eq('slug', slug)
    .single()
  if (!chapter) notFound()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leadRow } = await (supabase as any)
    .from('chapter_leads')
    .select('id')
    .eq('chapter_id', chapter.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = currentProfile?.role === 'admin'
  const isLead = !!leadRow
  if (!isAdmin && !isLead) redirect(`/chapters/${slug}`)

  const [rosterResult, leadsResult, eventsResult, boardCountResult] = await Promise.all([
    supabase
      .from('chapter_memberships')
      .select('user_id, joined_at, profiles(id, full_name, avatar_url, title, company)')
      .eq('chapter_id', chapter.id)
      .order('joined_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('chapter_leads')
      .select('user_id, profiles(id, full_name, avatar_url)')
      .eq('chapter_id', chapter.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('events')
      .select('id, title, description, venue_name, location, event_type, is_virtual, virtual_url, event_date, end_date, timezone, max_attendees, status, image_url')
      .eq('chapter_id', chapter.id)
      .order('event_date', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('chapter_posts')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter.id),
  ])

  type MemberProfile = { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roster = (rosterResult.data ?? []).map((r: any) => ({ ...(r.profiles as MemberProfile), joined_at: r.joined_at })).filter((p: MemberProfile) => p?.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadIds = new Set((leadsResult.data ?? []).map((l: any) => l.user_id))
  const events = eventsResult.data ?? []
  const now = new Date()
  const upcomingCount = events.filter((e: { event_date: string; status: string }) => e.status !== 'cancelled' && new Date(e.event_date) >= now).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/chapters/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Back to chapter
        </Link>
        {isAdmin && (
          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-1 rounded-full uppercase tracking-wide">
            Admin
          </span>
        )}
        {!isAdmin && isLead && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
            <Star className="size-2.5 fill-amber-500 text-amber-500" /> Chapter Lead
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl flex items-center justify-center text-2xl bg-muted border border-border">
          {chapter.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Manage {chapter.name}</h1>
          <p className="text-sm text-muted-foreground">Roster, events, and chapter-wide messages — scoped to this chapter only.</p>
        </div>
      </div>

      <ChapterManageTabs
        chapterId={chapter.id}
        chapterName={chapter.name}
        slug={slug}
        currentUserId={user.id}
        roster={roster}
        leadIds={[...leadIds] as string[]}
        events={events}
        stats={{
          roster: roster.length,
          upcomingEvents: upcomingCount,
          boardThreads: boardCountResult.count ?? 0,
          leads: leadIds.size,
        }}
      />
    </div>
  )
}
