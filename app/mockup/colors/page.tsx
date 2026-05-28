'use client'
import Link from 'next/link'

/*
  4 directions — each avoids orange + avoids flat black:

  A. Cobalt Blue    — navy nav, cobalt primary, light page
  B. Indigo Night   — deep indigo nav + page, violet primary
  C. Terracotta     — espresso nav, soft dusty terracotta (NOT orange), warm page
  D. Forest         — deep forest nav, emerald primary, cream page
*/

const themes = [
  {
    id: 'cobalt',
    name: 'Cobalt',
    sub: 'Navy nav · Cobalt primary · Clean white content',
    why: 'Confident, authoritative. Classic professional palette with a modern edge. Zero orange.',
    navA: '#0D1B2A', navB: '#1B2D45',
    pageBg: '#F4F7FA',
    cardBg: '#ffffff', cardBorder: '#DDE4ED',
    primary: '#2563EB',       // cobalt blue
    primaryText: '#ffffff',
    accent: '#0EA5E9',        // sky
    textPrimary: '#0D1B2A',
    textMuted: '#5A7090',
    swatches: ['#0D1B2A','#2563EB','#0EA5E9','#F4F7FA'],
    swatch_labels: ['Navy','Cobalt','Sky','Cloud'],
    tag_bg: '#EFF6FF', tag_text: '#2563EB',
  },
  {
    id: 'indigo',
    name: 'Indigo Night',
    sub: 'Deep indigo nav + bg · Violet primary · Dark content',
    why: 'Premium and distinctive. The purple echoes the A-dot in the original TALK logo. No orange, no flat black.',
    navA: '#1E1045', navB: '#2D1870',
    pageBg: '#110A2E',
    cardBg: '#1E1045', cardBorder: '#3D2880',
    primary: '#7C3AED',       // rich violet
    primaryText: '#ffffff',
    accent: '#A78BFA',
    textPrimary: '#EDE9FE',
    textMuted: '#7C6FAA',
    swatches: ['#1E1045','#7C3AED','#A78BFA','#110A2E'],
    swatch_labels: ['Indigo','Violet','Lavender','Dark'],
    tag_bg: '#3D2880', tag_text: '#A78BFA',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    sub: 'Espresso nav · Dusty terracotta · Warm cream content',
    why: 'Keeps the warmth of coral but dials back the saturation. Earthy, sophisticated — closer to the original TALK logo tone.',
    navA: '#1C1208', navB: '#2D1E10',
    pageBg: '#FBF8F4',
    cardBg: '#ffffff', cardBorder: '#EDE0D4',
    primary: '#B85C44',       // dusty terracotta — warm but NOT orange
    primaryText: '#ffffff',
    accent: '#D4845A',
    textPrimary: '#1C1208',
    textMuted: '#7C6A58',
    swatches: ['#1C1208','#B85C44','#D4845A','#FBF8F4'],
    swatch_labels: ['Espresso','Terracotta','Clay','Cream'],
    tag_bg: '#FDF0EB', tag_text: '#B85C44',
  },
  {
    id: 'forest',
    name: 'Forest',
    sub: 'Deep forest nav · Emerald primary · Soft cream content',
    why: 'Fresh and unexpected — no TA brand looks like this. Green signals growth, trust, community. Completely avoids the orange problem.',
    navA: '#0A1F14', navB: '#132E1E',
    pageBg: '#F6FAF7',
    cardBg: '#ffffff', cardBorder: '#D1E7D9',
    primary: '#16A34A',       // emerald green
    primaryText: '#ffffff',
    accent: '#0D9488',        // teal
    textPrimary: '#0A1F14',
    textMuted: '#4A7060',
    swatches: ['#0A1F14','#16A34A','#0D9488','#F6FAF7'],
    swatch_labels: ['Forest','Emerald','Teal','Sage'],
    tag_bg: '#ECFDF5', tag_text: '#16A34A',
  },
]

