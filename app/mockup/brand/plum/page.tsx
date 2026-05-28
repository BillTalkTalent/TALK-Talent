'use client'
import Link from 'next/link'

const C = {
  navA: '#18082E',
  navB: '#2A0E50',
  bg: '#0D0A14',
  surface: '#1A1228',
  surfaceAlt: '#221739',
  border: '#2D2040',
  coral: '#E8503A',
  coralLight: '#F07058',
  purple: '#9B5CFF',
  purpleLight: '#C084FC',
  text: '#F0EBF8',
  textMuted: '#8B7BAD',
  textDim: '#3D2D5C',
}



const members = [
  { name: 'Sarah Chen', title: 'VP Talent · Stripe', initials: 'SC', color: '#E8503A' },
  { name: 'Marcus Webb', title: 'TA Director · Airbnb', initials: 'MW', color: '#9B5CFF' },
  { name: 'Priya Patel', title: 'Head of Recruiting · Figma', initials: 'PP', color: '#C084FC' },
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
  { title: 'AI Recruiting Summit', date: 'Jun 18 · NYC', badge: 'In Person', badgeColor: C.purple },
  { title: 'Sourcing Masterclass', date: 'Jun 24 · Virtual', badge: 'Workshop', badgeColor: '#10B981' },
]

const nav = ['Home', 'Members', 'Events', 'Forums', 'Chats', 'Jobs', 'Polls', 'Chapters', 'Vendors', 'Mentorship']

export default function PlumMockup() {
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* Switcher */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: 999, border: '1px solid #333', fontSize: 12, fontWeight: 700 }}>
        <span style={{ color: '#555', marginRight: 4 }}>Theme:</span>
        <Link href="/mockup/brand/dark" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Midnight Dark</Link>
        <Link href="/mockup/brand/slate" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Slate Pro</Link>
        <Link href="/mockup/brand/warm" style={{ color: '#aaa', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>Warm Espresso</Link>
        <span style={{ color: 'white', background: C.purple, padding: '3px 10px', borderRadius: 999 }}>Deep Plum</span>
        <span style={{ width: 1, height: 14, background: '#333', margin: '0 4px' }} />
        <Link href="/mockup/brand" style={{ color: '#555', padding: '3px 10px', borderRadius: 999, textDecoration: 'none' }}>← Gallery</Link>
      </div>

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `linear-gradient(90deg, ${C.navA} 0%, ${C.navB} 100%)` }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 4 }}>
          <Link href="/mockup/brand/plum" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, textDecoration: 'none' }}>
            <span style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: '1.9rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}><span style={{ color: '#E8503A' }}>TA</span><span style={{ color: 'transparent', WebkitTextStroke: '2.5px #E8503A' }}>LK</span></span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto' }}>
            {nav.map((item, i) => (
              <span key={item} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
                background: i === 0 ? C.coral : 'transparent',
                color: i === 0 ? 'white' : 'rgba(255,255,255,0.45)',
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

        {/* Welcome bar — purple glow feel */}
        <div style={{ background: `linear-gradient(135deg, ${C.purple}22, ${C.coral}15)`, border: `1px solid ${C.purple}44`, borderRadius: 18, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 0 40px ${C.purple}18` }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Good morning, Bill 👋</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textMuted }}>3 new members joined this week · 2 events coming up</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ padding: '9px 18px', borderRadius: 10, background: C.coral, color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Invite Member</button>
            <button style={{ padding: '9px 18px', borderRadius: 10, background: C.surfaceAlt, color: C.text, fontWeight: 700, fontSize: 13, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Post to Forum</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Members', val: '473', delta: '+12 this month', color: C.coral, glow: C.coral },
            { label: 'Active Discussions', val: '953', delta: '+38 this week', color: C.purple, glow: C.purple },
            { label: 'Upcoming Events', val: '12', delta: 'Next: Jun 12', color: C.purpleLight, glow: C.purpleLight },
            { label: 'Open Jobs', val: '34', delta: '8 posted this week', color: '#10B981', glow: '#10B981' },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: `0 0 20px ${s.glow}18` }}>
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
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceAlt }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>New Members</span>
              <span style={{ fontSize: 12, color: C.coral, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {members.map((m, i) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${m.color}cc, ${m.color}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: `0 0 10px ${m.color}44` }}>{m.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.title}</div>
                  </div>
                  <button style={{ padding: '5px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Connect</button>
                </div>
              ))}
            </div>
          </div>

          {/* Forum */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceAlt }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>🔥 Hot Topics</span>
              <span style={{ fontSize: 12, color: C.coral, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {topics.map((t, i) => (
                <div key={t.title} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? C.coral : i === 1 ? C.purple : C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i < 2 ? 'white' : C.textMuted, flexShrink: 0, boxShadow: i < 2 ? `0 0 8px ${i === 0 ? C.coral : C.purple}66` : 'none' }}>{i + 1}</div>
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
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Upcoming Events</span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {events.map((e, i) => (
                  <div key={e.title} style={{ padding: '10px 8px', borderBottom: i < events.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: e.badgeColor + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 10px ${e.badgeColor}30` }}>
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

            {/* Premium CTA */}
            <div style={{ background: `linear-gradient(135deg, ${C.purple}cc, ${C.navA})`, borderRadius: 16, padding: 20, border: `1px solid ${C.purple}44`, boxShadow: `0 0 30px ${C.purple}22`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: C.coral + '20' }} />
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 70, height: 70, borderRadius: '50%', background: C.purple + '30' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 6 }}>Refer a Colleague</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 14 }}>Know a great TA leader? Invite them to TALK.</div>
                <button style={{ width: '100%', padding: '9px 0', borderRadius: 10, background: C.coral, color: 'white', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: `0 4px 15px ${C.coral}44` }}>Send Invite</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
