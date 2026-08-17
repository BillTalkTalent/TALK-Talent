import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowRight, MapPin, Monitor, Users, MessageSquare, CalendarDays, Briefcase } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatInZone } from '@/lib/timezone'
import { getUpcomingEventsForNewsletter } from '@/lib/newsletter-events'
import { getNewsletterStats } from '@/lib/newsletter-stats'

// Public, unauthenticated teaser for a sent newsletter — the landing page a
// LinkedIn share link points to. Deliberately shows only public-safe
// content (intro, real upcoming events, real weekly stats, a short teaser
// of the TALK News section) and gates the rest behind "Apply to join" —
// same reasoning as the public event teaser: real content builds trust,
// but member-highlight/industry-news/career sections aren't meant for an
// outside audience. Uses the service-role client since newsletters RLS is
// admin-only.
export const dynamic = 'force-dynamic'

const N = {
  navA: '#0F1F35', navB: '#162D4A', navy: '#1E4B82', navyMid: '#2563EB',
  pageBg: '#F5F8FC', cardBg: '#ffffff', border: '#DDE6F0',
  red: '#E8503A', text: '#0F1F35', muted: '#5A7090',
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export default async function PublicNewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  const { data: newsletter } = await adminDb
    .from('newsletters')
    .select('id, subject, preview_text, intro, sections_json, status, sent_at')
    .eq('id', id)
    .single()

  // Live once scheduled (so a link prepped ahead of a scheduled send
  // resolves right away, not just after it fires) or sent. Still 404s for
  // plain drafts, so an in-progress edit can't leak via a guessed ID.
  if (!newsletter || (newsletter.status !== 'sent' && newsletter.status !== 'scheduled')) notFound()

  const [upcomingEvents, stats] = await Promise.all([
    getUpcomingEventsForNewsletter(adminDb, 3),
    getNewsletterStats(adminDb),
  ])

  const sections = newsletter.sections_json ?? {}
  const teaserRaw = stripHtml(sections.talk_news || '')
  const teaser = teaserRaw.length > 260 ? `${teaserRaw.slice(0, 260)}…` : teaserRaw

  const statTiles = [
    { n: stats.newMembers, label: 'New members', icon: Users },
    { n: stats.forumPosts, label: 'Forum posts', icon: MessageSquare },
    { n: stats.eventRsvps, label: 'Event RSVPs', icon: CalendarDays },
    { n: stats.newJobs, label: 'New jobs', icon: Briefcase },
  ]
  const hasStats = statTiles.some(t => t.n > 0)

  return (
    <div className="min-h-screen font-sans" style={{ background: N.pageBg, color: N.text }}>
      <header className="px-6 py-5" style={{ background: `linear-gradient(90deg, ${N.navA}, ${N.navB})` }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-baseline" style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>
            <span style={{ color: N.red }}>TA</span><span style={{ color: 'white' }}>LK</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Sign in</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: N.red }}>TALK Newsletter</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3" style={{ color: N.text }}>{newsletter.subject}</h1>
        {newsletter.sent_at && (
          <p className="text-sm mb-8" style={{ color: N.muted }}>{format(new Date(newsletter.sent_at), 'MMMM d, yyyy')}</p>
        )}

        {newsletter.intro && (
          <p className="text-lg leading-relaxed mb-10" style={{ color: N.muted }}>{newsletter.intro}</p>
        )}

        {hasStats && (
          <div className="rounded-2xl border mb-8" style={{ borderColor: N.border, background: N.cardBg }}>
            <p className="px-6 pt-5 text-xs font-bold uppercase tracking-widest" style={{ color: N.muted }}>This week in TALK</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 pt-4">
              {statTiles.map(t => (
                <div key={t.label} className="text-center">
                  <t.icon className="size-4 mx-auto mb-1.5" style={{ color: N.navy }} />
                  <p className="text-2xl font-black" style={{ color: N.text }}>{t.n.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: N.muted }}>{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: N.muted }}>Upcoming events</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {upcomingEvents.map(e => {
                const tz = e.timezone || 'America/New_York'
                const month = formatInZone(e.event_date, tz, { month: 'short', weekday: undefined, day: undefined, year: undefined, hour: undefined, minute: undefined, timeZoneName: undefined }).toUpperCase()
                const day = formatInZone(e.event_date, tz, { day: 'numeric', weekday: undefined, month: undefined, year: undefined, hour: undefined, minute: undefined, timeZoneName: undefined })
                return (
                  <Link key={e.id} href={`/events/${e.id}`} className="rounded-xl border p-4 hover:shadow-sm transition-all block" style={{ borderColor: N.border, background: N.cardBg }}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 rounded-lg py-1 text-center shrink-0" style={{ background: `${N.navB}15` }}>
                        <div className="text-[8px] font-bold uppercase" style={{ color: N.navy }}>{month}</div>
                        <div className="text-sm font-black leading-tight" style={{ color: N.navA }}>{day}</div>
                      </div>
                      <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: N.text }}>{e.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: N.muted }}>
                      {e.is_virtual ? <><Monitor className="size-3.5" /> Virtual</> : <><MapPin className="size-3.5" /> <span className="truncate">{e.location ?? 'In person'}</span></>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {teaser && (
          <div className="relative rounded-2xl border overflow-hidden mb-10" style={{ borderColor: N.border, background: N.cardBg }}>
            <div className="p-6 pb-16">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: N.red }}>TALK News</p>
              <p className="text-[15px] leading-relaxed" style={{ color: N.muted }}>{teaser}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: `linear-gradient(180deg, transparent, ${N.cardBg})` }} />
          </div>
        )}

        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${N.navA} 0%, ${N.navB} 55%, #1A3A5C 100%)` }}>
          <p className="text-xl font-black text-white mb-2">Read the full newsletter.</p>
          <p className="text-sm text-white/70 mb-6 max-w-md mx-auto">
            TALK is a private, invite-only community for TA leaders — join to get the full weekly newsletter, member discussions, events, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] text-white"
              style={{ background: N.red }}
            >
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition-all">
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
