'use client'
import Link from 'next/link'

const C = {
  navA: '#1E2535',
  navB: '#243044',
  bg: '#EFF2F7',
  surface: '#ffffff',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',
  coral: '#E8503A',
  coralLight: '#F07058',
  blue: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  textDim: '#CBD5E1',
}

function Logo({ size = 34, stroke = '#ffffff' }: { size?: number; stroke?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height={size} style={{ width: 'auto' }}>
      <defs>
        <linearGradient id="sl-pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9B5CFF"/><stop offset="100%" stopColor="#6F2CFF"/>
        </linearGradient>
      </defs>
      <g transform="translate(110 95)">
        <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke={stroke} strokeWidth="24" strokeLinejoin="round"/>
        <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#sl-pg)"/>
        <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill={stroke}/>
        <rect x="126" y="78" width="208" height="38" rx="19" fill={C.navA} opacity="0.9"/>
        <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill={C.navA} opacity="0.9"/>
      </g>
    </svg>
  )
}

const members = [
  { name: 'Sarah Chen', title: 'VP Talent · Stripe', initials: 'SC', color: '#E8503A' },
  { name: 'Marcus Webb', title: 'TA Director · Airbnb', initials: 'MW', color: '#8B5CF6' },
  { name: 'Priya Patel', title: 'Head of Recruiting · Figma', initials: 'PP', color: '#3B82F6' },
  { name: 'Jordan Ellis', title: 'Talent Lead · Notion', initials: 'JE', color: '#10B981' },
  { name: 'Lena Kraft', title: 'People Ops · Linear', initials: 'LK', color: '#F59E0B' },
  { name: 'Darius Kim', title: 'VP People · Vercel', initials: 'DK', color: '#EC4899' },
]

const topics = [
  { title: 'How are you structuring sourcing teams in 2025?', replies: 24, views: 312 },
  { title: 'AI screening tools: what actually works?', replies: 18, views: 267 },
  { title: 'Comp benchmarking — which data sources do you trust?', replies: 15, views: 198 },
  { title: 'Navigating hiring freezes without losing pipeline', replies: 11, views: 145 },
  { title: 'Building employer brand on a shoestring budget', replies: 9, views: 121 },
]

const events = [
  { title: 'TA Leaders Roundtable', date: 'Jun 12 · Virtual', badge: 'Live', badgeColor: C.coral },
  { title: 'AI Recruiting Summit', date: 'Jun 18 · NYC', badge: 'In Person', badgeColor: '#8B5CF6' },
  { title: 'Sourcing Masterclass', date: 'Jun 24 · Virtual', badge: 'Workshop', badgeColor: '#10B981' },
]

const nav = ['Home', 'Members', 'Events', 'Forums', 'Chats', 'Jobs', 'Polls', 'Chapters', 'Vendors', 'Mentorship']

export default function SlateMockup() {
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* Switcher */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: 999, border: '1px solid #333', fontSize: 12, fontWeight: 700 }}>
        <span style={{ color: '#555', marginRight: 4 }}>Theme:</span>
        <Link href="/mockup/brand/dark" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Midnight Dark</Link>
        <span style={{ color: 'white', background: C.blue, padding: '3px 10px', borderRadius: 999 }}>Slate Pro</span>
        <Link href="/mockup/brand/warm" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Warm Espresso</Link>
        <Link href="/mockup/brand/plum" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Deep Plum</Link>
        <span style={{ width: 1, height: 14, background: '#333', margin: '0 4px' }} />
        <Link href="/mockup/brand" style={{ color: '#555', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>← Gallery</Link>
      </div>

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `linear-gradient(90deg, ${C.navA} 0%, ${C.navB} 100%)` }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 4 }}>
          <Link href="/mockup/brand/slate" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, textDecoration: 'none' }}>
            <Logo size={34} stroke="#ffffff" />
            <span style={{ fontWeight: 900, color: 'white', fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
              T<span style={{ position: 'relative', display: 'inline-block' }}>A
                <span style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 3, left: '50%', transform: 'translateX(-50%)' }} />
              </span>LK
            </span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto' }}>
            {nav.map((item, i) => (
              <span key={item} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
                background: i === 0 ? C.coral : 'transparent',
                color: i === 0 ? 'white' : 'rgba(255,255,255,0.5)',
              }}>{item}</span>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>BT</div>
          </div>
        </div>
      </header>

      {/* Page */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Welcome bar */}
        <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${C.coral}` }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Good morning, Bill 👋</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textMuted }}>3 new members joined this week · 2 events coming up</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ padding: '9px 18px', borderRadius: 10, background: C.coral, color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Invite Member</button>
            <button style={{ padding: '9px 18px', borderRadius: 10, background: 'white', color: C.text, fontWeight: 700, fontSize: 13, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Post to Forum</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Members', val: '473', delta: '+12 this month', color: C.coral, icon: '👥' },
            { label: 'Active Discussions', val: '953', delta: '+38 this week', color: '#8B5CF6', icon: '💬' },
            { label: 'Upcoming Events', val: '12', delta: 'Next: Jun 12', color: C.blue, icon: '📅' },
            { label: 'Open Jobs', val: '34', delta: '8 posted this week', color: '#10B981', icon: '💼' },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 6 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 20 }}>

          {/* Members */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>New Members</span>
              <span style={{ fontSize: 12, color: C.coral, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {members.map((m) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>{m.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.title}</div>
                  </div>
                  <button style={{ padding: '5px 12px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Connect</button>
                </div>
              ))}
            </div>
          </div>

          {/* Forum */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>🔥 Hot Topics</span>
              <span style={{ fontSize: 12, color: C.coral, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {topics.map((t, i) => (
                <div key={t.title} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i < 2 ? C.coral : C.surfaceAlt, border: i >= 2 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i < 2 ? 'white' : C.textMuted, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{t.replies} replies · {t.views} views</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Upcoming Events</span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {events.map((e, i) => (
                  <div key={e.title} style={{ padding: '10px 8px', borderBottom: i < events.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: e.badgeColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 16 }}>📅</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{e.title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{e.date}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: e.badgeColor, padding: '2px 7px', borderRadius: 5, marginTop: 5, display: 'inline-block' }}>{e.badge}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${C.navA}, ${C.navB})`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 6 }}>Refer a Colleague</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 14 }}>Know a great TA leader? Invite them to TALK.</div>
              <button style={{ width: '100%', padding: '9px 0', borderRadius: 10, background: C.coral, color: 'white', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }}>Send Invite</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
