import Link from 'next/link'
import {
  Users, CalendarDays, MessageSquare, Briefcase,
  GraduationCap, Building2, ArrowRight,
  CheckCircle2, Lock, Zap, Globe
} from 'lucide-react'

// Cream palette
const C = {
  bg:      '#faf8f5',   // warm off-white
  bgAlt:   '#f5f1eb',   // slightly deeper cream section
  border:  '#e8e0d5',   // warm border
  text:    '#1c1917',   // warm near-black
  muted:   '#78716c',   // warm gray
  subtle:  '#a8a29e',   // lighter warm gray
  card:    '#ffffff',
}

const LOGO_SVG = (size: number) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height={size} style={{ width: 'auto' }} aria-hidden="true">
    <defs>
      <linearGradient id="pa-c" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#9B5CFF"/>
        <stop offset="100%" stopColor="#6F2CFF"/>
      </linearGradient>
    </defs>
    <g transform="translate(110 95)">
      <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke={C.text} strokeWidth="24" strokeLinejoin="round"/>
      <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa-c)"/>
      <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill={C.text}/>
      <rect x="126" y="78" width="208" height="38" rx="19" fill={C.bg} opacity="0.95"/>
      <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill={C.bg} opacity="0.95"/>
    </g>
  </svg>
)

