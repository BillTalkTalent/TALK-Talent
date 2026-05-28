'use client'
import Link from 'next/link'

function Wordmark({ fill = '#E8503A', size = 22 }: { fill?: string; size?: number }) {
  return (
    <span style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline', userSelect: 'none' }}>
      <span style={{ color: fill }}>TA</span>
      <span style={{ color: 'white' }}>LK</span>
    </span>
  )
}

const themes = [
  {
    id: 'dark',
    name: 'Midnight Dark',
    pitch: 'Premium exclusive network feel. High contrast, focused.',
    href: '/mockup/brand/dark',
    navBg: 'linear-gradient(90deg,#0d0d0d,#1a1a2e)',
    pageBg: '#0f0f0f',
    cardBg: '#181818',
    cardBorder: '#2a2a2a',
    coral: '#E8503A',
    accent: '#9B5CFF',
    textPrimary: '#f0f0f0',
    textMuted: '#888',
    swatches: [
      { hex: '#0d0d0d', label: 'Charcoal' },
      { hex: '#1a1a2e', label: 'Navy' },
      { hex: '#E8503A', label: 'Coral' },
      { hex: '#9B5CFF', label: 'Purple' },
    ],
    pros: ['Feels premium & exclusive', 'Logo pops perfectly', 'High-focus reading'],
    cons: ['Can feel heavy', 'Less "community" warmth'],
  },
  {
    id: 'slate',
    name: 'Slate Pro',
    pitch: 'Dark nav, light content. Professional and airy — closest to LinkedIn.',
    href: '/mockup/brand/slate',
    navBg: 'linear-gradient(90deg,#1E2535,#243044)',
    pageBg: '#EFF2F7',
    cardBg: '#ffffff',
    cardBorder: '#E2E8F0',
    coral: '#E8503A',
    accent: '#3B82F6',
    textPrimary: '#1E293B',
    textMuted: '#64748B',
    swatches: [
      { hex: '#1E2535', label: 'Slate' },
      { hex: '#243044', label: 'Steel' },
      { hex: '#E8503A', label: 'Coral' },
      { hex: '#3B82F6', label: 'Blue' },
    ],
    pros: ['Highly readable', 'Broadest appeal', 'Professional & familiar'],
    cons: ['Less distinctive', 'Similar to many platforms'],
  },
  {
    id: 'warm',
    name: 'Warm Espresso',
    pitch: 'Espresso nav, warm cream content. Human, relationship-forward.',
    href: '/mockup/brand/warm',
    navBg: 'linear-gradient(90deg,#1C1208,#2D1E10)',
    pageBg: '#FBF8F4',
    cardBg: '#ffffff',
    cardBorder: '#EDE0D4',
    coral: '#E8503A',
    accent: '#F59E0B',
    textPrimary: '#1C1208',
    textMuted: '#7C6A58',
    swatches: [
      { hex: '#1C1208', label: 'Espresso' },
      { hex: '#2D1E10', label: 'Mocha' },
      { hex: '#E8503A', label: 'Coral' },
      { hex: '#F59E0B', label: 'Amber' },
    ],
    pros: ['Warmest community feel', 'Coral + amber complement', 'Stands apart'],
    cons: ['More casual', 'Amber accent is bold'],
  },
  {
    id: 'plum',
    name: 'Deep Plum',
    pitch: 'Rich plum nav, dark content. Bold, premium, truly distinctive.',
    href: '/mockup/brand/plum',
    navBg: 'linear-gradient(90deg,#18082E,#2A0E50)',
    pageBg: '#0D0A14',
    cardBg: '#1A1228',
    cardBorder: '#2D2040',
    coral: '#E8503A',
    accent: '#9B5CFF',
    textPrimary: '#F0EBF8',
    textMuted: '#8B7BAD',
    swatches: [
      { hex: '#18082E', label: 'Plum' },
      { hex: '#2A0E50', label: 'Violet' },
      { hex: '#E8503A', label: 'Coral' },
      { hex: '#9B5CFF', label: 'Purple' },
    ],
    pros: ['Completely unique in TA', 'Echoes logo purple', 'Premium feel'],
    cons: ['Highest risk/reward', 'Darker overall'],
  },
]

const members = [
  { initials: 'SC', name: 'Sarah Chen', title: 'VP Talent · Stripe', c: '#E8503A' },
  { initials: 'MW', name: 'Marcus Webb', title: 'TA Director · Airbnb', c: '#8B5CF6' },
  { initials: 'PP', name: 'Priya Patel', title: 'Head of Recruiting · Figma', c: '#3B82F6' },
  { initials: 'JE', name: 'Jordan Ellis', title: 'Talent Lead · Notion', c: '#10B981' },
]