const members = [
  { i: 'SC', name: 'Sarah Chen',   title: 'VP Talent · Stripe',  c: '#2563EB' },
  { i: 'MW', name: 'Marcus Webb',  title: 'TA Director · Airbnb', c: '#7C3AED' },
  { i: 'PP', name: 'Priya Patel',  title: 'Head of Recruiting',  c: '#059669' },
  { i: 'JE', name: 'Jordan Ellis', title: 'Talent Lead · Notion', c: '#B85C44' },
]

const topics = [
  { n: 1, t: 'Structuring sourcing teams in 2025', r: 24 },
  { n: 2, t: 'AI screening: what actually works?',  r: 18 },
  { n: 3, t: 'Comp benchmarking data sources',      r: 15 },
]

function Preview({ th }: { th: typeof themes[0] }) {
  const isDark = th.pageBg.startsWith('#0') || th.pageBg.startsWith('#1')
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${th.cardBorder}`, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Nav */}
      <div style={{ background: `linear-gradient(90deg,${th.navA},${th.navB})`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 20, lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline', flexShrink: 0 }}>
          <span style={{ color: th.primary }}>TA</span>
          <span style={{ color: 'white' }}>LK</span>
        </span>
        <div style={{ display: 'flex', gap: 2, marginLeft: 6, flex: 1, overflow: 'hidden' }}>
          {['Home','Members','Events','Forums','Jobs'].map((item, i) => (
            <span key={item} style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
              background: i === 0 ? th.primary : 'transparent',
              color: i === 0 ? th.primaryText : 'rgba(255,255,255,0.45)',
            }}>{item}</span>
          ))}
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: th.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', flexShrink: 0 }}>BT</div>
      </div>

      {/* Page */}
      <div style={{ background: th.pageBg, padding: 14, flex: 1 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 10 }}>
          {[
            { v:'473', l:'Members',     c: th.primary },
            { v:'953', l:'Topics',      c: th.accent  },
            { v:'12',  l:'Events',      c: '#10B981'  },
            { v:'34',  l:'Jobs',        c: '#F59E0B'  },
          ].map(s => (
            <div key={s.l} style={{ background: th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius: 9, padding: '9px 10px' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: th.textMuted, marginTop: 2, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* 2 panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Members */}
          <div style={{ background: th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '7px 11px', borderBottom:`1px solid ${th.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: th.textPrimary }}>New Members</span>
              <span style={{ fontSize: 9, color: th.primary, fontWeight: 600 }}>View all →</span>
            </div>
            {members.map((m, i) => (
              <div key={m.i} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 11px', borderBottom: i<members.length-1?`1px solid ${th.cardBorder}`:'none' }}>
                <div style={{ width:24,height:24,borderRadius:'50%',background:m.c,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'white' }}>{m.i}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:th.textPrimary,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize:8,color:th.textMuted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{m.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Topics */}
          <div style={{ background: th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '7px 11px', borderBottom:`1px solid ${th.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: th.textPrimary }}>🔥 Hot Topics</span>
              <span style={{ fontSize: 9, color: th.primary, fontWeight: 600 }}>View all →</span>
            </div>
            {topics.map((tp, i) => (
              <div key={tp.n} style={{ display:'flex',gap:7,alignItems:'flex-start',padding:'7px 11px',borderBottom:i<topics.length-1?`1px solid ${th.cardBorder}`:'none' }}>
                <div style={{ width:15,height:15,borderRadius:4,background:tp.n<=2?th.primary:th.tag_bg,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:tp.n<=2?'white':th.textMuted }}>{tp.n}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:9,fontWeight:600,color:th.textPrimary,lineHeight:1.35 }}>{tp.t}</div>
                  <div style={{ fontSize:8,color:th.textMuted,marginTop:1 }}>{tp.r} replies</div>
                </div>
              </div>
            ))}
            {/* CTA card */}
            <div style={{ margin:'8px 10px',background:`linear-gradient(135deg,${th.primary},${th.accent})`,borderRadius:8,padding:'10px 12px' }}>
              <div style={{ fontSize:10,fontWeight:800,color:'white',marginBottom:3 }}>Invite a colleague</div>
              <div style={{ fontSize:8,color:'rgba(255,255,255,0.75)',lineHeight:1.4 }}>Know a great TA leader? Bring them in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer label */}
      <div style={{ background:`linear-gradient(90deg,${th.navA},${th.navB})`, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:12,fontWeight:800,color:'white' }}>{th.name}</div>
          <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:1 }}>{th.sub}</div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {th.swatches.map((s,i) => (
            <div key={i} title={th.swatch_labels[i]} style={{ width:14,height:14,borderRadius:'50%',background:s,border:'1.5px solid rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ColorsGallery() {
  return (
    <div style={{ fontFamily:'system-ui,-apple-system,sans-serif', background:'#070709', minHeight:'100vh', padding:'44px 28px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'baseline', fontWeight:900, fontSize:48, letterSpacing:'-0.03em' }}>
            <span style={{ color:'#888' }}>TA</span><span style={{ color:'white' }}>LK</span>
          </div>
          <p style={{ color:'#444', fontSize:13, marginTop:10 }}>No orange. No flat black. 4 refined directions.</p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:16 }}>
            <Link href="/mockup/brand" style={{ fontSize:12, color:'#555', textDecoration:'none' }}>← Previous palette options</Link>
          </div>
        </div>

        {/* 2×2 grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:44 }}>
          {themes.map(t => <Preview key={t.id} th={t} />)}
        </div>

        {/* Why each one works */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:44 }}>
          {themes.map(t => (
            <div key={t.id} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:t.primary, flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:800, color:'white' }}>{t.name}</span>
              </div>
              <p style={{ fontSize:11, color:'#666', lineHeight:1.6, margin:0 }}>{t.why}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ background:'#0e0e0e', border:'1px solid #1e1e1e', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #1a1a1a' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.08em' }}>Side by side</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'100px repeat(4,1fr)', fontSize:11 }}>
            {['', ...themes.map(t => t.name)].map((h, i) => (
              <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid #1a1a1a', fontWeight:700, color: i===0 ? '#333' : 'white',
                background: i===0 ? 'transparent' : `linear-gradient(90deg,${themes[i-1].navA},${themes[i-1].navB})` }}>
                {h}
              </div>
            ))}
            {[
              { label:'Primary',  vals:['Cobalt blue','Rich violet','Dusty terracotta','Emerald green'] },
              { label:'Nav',      vals:['Deep navy','Deep indigo','Espresso brown','Deep forest'] },
              { label:'Page',     vals:['Pale blue-white','Dark indigo','Warm cream','Sage white'] },
              { label:'Feel',     vals:['Authoritative','Premium','Human & warm','Fresh & hopeful'] },
              { label:'Risk',     vals:['Very low','Low','Low','Medium'] },
              { label:'Best for', vals:['Wide adoption','Senior leaders','Community vibe','Stand-out brand'] },
            ].map((row, ri) => (
              [
                <div key={`l${ri}`} style={{ padding:'8px 14px', borderBottom:'1px solid #141414', color:'#444', fontWeight:600 }}>{row.label}</div>,
                ...row.vals.map((v, vi) => (
                  <div key={`v${ri}${vi}`} style={{ padding:'8px 14px', borderBottom:'1px solid #141414', color:'#888', borderLeft:'1px solid #141414' }}>{v}</div>
                ))
              ]
            ))}
          </div>
        </div>

        <p style={{ textAlign:'center', color:'#2a2a2a', fontSize:11, marginTop:28 }}>
          Like one? Tell me which and I'll apply it to the live app immediately.
        </p>
      </div>
    </div>
  )
}