export default function CreamMockup() {
  return (
    <div className="min-h-screen font-sans" style={{ background: C.bg, color: C.text }}>

      {/* Switcher */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-zinc-900/90 backdrop-blur px-4 py-2.5 rounded-full shadow-2xl border border-white/10 text-xs font-bold">
        <span className="text-white/40 mr-1">Theme:</span>
        <Link href="/mockup/light" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Light</Link>
        <span className="text-white bg-white/15 px-3 py-1 rounded-full">Cream</span>
        <Link href="/mockup/split" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Split</Link>
        <span className="w-px h-4 bg-white/20 mx-1" />
        <Link href="/" className="text-white/50 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Current</Link>
      </div>

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur border-b" style={{ background: `${C.bg}ee`, borderColor: C.border }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {LOGO_SVG(30)}
            <span className="font-black tracking-tight" style={{ fontSize: '1.25rem', color: C.text }}>
              T<span className="relative inline-block">A<span className="absolute rounded-full" style={{ width: 5, height: 5, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 2, left: '50%', transform: 'translateX(-50%)' }}/></span>LK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 transition-colors" style={{ color: C.muted }}>Sign in</Link>
            <Link href="/signup" className="text-sm font-bold px-5 py-2 rounded-xl transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d' }}>
              Apply to join
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center">

          {/* Serif-feel overline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold mb-8 tracking-wide uppercase" style={{ borderColor: '#00d4aa60', background: '#00d4aa12', color: '#00907a' }}>
            <span className="size-1.5 rounded-full bg-[#00b894] animate-pulse" />
            Now accepting applications
          </div>

          <div className="flex items-center justify-center gap-5 mb-8">
            {LOGO_SVG(80)}
            <span className="font-black" style={{ fontSize: '5.5rem', letterSpacing: '-0.03em', lineHeight: 1, color: C.text }}>
              T<span className="relative inline-block">
                A
                <span className="absolute rounded-full" style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 6, left: '50%', transform: 'translateX(-50%)' }} />
              </span>LK
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6" style={{ color: C.text }}>
            The private community<br />
            <span style={{ background: 'linear-gradient(90deg, #00b894, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for TA leaders.
            </span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: C.muted }}>
            TALK is a curated, invite-only network where talent acquisition leaders connect, learn, and grow together — away from the noise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d', boxShadow: '0 8px 32px rgba(0,212,170,0.2)' }}>
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all border"
              style={{ color: C.muted, borderColor: C.border }}>
              Already a member? Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs" style={{ color: C.subtle }}>Membership is reviewed and approved. No spam, ever.</p>
        </div>

        {/* Mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="absolute -inset-2 rounded-3xl blur-3xl opacity-15" style={{ background: 'linear-gradient(135deg, #00d4aa, #9B5CFF)' }} />
          <div className="relative rounded-2xl overflow-hidden border" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)', borderColor: C.border }}>
            <div className="flex items-center gap-2 px-4 h-11" style={{ background: 'linear-gradient(90deg, #0d0d0d, #1a1a2e)' }}>
              <div className="flex items-center gap-1.5 mr-4 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="22" style={{ width: 'auto' }} aria-hidden="true">
                  <defs><linearGradient id="pa-cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9B5CFF"/><stop offset="100%" stopColor="#6F2CFF"/></linearGradient></defs>
                  <g transform="translate(110 95)">
                    <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#fff" strokeWidth="24" strokeLinejoin="round"/>
                    <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa-cm)"/>
                    <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#fff"/>
                    <rect x="126" y="78" width="208" height="38" rx="19" fill="#000" opacity="0.9"/>
                    <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000" opacity="0.9"/>
                  </g>
                </svg>
                <span className="font-black text-white" style={{ fontSize: '0.9rem' }}>TALK</span>
              </div>
              {[{ w: 'w-14', active: true }, { w: 'w-12' }, { w: 'w-20' }, { w: 'w-8' }, { w: 'w-10' }].map((item, i) => (
                <div key={i} className={`h-6 ${item.w} rounded-md ${item.active ? 'bg-[#00d4aa]' : 'bg-white/10'}`} />
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="size-6 rounded-full bg-[#00d4aa]/60" />
              </div>
            </div>
            <div className="p-5 space-y-4" style={{ background: C.bgAlt }}>
              <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0d0d0d, #1a1a2e)' }}>
                <div className="h-2.5 w-24 rounded bg-[#00d4aa]/60 mb-2" />
                <div className="h-5 w-56 rounded bg-white/80 mb-1.5" />
                <div className="h-2.5 w-40 rounded bg-white/25" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {['linear-gradient(135deg,#00b894,#00d4aa)','linear-gradient(135deg,#ea580c,#f97316)','linear-gradient(135deg,#7c3aed,#8b5cf6)','linear-gradient(135deg,#1d4ed8,#3b82f6)'].map((grad, i) => (
                  <div key={i} className="rounded-xl p-4 text-white" style={{ background: grad }}>
                    <div className="text-2xl font-black leading-none mb-1">{['12k','12','89','34'][i]}</div>
                    <div className="h-2 w-14 rounded bg-white/40 mt-1" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[0,1].map(i => (
                  <div key={i} className="rounded-xl border p-4 space-y-2.5" style={{ background: C.card, borderColor: C.border }}>
                    <div className="h-3 w-28 rounded" style={{ background: C.border }} />
                    {[0,1,2].map(j => <div key={j} className="h-8 rounded-lg" style={{ background: C.bgAlt, border: `1px solid ${C.border}` }} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="border-y py-5 px-6" style={{ borderColor: C.border, background: C.bgAlt }}>
        <p className="text-center text-xs font-semibold uppercase tracking-widest" style={{ color: C.subtle }}>Trusted by TA leaders from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
          {['Salesforce', 'HubSpot', 'Stripe', 'Figma', 'Notion', 'Rippling', 'Lattice'].map(co => (
            <span key={co} className="text-sm font-black tracking-tight" style={{ color: C.subtle }}>{co}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4" style={{ color: C.text }}>Everything a TA leader needs.<br />Nothing they don&apos;t.</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.muted }}>One place to connect, learn, hire, and grow — built specifically for the talent acquisition profession.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users,        title: 'Member Directory', desc: 'Connect with vetted TA leaders across industries, company sizes, and specializations.', color: '#00b894' },
              { icon: CalendarDays, title: 'Events & Classes',  desc: 'Live roundtables, workshops, and virtual classes taught by practitioners.', color: '#f97316' },
              { icon: MessageSquare,title: 'Forum',             desc: 'Candid discussions on sourcing, tools, leadership, comp, and everything in between.', color: '#8b5cf6' },
              { icon: Briefcase,    title: 'Job Board',         desc: 'TA-specific roles posted directly by members and trusted companies. No noise.', color: '#3b82f6' },
              { icon: GraduationCap,title: 'Mentorship',        desc: 'Get paired with an experienced mentor or pay it forward by mentoring someone else.', color: '#ec4899' },
              { icon: Building2,    title: 'Vendor Directory',  desc: 'Honest, peer-reviewed recommendations for the tools and vendors that actually work.', color: '#f59e0b' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl p-6 border hover:shadow-sm transition-all" style={{ background: C.card, borderColor: C.border }}>
                <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                  <Icon className="size-5" style={{ color }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: C.text }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section className="py-28 px-6 border-t" style={{ background: C.bgAlt, borderColor: C.border }}>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-6" style={{ color: C.text }}>Built for people who do the work.</h2>
            <p className="text-lg leading-relaxed mb-8" style={{ color: C.muted }}>TALK is not another LinkedIn group or Slack workspace you never check. It&apos;s a curated space where membership is earned and conversations are real.</p>
            <div className="space-y-4">
              {[
                { icon: Lock,         text: 'Every member is reviewed and approved — no lurkers, no spam' },
                { icon: Zap,          text: 'Private by design — what happens in TALK, stays in TALK' },
                { icon: Globe,        text: 'Members across every industry, company size, and continent' },
                { icon: CheckCircle2, text: 'Run by practitioners, for practitioners — zero vendor bias' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#00d4aa18' }}>
                    <Icon className="size-3.5 text-[#00b894]" />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-8 border" style={{ background: C.card, borderColor: C.border }}>
            <div className="text-5xl font-black leading-none mb-4" style={{ color: '#00d4aa' }}>&ldquo;</div>
            <p className="text-lg leading-relaxed mb-6" style={{ color: C.muted }}>
              TALK is the first community I&apos;ve been part of where I actually learn something every week. The quality of conversation is unlike anything else in the TA space.
            </p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#00b894,#00d4aa)', color: '#0d0d0d' }}>S</div>
              <div>
                <p className="text-sm font-bold" style={{ color: C.text }}>Sarah K.</p>
                <p className="text-xs" style={{ color: C.subtle }}>Head of Talent · Series B SaaS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border p-16" style={{ background: C.card, borderColor: C.border }}>
            <h2 className="text-4xl font-black tracking-tight mb-4" style={{ color: C.text }}>Ready to join?</h2>
            <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: C.muted }}>Applications take 2 minutes. We review every one personally and get back to you within a few days.</p>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d', boxShadow: '0 8px 40px rgba(0,212,170,0.2)' }}>
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <p className="mt-5 text-xs" style={{ color: C.subtle }}>Membership is free during our launch period.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-6" style={{ borderColor: C.border }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black tracking-tight" style={{ color: C.subtle }}>TALK · For TA Leaders</span>
          <div className="flex items-center gap-6 text-xs" style={{ color: C.subtle }}>
            <Link href="/login" className="hover:text-zinc-700 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-zinc-700 transition-colors">Apply</Link>
            <span>© {new Date().getFullYear()} TALK Community</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
