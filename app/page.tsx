import Link from 'next/link'
import {
  Users, CalendarDays, MessageSquare, Briefcase,
  GraduationCap, Building2, BarChart2, ArrowRight,
  CheckCircle2, Lock, Zap, Globe
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="32" style={{ width: 'auto' }} aria-hidden="true">
              <defs>
                <linearGradient id="pa2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9B5CFF"/>
                  <stop offset="100%" stopColor="#6F2CFF"/>
                </linearGradient>
              </defs>
              <g transform="translate(110 95)">
                <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa2)"/>
                <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#FFFFFF"/>
                <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
                <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000000" opacity="0.92"/>
              </g>
            </svg>
            <span className="font-black text-white tracking-tight" style={{ fontSize: '1.25rem' }}>
              T<span className="relative inline-block">A<span className="absolute rounded-full" style={{ width: 5, height: 5, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 2, left: '50%', transform: 'translateX(-50%)' }}/></span>LK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm font-bold px-5 py-2 rounded-xl transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0a0a0f' }}>
              Apply to join
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, #00d4aa 0%, transparent 70%)' }} />
        <div className="absolute top-40 right-0 w-96 h-96 rounded-full opacity-10 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, #9B5CFF 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Large hero logo */}
          <div className="flex items-center justify-center gap-5 mb-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="90" style={{ width: 'auto', filter: 'drop-shadow(0 0 40px rgba(0,212,170,0.3))' }} aria-hidden="true">
              <defs>
                <linearGradient id="pa-hero" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9B5CFF"/>
                  <stop offset="100%" stopColor="#6F2CFF"/>
                </linearGradient>
              </defs>
              <g transform="translate(110 95)">
                <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa-hero)"/>
                <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#FFFFFF"/>
                <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
                <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000000" opacity="0.92"/>
              </g>
            </svg>
            <span className="font-black text-white" style={{ fontSize: '5.5rem', letterSpacing: '-0.03em', lineHeight: 1 }}>
              T<span className="relative inline-block">
                A
                <span className="absolute rounded-full" style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 6, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 12px rgba(155,92,255,0.6)' }} />
              </span>LK
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 text-[#00d4aa] text-xs font-bold mb-8 tracking-wide uppercase">
            <span className="size-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
            Now accepting applications
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            The private community<br />
            <span style={{ background: 'linear-gradient(90deg, #00b894, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for TA leaders.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            TALK is a curated, invite-only network where talent acquisition leaders connect, learn, and grow together — away from the noise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0a0a0f', boxShadow: '0 8px 32px rgba(0,212,170,0.25)' }}
            >
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Already a member? Sign in
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/30">Membership is reviewed and approved. No spam, ever.</p>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: 'linear-gradient(135deg, #0d0d0d, #1a1a2e)' }}>
            {/* Fake nav */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5" style={{ background: 'linear-gradient(90deg, #0d0d0d, #1a1a2e)' }}>
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-5 w-5 rounded" style={{ background: 'rgba(0,212,170,0.2)' }} />
                <div className="h-4 w-8 rounded bg-[#00d4aa]/80" />
                <div className="h-4 w-16 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-12 rounded bg-white/10" />
                <div className="h-4 w-10 rounded bg-white/10" />
              </div>
            </div>
            {/* Fake dashboard */}
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Members', color: '#00d4aa' },
                { label: 'Events', color: '#f97316' },
                { label: 'Discussions', color: '#8b5cf6' },
                { label: 'Jobs', color: '#3b82f6' },
              ].map(({ label, color }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}22` }}>
                  <div className="h-7 w-10 rounded mb-2" style={{ background: color, opacity: 0.8 }} />
                  <div className="text-xs text-white/40">{label}</div>
                </div>
              ))}
              <div className="col-span-2 rounded-xl p-4 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs font-semibold text-white/40 mb-3">Upcoming Events</div>
                {['TA Roundtable · May 20', 'Sourcing Masterclass · May 28', 'Leadership Forum · Jun 4'].map(e => (
                  <div key={e} className="flex items-center gap-2 py-1.5">
                    <div className="size-2 rounded-full bg-[#00d4aa]/60" />
                    <div className="text-xs text-white/50">{e}</div>
                  </div>
                ))}
              </div>
              <div className="col-span-2 rounded-xl p-4 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs font-semibold text-white/40 mb-3">Recent Discussions</div>
                {['How are you using AI in sourcing?', 'Best ATS for a 50-person team?', 'Negotiating comp in this market'].map(t => (
                  <div key={t} className="flex items-center gap-2 py-1.5">
                    <div className="size-2 rounded-full bg-[#8b5cf6]/60" />
                    <div className="text-xs text-white/50 truncate">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 blur-3xl opacity-20 rounded-full" style={{ background: '#00d4aa' }} />
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <div className="border-y border-white/5 py-5 px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-center text-xs font-semibold text-white/25 uppercase tracking-widest">Trusted by TA leaders from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
          {['Salesforce', 'HubSpot', 'Stripe', 'Figma', 'Notion', 'Rippling', 'Lattice'].map(co => (
            <span key={co} className="text-sm font-black text-white/20 tracking-tight">{co}</span>
          ))}
        </div>
      </div>

      {/* ── What you get ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4">Everything a TA leader needs.<br />Nothing they don&apos;t.</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">One place to connect, learn, hire, and grow — built specifically for the talent acquisition profession.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users, title: 'Member Directory', desc: 'Connect with vetted TA leaders across industries, company sizes, and specializations.', color: '#00d4aa' },
              { icon: CalendarDays, title: 'Events & Classes', desc: 'Live roundtables, workshops, and virtual classes taught by practitioners — not consultants.', color: '#f97316' },
              { icon: MessageSquare, title: 'Forum', desc: 'Candid discussions on sourcing, tools, leadership, comp, and everything in between.', color: '#8b5cf6' },
              { icon: Briefcase, title: 'Job Board', desc: 'TA-specific roles posted directly by members and trusted companies. No noise.', color: '#3b82f6' },
              { icon: GraduationCap, title: 'Mentorship', desc: 'Get paired with an experienced mentor, or pay it forward by mentoring someone else.', color: '#ec4899' },
              { icon: Building2, title: 'Vendor Directory', desc: 'Honest, peer-reviewed recommendations for the tools and vendors that actually work.', color: '#f59e0b' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}20` }}>
                  <Icon className="size-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it's different ── */}
      <section className="py-28 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-6">Built for people who do the work.</h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">TALK is not another LinkedIn group or Slack workspace you never check. It&apos;s a curated space where membership is earned and conversations are real.</p>
            <div className="space-y-4">
              {[
                { icon: Lock, text: 'Every member is reviewed and approved — no lurkers, no spam' },
                { icon: Zap, text: 'Private by design — what happens in TALK, stays in TALK' },
                { icon: Globe, text: 'Members across every industry, company size, and continent' },
                { icon: CheckCircle2, text: 'Run by practitioners, for practitioners — zero vendor bias' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,212,170,0.15)' }}>
                    <Icon className="size-3.5 text-[#00d4aa]" />
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl p-8 border border-white/10 relative" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.05), rgba(0,212,170,0.02))' }}>
            <div className="text-5xl text-[#00d4aa]/30 font-black leading-none mb-4">&ldquo;</div>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              TALK is the first community I&apos;ve been part of where I actually learn something every week. The quality of conversation is unlike anything else in the TA space.
            </p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#00b894,#00d4aa)', color: '#0a0a0f' }}>S</div>
              <div>
                <p className="text-sm font-bold text-white">Sarah K.</p>
                <p className="text-xs text-white/40">Head of Talent · Series B SaaS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 rounded-3xl opacity-10 blur-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse, #00d4aa, transparent)' }} />
          <div className="relative rounded-3xl border border-white/10 p-16" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,212,170,0.03))' }}>
            <h2 className="text-4xl font-black tracking-tight mb-4">Ready to join?</h2>
            <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">Applications take 2 minutes. We review every one personally and get back to you within a few days.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0a0a0f', boxShadow: '0 8px 40px rgba(0,212,170,0.3)' }}
            >
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <p className="mt-5 text-xs text-white/25">Membership is free during our launch period.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white/60 tracking-tight">TALK</span>
            <span className="text-white/20 text-xs">· For TA Leaders</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white/60 transition-colors">Apply</Link>
            <span>© {new Date().getFullYear()} TALK Community</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
