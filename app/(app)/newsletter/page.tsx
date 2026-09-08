import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Mail } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Public archive of past newsletters — links out to each issue's existing
// public teaser page (app/(app)/newsletter/[id]/page.tsx), which already
// only shows public-safe content. RLS on `newsletters` is admin-only, so
// this reads via the service-role client same as the teaser page does.
//
// Logged-in members hit this same route (app/(app)/layout.tsx only skips
// its member chrome for logged-out visitors), so it renders two ways: a
// full marketing page with its own header/signup-CTA for logged-out
// visitors, and a bare content-only version for members, who already have
// AppTopNav/AppFooter wrapping it and don't need a "join TALK" pitch.
export const dynamic = 'force-dynamic'

const N = {
  navA: '#0F1F35', navB: '#162D4A', navy: '#1E4B82',
  pageBg: '#F5F8FC', cardBg: '#ffffff', border: '#DDE6F0',
  red: '#E8503A', text: '#0F1F35', muted: '#5A7090',
}

export default async function NewsletterArchivePage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  const [{ data: { user } }, { data: newsletters }] = await Promise.all([
    supabase.auth.getUser(),
    adminDb
      .from('newsletters')
      .select('id, subject, preview_text, sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false }),
  ])

  const issues: { id: string; subject: string; preview_text: string | null; sent_at: string }[] = newsletters ?? []
  const isMember = !!user

  const list = issues.length === 0 ? (
    <div className="rounded-2xl border p-10 text-center mb-10" style={{ borderColor: N.border, background: N.cardBg }}>
      <Mail className="size-6 mx-auto mb-3" style={{ color: N.muted }} />
      <p className="text-sm" style={{ color: N.muted }}>No issues published yet — check back soon.</p>
    </div>
  ) : (
    <div className="rounded-2xl border overflow-hidden mb-10" style={{ borderColor: N.border, background: N.cardBg }}>
      {issues.map((n, i) => (
        <Link
          key={n.id}
          href={`/newsletter/${n.id}`}
          className="group flex items-start justify-between gap-4 px-6 py-5 hover:bg-black/[0.02] transition-colors"
          style={i < issues.length - 1 ? { borderBottom: `1px solid ${N.border}` } : undefined}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: N.navy }}>
              {format(new Date(n.sent_at), 'MMMM d, yyyy')}
            </p>
            <p className="font-bold" style={{ color: N.text }}>{n.subject}</p>
            {n.preview_text && (
              <p className="text-sm mt-1 line-clamp-2" style={{ color: N.muted }}>{n.preview_text}</p>
            )}
          </div>
          <ArrowRight className="size-4 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" style={{ color: N.muted }} />
        </Link>
      ))}
    </div>
  )

  if (isMember) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: N.red }}>TALK Newsletter</p>
        <h1 className="text-3xl font-black tracking-tight mb-3" style={{ color: N.text }}>The archive</h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: N.muted }}>
          Past issues of the weekly TALK newsletter — pulled straight from your inbox.
        </p>
        {list}
      </div>
    )
  }

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
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3" style={{ color: N.text }}>The archive</h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: N.muted }}>
          Past issues of the weekly TALK newsletter — a look at what talent acquisition leaders in the community are reading.
        </p>

        {list}

        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${N.navA} 0%, ${N.navB} 55%, #1A3A5C 100%)` }}>
          <p className="text-xl font-black text-white mb-2">Get it in your inbox.</p>
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
