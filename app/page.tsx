import Link from 'next/link'
import {
  Users, CalendarDays, MessageSquare, Briefcase,
  GraduationCap, Building2, ArrowRight,
  CheckCircle2, Lock, Zap, Globe
} from 'lucide-react'

// Navy palette constants
const N = {
  navA:    '#0F1F35',
  navB:    '#162D4A',
  navy:    '#1E4B82',
  navyMid: '#2563EB',
  pageBg:  '#F5F8FC',
  cardBg:  '#ffffff',
  border:  '#DDE6F0',
  red:     '#E8503A',   // logo "TA" only + single primary CTA
  text:    '#0F1F35',
  muted:   '#5A7090',
}

function Wordmark({ size = 32, redColor = N.red }: { size?: number; redColor?: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
      <span style={{ color: redColor }}>TA</span>
      <span style={{ color: 'white' }}>LK</span>
    </span>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: N.pageBg, color: N.text }}>

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: `linear-gradient(90deg, ${N.navA}, ${N.navB})` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Wordmark size={26} />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold px-5 py-2 rounded-xl transition-all hover:opacity-90 text-white"
              style={{ background: N.red }}
            >
              Apply to join
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${N.navA} 0%, ${N.navB} 55%, #1A3A5C 100%)` }}>
        {/* Subtle glow orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[120px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${N.red} 0%, transparent 70%)` }} />
        <div className="absolute top-40 right-0 w-80 h-80 rounded-full opacity-8 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, #3B82F6 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center pt-40 pb-28 px-6">

          {/* Hero wordmark */}
          <div className="flex items-center justify-center mb-10">
            <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '6rem', lineHeight: 1, letterSpacing: '-0.04em', display: 'inline-flex', alignItems: 'baseline', filter: 'drop-shadow(0 0 40px rgba(232,80,58,0.25))' }}>
              <span style={{ color: N.red }}>TA</span>
              <span style={{ color: 'white' }}>LK</span>
            </span>
          </div>

          {/* Migrated-member notice — every existing member's account moved here */}
          <div className="mb-8 mx-auto max-w-2xl rounded-2xl border px-6 py-4" style={{ background: 'rgba(255,255,255,0.06)', borderColor: `${N.red}66` }}>
            <p className="text-base text-white/90 leading-relaxed">
              👋 <strong className="text-white">Coming from the old TALK site?</strong> Your account has already moved here — no need to re-register.{' '}
              <Link href="/claim" className="font-bold underline underline-offset-2" style={{ color: '#F0997B' }}>Claim your account →</Link>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold mb-8 tracking-wide uppercase" style={{ borderColor: `${N.navyMid}50`, background: `${N.navyMid}20`, color: '#93C5FD' }}>
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Now accepting applications
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-white">
            The private community<br />
            <span style={{ background: `linear-gradient(90deg, ${N.red}, #F07058)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for TA leaders.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            TALK is a curated, invite-only network where talent acquisition leaders connect, learn, and grow together — away from the noise.
          </p>

          {/* Membership stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10">
            <div className="flex items-center gap-2">
              <Users className="size-4" style={{ color: '#93C5FD' }} />
              <span className="text-sm text-white/80">
                <span className="font-black text-white">13,000+</span> members across North America
              </span>
            </div>
            <span className="hidden sm:inline text-white/20">·</span>
            <div className="flex items-center gap-2">
              <Globe className="size-4" style={{ color: '#93C5FD' }} />
              <span className="text-sm text-white/80">
                <span className="font-black text-white">Growing</span> global chapters
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02] hover:shadow-xl text-white"
              style={{ background: N.red, boxShadow: `0 8px 32px ${N.red}40` }}
            >
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white/60 hover:text-white border border-white/15 hover:border-white/30 transition-all">
              Already a member? Sign in
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/40">Membership is reviewed and approved. No spam, ever.</p>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-5xl mx-auto px-6 pb-16">
          <div className="absolute -inset-1 rounded-3xl blur-2xl opacity-20 pointer-events-none" style={{ background: `linear-gradient(135deg, ${N.navy}, ${N.navyMid})` }} />
          <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10">

            {/* Mockup nav */}
            <div className="flex items-center gap-2 px-4 h-11" style={{ background: `linear-gradient(90deg, ${N.navA}, ${N.navB})` }}>
              <span style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: '0.9rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline', marginRight: 12, flexShrink: 0 }}>
                <span style={{ color: N.red }}>TA</span><span style={{ color: 'white' }}>LK</span>
              </span>
              {[{ w: 'w-14', active: true }, { w: 'w-12' }, { w: 'w-20' }, { w: 'w-8' }, { w: 'w-10' }, { w: 'w-14' }, { w: 'w-12' }].map((item, i) => (
                <div key={i} className={`h-6 ${item.w} rounded-md`} style={{ background: item.active ? N.navy : 'rgba(255,255,255,0.1)' }} />
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="size-6 rounded-full" style={{ background: `${N.navy}99` }} />
                <div className="h-3 w-12 rounded bg-white/20" />
              </div>
            </div>

            {/* Mockup dashboard */}
            <div className="p-5 space-y-4" style={{ background: N.pageBg }}>

              {/* Banner */}
              <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${N.navA} 0%, ${N.navB} 55%, #1A3A5C 100%)` }}>
                <div className="absolute right-4 top-4 size-24 rounded-full blur-2xl opacity-20" style={{ background: N.navy }} />
                <div className="h-2.5 w-24 rounded mb-2" style={{ background: `${N.navyMid}80` }} />
                <div className="h-5 w-56 rounded bg-white/80 mb-1.5" />
                <div className="h-2.5 w-40 rounded bg-white/25" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { num: '473', label: 'Members',    grad: `linear-gradient(135deg,${N.navy},${N.navyMid})` },
                  { num: '12',  label: 'Events',     grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
                  { num: '953', label: 'Discussions',grad: 'linear-gradient(135deg,#0d9488,#14b8a6)' },
                  { num: '34',  label: 'Jobs',       grad: 'linear-gradient(135deg,#d97706,#f59e0b)' },
                ].map(({ num, label, grad }) => (
                  <div key={label} className="rounded-xl p-4 text-white relative overflow-hidden" style={{ background: grad }}>
                    <div className="text-2xl font-black leading-none mb-1">{num}</div>
                    <div className="text-[10px] text-white/70 font-medium">{label}</div>
                  </div>
                ))}
              </div>

              {/* Content cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border overflow-hidden shadow-sm" style={{ borderColor: N.border }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: N.border }}>
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-md flex items-center justify-center" style={{ background: `${N.navyMid}20` }}>
                        <div className="size-2.5 rounded-sm" style={{ background: N.navyMid }} />
                      </div>
                      <div className="h-3 w-32 rounded bg-zinc-200" />
                    </div>
                    <div className="h-2.5 w-12 rounded" style={{ background: `${N.navy}40` }} />
                  </div>
                  {['AI & the Candidate Experience', 'TA Leadership Roundtable', 'Claude Code for TA Leaders'].map((title, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0" style={{ borderColor: '#F8FAFC' }}>
                      <div className="w-9 rounded-lg py-1 text-center shrink-0" style={{ background: `${N.navB}15` }}>
                        <div className="text-[8px] font-bold uppercase" style={{ color: N.navy }}>JUN</div>
                        <div className="text-sm font-black leading-tight" style={{ color: N.navA }}>{12+i*7}</div>
                      </div>
                      <div className="text-[10px] font-semibold truncate" style={{ color: N.text }}>{title}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-white border overflow-hidden shadow-sm" style={{ borderColor: N.border }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: N.border }}>
                    <div className="h-3 w-28 rounded bg-zinc-200" />
                    <div className="h-2.5 w-12 rounded" style={{ background: `${N.navy}40` }} />
                  </div>
                  {['How are you using AI in sourcing?', 'Best ATS for a high-growth startup?', 'Negotiating comp bands in this market'].map((topic, i) => (
                    <div key={i} className="px-4 py-2.5 border-b last:border-0" style={{ borderColor: '#F8FAFC' }}>
                      <div className="text-[10px] font-semibold truncate mb-0.5" style={{ color: N.text }}>{topic}</div>
                      <div className="text-[9px]" style={{ color: N.muted }}>{['2h', '4h', '6h'][i]} ago · {[24,18,12][i]} replies</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <div className="border-y py-5 px-6" style={{ borderColor: N.border, background: N.cardBg }}>
        <p className="text-center text-xs font-semibold uppercase tracking-widest" style={{ color: N.muted }}>Trusted by TA leaders from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
          {['Salesforce', 'HubSpot', 'Stripe', 'Figma', 'Notion', 'Rippling', 'Lattice'].map(co => (
            <span key={co} className="text-sm font-black tracking-tight" style={{ color: `${N.muted}99` }}>{co}</span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="py-28 px-6" style={{ background: N.pageBg }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4" style={{ color: N.text }}>Everything a TA leader needs.<br />Nothing they don&apos;t.</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: N.muted }}>One place to connect, learn, hire, and grow — built specifically for the talent acquisition profession.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users,       title: 'Member Directory',  desc: 'Connect with vetted TA leaders across industries, company sizes, and specializations.',                    color: N.navy },
              { icon: CalendarDays,title: 'Events & Classes',  desc: 'Live roundtables, workshops, and virtual classes taught by practitioners — not consultants.',            color: '#7c3aed' },
              { icon: MessageSquare,title:'Forum',             desc: 'Candid discussions on sourcing, tools, leadership, comp, and everything in between.',                     color: '#0d9488' },
              { icon: Briefcase,   title: 'Job Board',         desc: 'TA-specific roles posted directly by members and trusted companies. No noise.',                          color: N.navyMid },
              { icon: GraduationCap,title:'Mentorship',        desc: 'Get paired with an experienced mentor, or pay it forward by mentoring someone else.',                    color: '#d97706' },
              { icon: Building2,   title: 'Vendor Directory',  desc: 'Honest, peer-reviewed recommendations for the tools and vendors that actually work.',                    color: '#db2777' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl p-6 border hover:shadow-md transition-all" style={{ background: N.cardBg, borderColor: N.border }}>
                <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
                  <Icon className="size-5" style={{ color }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: N.text }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: N.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why different ── */}
      <section className="py-28 px-6 border-t" style={{ borderColor: N.border, background: N.cardBg }}>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-6" style={{ color: N.text }}>Built for people who do the work.</h2>
            <p className="text-lg leading-relaxed mb-8" style={{ color: N.muted }}>TALK is not another LinkedIn group or Slack workspace you never check. It&apos;s a curated space where membership is earned and conversations are real.</p>
            <div className="space-y-4">
              {[
                { icon: Lock,         text: 'Every member is reviewed and approved — no lurkers, no spam' },
                { icon: Zap,          text: 'Private by design — what happens in TALK, stays in TALK' },
                { icon: Globe,        text: 'Members across every industry, company size, and continent' },
                { icon: CheckCircle2, text: 'Run by practitioners, for practitioners — zero vendor bias' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${N.navy}15` }}>
                    <Icon className="size-3.5" style={{ color: N.navy }} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: N.muted }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl p-8 border relative" style={{ background: `linear-gradient(135deg, ${N.navy}08, ${N.navyMid}05)`, borderColor: N.border }}>
            <div className="text-5xl font-black leading-none mb-4" style={{ color: `${N.navy}30` }}>&ldquo;</div>
            <p className="text-lg leading-relaxed mb-6" style={{ color: N.muted }}>
              TALK is the first community I&apos;ve been part of where I actually learn something every week. The quality of conversation is unlike anything else in the TA space.
            </p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: N.navy }}>S</div>
              <div>
                <p className="text-sm font-bold" style={{ color: N.text }}>Sarah K.</p>
                <p className="text-xs" style={{ color: N.muted }}>Head of Talent · Series B SaaS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6" style={{ background: `linear-gradient(160deg, ${N.navA}, ${N.navB})` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4 text-white">Ready to join?</h2>
          <p className="text-white/70 text-lg mb-10 max-w-lg mx-auto">Applications take 2 minutes. We review every one personally and get back to you within a few days.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02] text-white"
            style={{ background: N.red, boxShadow: `0 8px 40px ${N.red}50` }}
          >
            Apply for membership <ArrowRight className="size-4" />
          </Link>
          <p className="mt-5 text-xs text-white/40">Membership is always free for the TA community.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: 'rgba(255,255,255,0.08)', background: N.navA }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Wordmark size={20} />
          <div className="flex items-center gap-6 text-xs text-white/40">
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Apply</Link>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <span>© {new Date().getFullYear()} TALK Community</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
