import Link from 'next/link'
import {
  Users, CalendarDays, MessageSquare, Briefcase,
  GraduationCap, Building2, ArrowRight,
  CheckCircle2, Lock, Zap, Globe
} from 'lucide-react'

const LOGO_SVG = (size: number, strokeColor = '#0d0d0d') => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height={size} style={{ width: 'auto' }} aria-hidden="true">
    <defs>
      <linearGradient id="pa-l" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#9B5CFF"/>
        <stop offset="100%" stopColor="#6F2CFF"/>
      </linearGradient>
    </defs>
    <g transform="translate(110 95)">
      <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke={strokeColor} strokeWidth="24" strokeLinejoin="round"/>
      <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa-l)"/>
      <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill={strokeColor}/>
      <rect x="126" y="78" width="208" height="38" rx="19" fill="#ffffff" opacity="0.92"/>
      <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#ffffff" opacity="0.92"/>
    </g>
  </svg>
)

export default function LightMockup() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">

      {/* Switcher */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-zinc-900/90 backdrop-blur px-4 py-2.5 rounded-full shadow-2xl border border-white/10 text-xs font-bold">
        <span className="text-white/40 mr-1">Theme:</span>
        <span className="text-white bg-white/15 px-3 py-1 rounded-full">Light</span>
        <Link href="/mockup/cream" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Cream</Link>
        <Link href="/mockup/split" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Split</Link>
        <span className="w-px h-4 bg-white/20 mx-1" />
        <Link href="/" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Current</Link>
      </div>

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {LOGO_SVG(30, '#0d0d0d')}
            <span className="font-black text-zinc-900 tracking-tight" style={{ fontSize: '1.25rem' }}>
              T<span className="relative inline-block">A<span className="absolute rounded-full" style={{ width: 5, height: 5, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 2, left: '50%', transform: 'translateX(-50%)' }}/></span>LK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-4 py-2">Sign in</Link>
            <Link href="/signup" className="text-sm font-bold px-5 py-2 rounded-xl transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d' }}>
              Apply to join
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 overflow-hidden">
        {/* Subtle teal wash behind hero */}
        <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none" style={{ background: 'linear-gradient(180deg, #f0fdf9 0%, white 100%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-5 mb-10">
            {LOGO_SVG(80, '#0d0d0d')}
            <span className="font-black text-zinc-900" style={{ fontSize: '5.5rem', letterSpacing: '-0.03em', lineHeight: 1 }}>
              T<span className="relative inline-block">
                A
                <span className="absolute rounded-full" style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 6, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 12px rgba(155,92,255,0.4)' }} />
              </span>LK
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00d4aa]/40 bg-[#00d4aa]/10 text-[#00a87d] text-xs font-bold mb-8 tracking-wide uppercase">
            <span className="size-1.5 rounded-full bg-[#00b894] animate-pulse" />
            Now accepting applications
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-zinc-900">
            The private community<br />
            <span style={{ background: 'linear-gradient(90deg, #00b894, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for TA leaders.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TALK is a curated, invite-only network where talent acquisition leaders connect, learn, and grow together — away from the noise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d', boxShadow: '0 8px 32px rgba(0,212,170,0.25)' }}>
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-200 hover:border-zinc-300 transition-all">
              Already a member? Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-400">Membership is reviewed and approved. No spam, ever.</p>
        </div>

        {/* Mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="absolute -inset-1 rounded-3xl blur-2xl opacity-20" style={{ background: 'linear-gradient(135deg, #00d4aa, #9B5CFF)' }} />
          <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-zinc-200">
            <div className="flex items-center gap-2 px-4 h-11" style={{ background: 'linear-gradient(90deg, #0d0d0d, #1a1a2e)' }}>
              <div className="flex items-center gap-1.5 mr-4 shrink-0">
                {LOGO_SVG(22, '#fff')}
                <span className="font-black text-white" style={{ fontSize: '0.9rem' }}>T<span className="relative inline-block">A<span className="absolute rounded-full" style={{ width: 3, height: 3, background: '#9B5CFF', bottom: 1, left: '50%', transform: 'translateX(-50%)' }}/></span>LK</span>
              </div>
              {[{ w: 'w-14', active: true }, { w: 'w-12' }, { w: 'w-20' }, { w: 'w-8' }, { w: 'w-10' }, { w: 'w-14' }, { w: 'w-12' }].map((item, i) => (
                <div key={i} className={`h-6 ${item.w} rounded-md ${item.active ? 'bg-[#00d4aa]' : 'bg-white/10'}`} />
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="size-6 rounded-full bg-[#00d4aa]/60" />
                <div className="h-3 w-12 rounded bg-white/20" />
              </div>
            </div>
            <div className="p-5 space-y-4 bg-slate-50">
              <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)' }}>
                <div className="h-2.5 w-24 rounded bg-[#00d4aa]/60 mb-2" />
                <div className="h-5 w-56 rounded bg-white/80 mb-1.5" />
                <div className="h-2.5 w-40 rounded bg-white/25" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { num: '12k', grad: 'linear-gradient(135deg,#00b894,#00d4aa)' },
                  { num: '12',  grad: 'linear-gradient(135deg,#ea580c,#f97316)' },
                  { num: '89',  grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
                  { num: '34',  grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
                ].map(({ num, grad }, i) => (
                  <div key={i} className="rounded-xl p-4 text-white" style={{ background: grad }}>
                    <div className="text-2xl font-black leading-none mb-1">{num}</div>
                    <div className="h-2 w-16 rounded bg-white/40 mt-1" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-zinc-100 shadow-sm p-4 space-y-2.5">
                  <div className="h-3 w-32 rounded bg-zinc-200" />
                  {[0,1,2].map(i => <div key={i} className="h-8 rounded-lg bg-zinc-50 border border-zinc-100" />)}
                </div>
                <div className="rounded-xl bg-white border border-zinc-100 shadow-sm p-4 space-y-2.5">
                  <div className="h-3 w-28 rounded bg-zinc-200" />
                  {[0,1,2].map(i => <div key={i} className="h-8 rounded-lg bg-zinc-50 border border-zinc-100" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="border-y border-zinc-100 py-5 px-6 bg-zinc-50">
        <p className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-widest">Trusted by TA leaders from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
          {['Salesforce', 'HubSpot', 'Stripe', 'Figma', 'Notion', 'Rippling', 'Lattice'].map(co => (
            <span key={co} className="text-sm font-black text-zinc-400 tracking-tight">{co}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4 text-zinc-900">Everything a TA leader needs.<br />Nothing they don&apos;t.</h2>
            <p className="text-zinc-500 text-lg max-w-xl mx-auto">One place to connect, learn, hire, and grow — built specifically for the talent acquisition profession.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users,        title: 'Member Directory', desc: 'Connect with vetted TA leaders across industries, company sizes, and specializations.', color: '#00d4aa', bg: '#f0fdf9' },
              { icon: CalendarDays, title: 'Events & Classes',  desc: 'Live roundtables, workshops, and virtual classes taught by practitioners — not consultants.', color: '#f97316', bg: '#fff7ed' },
              { icon: MessageSquare,title: 'Forum',             desc: 'Candid discussions on sourcing, tools, leadership, comp, and everything in between.', color: '#8b5cf6', bg: '#faf5ff' },
              { icon: Briefcase,    title: 'Job Board',         desc: 'TA-specific roles posted directly by members and trusted companies. No noise.', color: '#3b82f6', bg: '#eff6ff' },
              { icon: GraduationCap,title: 'Mentorship',        desc: 'Get paired with an experienced mentor, or pay it forward by mentoring someone else.', color: '#ec4899', bg: '#fdf2f8' },
              { icon: Building2,    title: 'Vendor Directory',  desc: 'Honest, peer-reviewed recommendations for the tools and vendors that actually work.', color: '#f59e0b', bg: '#fffbeb' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="rounded-2xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all bg-white">
                <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon className="size-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section className="py-28 px-6 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-6 text-zinc-900">Built for people who do the work.</h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">TALK is not another LinkedIn group or Slack workspace you never check. It&apos;s a curated space where membership is earned and conversations are real.</p>
            <div className="space-y-4">
              {[
                { icon: Lock,         text: 'Every member is reviewed and approved — no lurkers, no spam' },
                { icon: Zap,          text: 'Private by design — what happens in TALK, stays in TALK' },
                { icon: Globe,        text: 'Members across every industry, company size, and continent' },
                { icon: CheckCircle2, text: 'Run by practitioners, for practitioners — zero vendor bias' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-[#f0fdf9]">
                    <Icon className="size-3.5 text-[#00b894]" />
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-8 border border-zinc-200 bg-white shadow-sm">
            <div className="text-5xl font-black leading-none mb-4" style={{ color: '#00d4aa' }}>&ldquo;</div>
            <p className="text-zinc-600 text-lg leading-relaxed mb-6">
              TALK is the first community I&apos;ve been part of where I actually learn something every week. The quality of conversation is unlike anything else in the TA space.
            </p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#00b894,#00d4aa)', color: '#0d0d0d' }}>S</div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Sarah K.</p>
                <p className="text-xs text-zinc-400">Head of Talent · Series B SaaS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border border-zinc-100 p-16 bg-gradient-to-br from-[#f0fdf9] to-white shadow-sm">
            <h2 className="text-4xl font-black tracking-tight mb-4 text-zinc-900">Ready to join?</h2>
            <p className="text-zinc-500 text-lg mb-10 max-w-lg mx-auto">Applications take 2 minutes. We review every one personally and get back to you within a few days.</p>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d', boxShadow: '0 8px 40px rgba(0,212,170,0.25)' }}>
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <p className="mt-5 text-xs text-zinc-400">Membership is free during our launch period.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-zinc-400 tracking-tight">TALK</span>
            <span className="text-zinc-300 text-xs">· For TA Leaders</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <Link href="/login" className="hover:text-zinc-700 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-zinc-700 transition-colors">Apply</Link>
            <span>© {new Date().getFullYear()} TALK Community</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
