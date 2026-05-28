'use client'
import Link from 'next/link'

const schemes = [
  {
    href: '/mockup/brand/dark',
    name: 'Midnight Dark',
    tagline: 'Deep charcoal · Coral accent · Current direction refined',
    nav: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)',
    bg: '#0f0f0f',
    card: '#1a1a1a',
    active: '#E8503A',
    textActive: '#fff',
    swatches: ['#0d0d0d', '#1a1a2e', '#E8503A', '#9B5CFF'],
    labels: ['Charcoal', 'Navy', 'Coral', 'Purple'],
  },
  {
    href: '/mockup/brand/slate',
    name: 'Slate Pro',
    tagline: 'Dark slate nav · Light page · Corporate-clean',
    nav: 'linear-gradient(90deg, #1E2535 0%, #243044 100%)',
    bg: '#EFF2F7',
    card: '#ffffff',
    active: '#E8503A',
    textActive: '#fff',
    swatches: ['#1E2535', '#243044', '#E8503A', '#3B82F6'],
    labels: ['Slate', 'Steel', 'Coral', 'Blue'],
  },
  {
    href: '/mockup/brand/warm',
    name: 'Warm Espresso',
    tagline: 'Espresso nav · Warm white page · Human & welcoming',
    nav: 'linear-gradient(90deg, #1C1208 0%, #2D1E10 100%)',
    bg: '#FBF8F4',
    card: '#ffffff',
    active: '#E8503A',
    textActive: '#fff',
    swatches: ['#1C1208', '#2D1E10', '#E8503A', '#F59E0B'],
    labels: ['Espresso', 'Mocha', 'Coral', 'Amber'],
  },
  {
    href: '/mockup/brand/plum',
    name: 'Deep Plum',
    tagline: 'Rich plum nav · Purple-black bg · Bold & premium',
    nav: 'linear-gradient(90deg, #18082E 0%, #2A0E50 100%)',
    bg: '#0D0A14',
    card: '#1A1228',
    active: '#E8503A',
    textActive: '#fff',
    swatches: ['#18082E', '#2A0E50', '#E8503A', '#9B5CFF'],
    labels: ['Plum', 'Violet', 'Coral', 'Purple'],
  },
]

// Tiny TALK logo SVG
function TalkLogo({ size = 28, stroke = '#ffffff' }: { size?: number; stroke?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height={size} style={{ width: 'auto' }}>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9B5CFF"/><stop offset="100%" stopColor="#6F2CFF"/>
        </linearGradient>
      </defs>
      <g transform="translate(110 95)">
        <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke={stroke} strokeWidth="24" strokeLinejoin="round"/>
        <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#pg)"/>
        <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill={stroke}/>
        <rect x="126" y="78" width="208" height="38" rx="19" fill="#000" opacity="0.85"/>
        <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000" opacity="0.85"/>
      </g>
    </svg>
  )
}

export default function BrandMockupIndex() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0a', minHeight: '100vh', padding: '48px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <TalkLogo size={40} stroke="#ffffff" />
            <span style={{ color: 'white', fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em' }}>
              T<span style={{ position: 'relative', display: 'inline-block' }}>A
                <span style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 3, left: '50%', transform: 'translateX(-50%)' }} />
              </span>LK
            </span>
          </div>
          <p style={{ color: '#555', fontSize: 14 }}>Brand color explorations · 4 directions · Click to preview full dashboard</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {schemes.map((s) => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #222', transition: 'transform 0.15s, border-color 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E8503A'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#222'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                {/* Mini nav */}
                <div style={{ background: s.nav, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TalkLogo size={22} stroke="#ffffff" />
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>TALK</span>
                  <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
                    {['Home', 'Members', 'Events', 'Forums', 'Jobs'].map((item, i) => (
                      <span key={item} style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: i === 0 ? s.active : 'transparent',
                        color: i === 0 ? s.textActive : 'rgba(255,255,255,0.45)',
                      }}>{item}</span>
                    ))}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ width: 60, height: 24, borderRadius: 8, background: s.active, opacity: 0.9 }} />
                  </div>
                </div>

                {/* Mini page */}
                <div style={{ background: s.bg, padding: 16 }}>
                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Members', val: '473', color: s.swatches[2] },
                      { label: 'Events', val: '12', color: s.swatches[3] },
                      { label: 'Forum Topics', val: '953', color: s.swatches[1] },
                      { label: 'Jobs', val: '34', color: '#10b981' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: s.card, borderRadius: 10, padding: '10px 12px', border: `1px solid ${s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#2a2a2a' : '#e5e7eb'}` }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: stat.color }}>{stat.val}</div>
                        <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Content row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Member cards */}
                    <div style={{ background: s.card, borderRadius: 10, padding: 12, border: `1px solid ${s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#2a2a2a' : '#e5e7eb'}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
                      {[1,2,3].map(i => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${s.swatches[2]}, ${s.swatches[3]})`, flexShrink: 0 }} />
                          <div>
                            <div style={{ width: 70, height: 7, background: s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#2a2a2a' : '#e5e7eb', borderRadius: 4, marginBottom: 3 }} />
                            <div style={{ width: 50, height: 6, background: s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#222' : '#f0f0f0', borderRadius: 4 }} />
                          </div>
                          <div style={{ marginLeft: 'auto', padding: '2px 7px', borderRadius: 6, background: s.swatches[2], fontSize: 8, color: 'white', fontWeight: 700 }}>Connect</div>
                        </div>
                      ))}
                    </div>

                    {/* Activity feed */}
                    <div style={{ background: s.card, borderRadius: 10, padding: 12, border: `1px solid ${s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#2a2a2a' : '#e5e7eb'}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Topics</div>
                      {['AI in Recruiting 2025', 'TA Tools Benchmark', 'Hiring Freeze Trends'].map((topic, i) => (
                        <div key={topic} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: i < 2 ? `1px solid ${s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#2a2a2a' : '#f0f0f0'}` : 'none' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 5, background: s.swatches[3], flexShrink: 0, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: s.bg === '#0f0f0f' || s.bg === '#0D0A14' ? '#ddd' : '#333', lineHeight: 1.3 }}>{topic}</div>
                            <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>🔥 {12 - i*3} replies</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ background: s.nav, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{s.tagline}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.swatches.map((sw, i) => (
                      <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: sw, border: '2px solid rgba(255,255,255,0.1)' }} title={s.labels[i]} />
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#333', fontSize: 12, marginTop: 32 }}>
          Click any card to see the full dashboard mockup
        </p>
      </div>
    </div>
  )
}