const topics = [
  { n: 1, title: 'Structuring sourcing teams in 2025', replies: 24 },
  { n: 2, title: 'AI screening tools: what actually works?', replies: 18 },
  { n: 3, title: 'Comp benchmarking — which sources do you trust?', replies: 15 },
]

function ThemePreview({ t }: { t: typeof themes[0] }) {
  const dark = t.pageBg.startsWith('#0') || t.pageBg.startsWith('#1')
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ── */}
      <div style={{ background: t.navBg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wordmark size={20} fill={t.coral} />
        <div style={{ display: 'flex', gap: 2, marginLeft: 6, flex: 1 }}>
          {['Home', 'Members', 'Events', 'Forums', 'Jobs'].map((item, i) => (
            <span key={item} style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
              background: i === 0 ? t.coral : 'transparent',
              color: i === 0 ? 'white' : 'rgba(255,255,255,0.45)',
            }}>{item}</span>
          ))}
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${t.coral},#F07058)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 }}>BT</div>
      </div>

      {/* ── Dashboard ── */}
      <div style={{ background: t.pageBg, padding: 14, flex: 1 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { val: '473', label: 'Members', color: t.coral },
            { val: '953', label: 'Discussions', color: t.accent },
            { val: '12', label: 'Events', color: '#10B981' },
            { val: '34', label: 'Jobs', color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content 2-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Members */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary }}>New Members</span>
              <span style={{ fontSize: 9, color: t.coral, fontWeight: 600 }}>View all →</span>
            </div>
            {members.map((m, i) => (
              <div key={m.initials} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: i < members.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.c, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white' }}>{m.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize: 9, color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Forum */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary }}>🔥 Hot Topics</span>
              <span style={{ fontSize: 9, color: t.coral, fontWeight: 600 }}>View all →</span>
            </div>
            {topics.map((tp, i) => (
              <div key={tp.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderBottom: i < topics.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: tp.n <= 2 ? t.coral : t.cardBorder, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: tp.n <= 2 ? 'white' : t.textMuted }}>{tp.n}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textPrimary, lineHeight: 1.35 }}>{tp.title}</div>
                  <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{tp.replies} replies</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer: swatches + info ── */}
      <div style={{ background: t.navBg, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{t.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{t.pitch}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {t.swatches.map(s => (
            <div key={s.hex} title={`${s.label} ${s.hex}`} style={{ width: 16, height: 16, borderRadius: '50%', background: s.hex, border: '2px solid rgba(255,255,255,0.15)', cursor: 'default' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BrandGallery() {
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: '#060606', minHeight: '100vh', padding: '48px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Wordmark size={52} fill="#E8503A" />
          <p style={{ color: '#444', fontSize: 13, marginTop: 16 }}>
            4 brand directions · all use the same coral + white wordmark · click any to see the full dashboard
          </p>
        </div>

        {/* 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 48 }}>
          {themes.map(t => (
            <Link key={t.id} href={t.href} style={{ textDecoration: 'none', display: 'block' }}>
              <ThemePreview t={t} />
            </Link>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #222' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick comparison</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', fontSize: 11 }}>
            {/* Header row */}
            {['', ...themes.map(t => t.name)].map((h, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', fontWeight: 700, color: i === 0 ? '#444' : 'white', background: i === 0 ? 'transparent' : themes[i-1].navBg }}>
                {h}
              </div>
            ))}
            {/* Rows */}
            {[
              { label: 'Background', vals: ['Full dark', 'Light', 'Warm white', 'Dark purple'] },
              { label: 'Nav', vals: ['Charcoal', 'Slate blue', 'Espresso', 'Deep plum'] },
              { label: 'Feel', vals: ['Premium', 'Professional', 'Human', 'Distinctive'] },
              { label: 'Audience fit', vals: ['Tech-forward', 'All TA leaders', 'Community first', 'Bold adopters'] },
              { label: 'Risk', vals: ['Low', 'Very low', 'Low-med', 'Medium'] },
            ].map((row, ri) => (
              <>
                <div key={`label-${ri}`} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', color: '#555', fontWeight: 600 }}>{row.label}</div>
                {row.vals.map((v, vi) => (
                  <div key={`val-${ri}-${vi}`} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', color: '#aaa', borderLeft: '1px solid #1a1a1a' }}>{v}</div>
                ))}
              </>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#333', fontSize: 12, marginTop: 32 }}>
          Click any preview to see the full dashboard mockup
        </p>
      </div>
    </div>
  )
}
