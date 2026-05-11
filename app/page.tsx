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

          <p className="text-lg sm:text-xl text-white/75 max-w-2xl mx-auto mb-10 leading-relaxed">
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

          <p className="mt-6 text-xs text-white/55">Membership is reviewed and approved. No spam, ever.</p>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          {/* Outer glow */}
          <div className="absolute -inset-1 rounded-3xl blur-2xl opacity-40" style={{ background: 'linear-gradient(135deg, #00d4aa33, #9B5CFF22)' }} />
          <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)] border border-white/10">

            {/* ── App nav bar ── */}
            <div className="flex items-center gap-2 px-4 h-11" style={{ background: 'linear-gradient(90deg, #0d0d0d, #1a1a2e)' }}>
              {/* Logo */}
              <div className="flex items-center gap-1.5 mr-4 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="24" style={{ width: 'auto' }} aria-hidden="true">
                  <defs>
                    <linearGradient id="pa-mock" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9B5CFF"/>
                      <stop offset="100%" stopColor="#6F2CFF"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(110 95)">
                    <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                    <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pa-mock)"/>
                    <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#FFFFFF"/>
                    <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
                    <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000000" opacity="0.92"/>
                  </g>
                </svg>
                <span className="font-black text-white" style={{ fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  T<span className="relative inline-block">A<span className="absolute rounded-full" style={{ width: 4, height: 4, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 1, left: '50%', transform: 'translateX(-50%)' }}/></span>LK
                </span>
              </div>
              {/* Nav items */}
              {[{ w: 'w-14', active: true }, { w: 'w-12' }, { w: 'w-20' }, { w: 'w-8' }, { w: 'w-10' }, { w: 'w-14' }, { w: 'w-12' }].map((item, i) => (
                <div key={i} className={`h-6 ${item.w} rounded-md ${item.active ? 'bg-[#00d4aa]' : 'bg-white/10'}`} />
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="size-6 rounded-full bg-[#00d4aa]/60" />
                <div className="h-3 w-12 rounded bg-white/20" />
              </div>
            </div>

            {/* ── Dashboard content (light background) ── */}
            <div className="p-5 space-y-4" style={{ background: '#f1f5f9' }}>

              {/* Hero banner */}
              <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)' }}>
                <div className="absolute right-4 top-4 size-24 rounded-full blur-2xl opacity-20" style={{ background: '#00d4aa' }} />
                <div className="h-2.5 w-24 rounded bg-[#00d4aa]/60 mb-2" />
                <div className="h-5 w-56 rounded bg-white/80 mb-1.5" />
                <div className="h-2.5 w-40 rounded bg-white/25" />
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { num: '12k', label: 'Total Members', grad: 'linear-gradient(135deg,#00b894,#00d4aa)' },
                  { num: '12',  label: 'Upcoming Events', grad: 'linear-gradient(135deg,#ea580c,#f97316)' },
                  { num: '89',  label: 'Active Discussions', grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
                  { num: '34',  label: 'Jobs Posted', grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
                ].map(({ num, label, grad }) => (
                  <div key={label} className="rounded-xl p-4 text-white relative overflow-hidden" style={{ background: grad }}>
                    <div className="text-2xl font-black leading-none mb-1">{num}</div>
                    <div className="text-[10px] text-white/70 font-medium">{label}</div>
                  </div>
                ))}
              </div>

              {/* Two-column content */}
              <div className="grid grid-cols-2 gap-3">

                {/* Events card */}
                <div className="rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-md bg-[#f97316]/15 flex items-center justify-center">
                        <div className="size-2.5 rounded-sm bg-[#f97316]" />
                      </div>
                      <div className="h-3 w-32 rounded bg-zinc-200" />
                    </div>
                    <div className="h-2.5 w-12 rounded bg-[#00d4aa]/40" />
                  </div>
                  {[
                    { month: 'MAY', day: '14', title: 'AI & the Candidate Experience', tag: 'EVENT', tagColor: '#f97316' },
                    { month: 'MAY', day: '21', title: 'TA Leadership Roundtable', tag: 'EVENT', tagColor: '#f97316' },
                    { month: 'MAY', day: '28', title: 'Claude Code for TA Leaders', tag: 'CLASS', tagColor: '#00b894' },
                  ].map(({ month, day, title, tag, tagColor }) => (
                    <div key={day+title} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-50 last:border-0">
                      <div className="w-9 rounded-lg py-1 text-center shrink-0" style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)' }}>
                        <div className="text-[8px] font-bold text-[#f97316] uppercase">{month}</div>
                        <div className="text-sm font-black text-zinc-800 leading-tight">{day}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: tagColor }}>{tag}</span>
                          <div className="text-[10px] font-semibold text-zinc-700 truncate">{title}</div>
                        </div>
                        <div className="h-2 w-16 rounded bg-zinc-100" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discussions card */}
                <div className="rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-md bg-[#8b5cf6]/15 flex items-center justify-center">
                        <div className="size-2.5 rounded-sm bg-[#8b5cf6]" />
                      </div>
                      <div className="h-3 w-28 rounded bg-zinc-200" />
                    </div>
                    <div className="h-2.5 w-12 rounded bg-[#00d4aa]/40" />
                  </div>
                  {[
                    { cat: 'Ask the Community', topic: 'How are you using AI in sourcing?', ago: '2h ago' },
                    { cat: 'Tools & Tech', topic: 'Best ATS for a high-growth startup?', ago: '4h ago' },
                    { cat: 'Career', topic: 'Negotiating comp bands in this market', ago: '6h ago' },
                    { cat: 'Leadership', topic: 'Building a TA team from scratch', ago: '1d ago' },
                  ].map(({ cat, topic, ago }) => (
                    <div key={topic} className="px-4 py-2.5 border-b border-zinc-50 last:border-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded-full">{cat}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-zinc-700 truncate">{topic}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{ago}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jobs row */}
              <div className="rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-md bg-[#3b82f6]/15 flex items-center justify-center">
                      <div className="size-2.5 rounded-sm bg-[#3b82f6]" />
                    </div>
                    <div className="h-3 w-24 rounded bg-zinc-200" />
                  </div>
                  <div className="h-2.5 w-12 rounded bg-[#00d4aa]/40" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-zinc-50">
                  {[
                    { title: 'VP of Talent Acquisition', co: 'Series B Startup · Remote' },
                    { title: 'Head of Recruiting', co: 'Fintech · New York, NY' },
                    { title: 'Senior Technical Recruiter', co: 'Enterprise SaaS · Austin, TX' },
                  ].map(({ title, co }) => (
                    <div key={title} className="flex items-center gap-3 px-4 py-3">
                      <div className="size-8 rounded-xl bg-[#3b82f6]/10 shrink-0 flex items-center justify-center">
                        <div className="size-4 rounded bg-[#3b82f6]/40" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-800">{title}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">{co}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-16 blur-3xl opacity-30 rounded-full" style={{ background: '#00d4aa' }} />
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <div className="border-y border-white/5 py-5 px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-center text-xs font-semibold text-white/55 uppercase tracking-widest">Trusted by TA leaders from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
          {['Salesforce', 'HubSpot', 'Stripe', 'Figma', 'Notion', 'Rippling', 'Lattice'].map(co => (
            <span key={co} className="text-sm font-black text-white/50 tracking-tight">{co}</span>
          ))}
        </div>
      </div>

      {/* ── What you get ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4">Everything a TA leader needs.<br />Nothing they don&apos;t.</h2>
            <p className="text-white/65 text-lg max-w-xl mx-auto">One place to connect, learn, hire, and grow — built specifically for the talent acquisition profession.</p>
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
                <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
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
            <p className="text-white/75 text-lg leading-relaxed mb-8">TALK is not another LinkedIn group or Slack workspace you never check. It&apos;s a curated space where membership is earned and conversations are real.</p>
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
                <p className="text-xs text-white/65">Head of Talent · Series B SaaS</p>
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
            <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto">Applications take 2 minutes. We review every one personally and get back to you within a few days.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0a0a0f', boxShadow: '0 8px 40px rgba(0,212,170,0.3)' }}
            >
              Apply for membership <ArrowRight className="size-4" />
            </Link>
            <p className="mt-5 text-xs text-white/55">Membership is free during our launch period.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white/60 tracking-tight">TALK</span>
            <span className="text-white/50 text-xs">· For TA Leaders</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/55">
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white/60 transition-colors">Apply</Link>
            <span>© {new Date().getFullYear()} TALK Community</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
