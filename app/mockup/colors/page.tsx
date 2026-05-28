'use client'
import Link from 'next/link'

/*
  The red (#E8503A) stays in the TA logo mark — that's the brand anchor.
  Each option builds a supporting palette AROUND it so it pops
  rather than clashes. Red is used only for the logo + 1 primary CTA.
  Everything else uses the complementary system.
*/

const LOGO_RED = '#E8503A'

const themes = [
  {
    id: 'navy',
    name: 'Navy',
    sub: 'Deep navy nav · Red logo pops · Clean light page',
    why: 'Navy + red is one of the most timeless professional combinations — think American Express, Ralph Lauren. The red logo becomes a deliberate accent rather than a wall of orange.',
    navA: '#0F1F35', navB: '#162D4A',
    pageBg: '#F5F8FC',
    cardBg: '#ffffff',
    cardBorder: '#DDE6F0',
    navActive: '#1E4B82',     // navy highlight — NOT red
    navActiveText: '#ffffff',
    cta: '#1E4B82',           // navy CTA
    ctaText: '#ffffff',
    accent: '#3B82F6',
    textPrimary: '#0F1F35',
    textMuted: '#5A7090',
    statColors: ['#1E4B82','#3B82F6','#0D9488','#D97706'],
  },
  {
    id: 'slate',
    name: 'Slate',
    sub: 'Warm slate nav · Red logo anchors · White content',
    why: 'The slight blue-grey warmth of slate sits perfectly opposite the warm red. Feels like a grown-up LinkedIn — familiar enough for broad adoption, distinctive enough to feel premium.',
    navA: '#1A2332', navB: '#22314A',
    pageBg: '#F8FAFC',
    cardBg: '#ffffff',
    cardBorder: '#E2E8F0',
    navActive: '#334D6E',
    navActiveText: '#ffffff',
    cta: '#2D4A6E',
    ctaText: '#ffffff',
    accent: '#475569',
    textPrimary: '#1A2332',
    textMuted: '#64748B',
    statColors: ['#2D4A6E','#475569','#0D9488','#D97706'],
  },
  {
    id: 'espresso',
    name: 'Espresso',
    sub: 'Espresso nav · Red in the same warm family · Cream page',
    why: 'Warm-on-warm: espresso brown and coral red are in the same color family, so the logo feels intentional. The cream page keeps it from feeling heavy. Most "human" of the four.',
    navA: '#1C1208', navB: '#2D1E10',
    pageBg: '#FBF8F4',
    cardBg: '#ffffff',
    cardBorder: '#EDE0D4',
    navActive: '#4A3120',
    navActiveText: '#F5E6D8',
    cta: '#3D2A1A',
    ctaText: '#F5E6D8',
    accent: '#92694A',
    textPrimary: '#1C1208',
    textMuted: '#7C6A58',
    statColors: ['#4A3120','#92694A','#0D9488','#D97706'],
  },
  {
    id: 'plum',
    name: 'Plum',
    sub: 'Deep plum nav · Red + purple harmony · Dark rich page',
    why: 'Red and purple are analogous — they sit next to each other on the color wheel and create natural richness together. The plum in the nav echoes the purple dot on the A in the logo mark.',
    navA: '#1E1040', navB: '#2A1560',
    pageBg: '#120D28',
    cardBg: '#1E1040',
    cardBorder: '#362060',
    navActive: '#3D2580',
    navActiveText: '#DDD6FE',
    cta: '#6D28D9',
    ctaText: '#ffffff',
    accent: '#8B5CF6',
    textPrimary: '#EDE9FE',
    textMuted: '#8B7BAD',
    statColors: ['#6D28D9','#8B5CF6','#0D9488','#D97706'],
  },
]

const members = [
  { i:'SC', name:'Sarah Chen',   title:'VP Talent · Stripe',  c:'#2563EB' },
  { i:'MW', name:'Marcus Webb',  title:'TA Director · Airbnb', c:'#7C3AED' },
  { i:'PP', name:'Priya Patel',  title:'Head of Recruiting',  c:'#059669' },
  { i:'JE', name:'Jordan Ellis', title:'Talent Lead · Notion', c:'#D97706' },
]

const topics = [
  { n:1, t:'Structuring sourcing teams in 2025', r:24 },
  { n:2, t:'AI screening: what actually works?',  r:18 },
  { n:3, t:'Comp benchmarking data sources',      r:15 },
]

function Preview({ th }: { th: typeof themes[0] }) {
  return (
    <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${th.cardBorder}`, display:'flex', flexDirection:'column' }}>

      {/* Nav — red only on logo */}
      <div style={{ background:`linear-gradient(90deg,${th.navA},${th.navB})`, padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'system-ui,-apple-system,sans-serif', fontWeight:900, fontSize:20, lineHeight:1, letterSpacing:'-0.03em', display:'inline-flex', alignItems:'baseline', flexShrink:0 }}>
          <span style={{ color: LOGO_RED }}>TA</span>
          <span style={{ color:'white' }}>LK</span>
        </span>
        <div style={{ display:'flex', gap:2, marginLeft:6, flex:1, overflow:'hidden' }}>
          {['Home','Members','Events','Forums','Jobs'].map((item, i) => (
            <span key={item} style={{
              padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:600, whiteSpace:'nowrap',
              background: i===0 ? th.navActive : 'transparent',
              color: i===0 ? th.navActiveText : 'rgba(255,255,255,0.45)',
            }}>{item}</span>
          ))}
        </div>
        <div style={{ width:26, height:26, borderRadius:'50%', background:th.navActive, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:th.navActiveText, flexShrink:0 }}>BT</div>
      </div>

      {/* Page */}
      <div style={{ background:th.pageBg, padding:14, flex:1 }}>

        {/* Welcome banner — red CTA only here */}
        <div style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:10, padding:'10px 14px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:th.textPrimary }}>Good morning, Bill 👋</div>
            <div style={{ fontSize:9, color:th.textMuted, marginTop:2 }}>3 new members this week · 2 upcoming events</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {/* Primary CTA = red (the one place it's allowed outside the logo) */}
            <div style={{ padding:'5px 11px', borderRadius:7, background:LOGO_RED, color:'white', fontSize:9, fontWeight:700 }}>Invite Member</div>
            <div style={{ padding:'5px 11px', borderRadius:7, background:th.navActive, color:th.navActiveText, fontSize:9, fontWeight:700 }}>Post to Forum</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:10 }}>
          {[
            { v:'473', l:'Members',   c:th.statColors[0] },
            { v:'953', l:'Topics',    c:th.statColors[1] },
            { v:'12',  l:'Events',    c:th.statColors[2] },
            { v:'34',  l:'Jobs',      c:th.statColors[3] },
          ].map(s => (
            <div key={s.l} style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:8, padding:'9px 10px' }}>
              <div style={{ fontSize:17, fontWeight:900, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9, color:th.textMuted, marginTop:2, fontWeight:600 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* 2-col */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {/* Members */}
          <div style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'7px 11px', borderBottom:`1px solid ${th.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, color:th.textPrimary }}>New Members</span>
              <span style={{ fontSize:9, color:th.accent, fontWeight:600 }}>View all →</span>
            </div>
            {members.map((m,i) => (
              <div key={m.i} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 11px', borderBottom:i<members.length-1?`1px solid ${th.cardBorder}`:'none' }}>
                <div style={{ width:24,height:24,borderRadius:'50%',background:m.c,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'white' }}>{m.i}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:th.textPrimary,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize:8,color:th.textMuted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{m.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Topics */}
          <div style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'7px 11px', borderBottom:`1px solid ${th.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, color:th.textPrimary }}>🔥 Hot Topics</span>
              <span style={{ fontSize:9, color:th.accent, fontWeight:600 }}>View all →</span>
            </div>
            {topics.map((tp,i) => (
              <div key={tp.n} style={{ display:'flex',gap:7,alignItems:'flex-start',padding:'7px 11px',borderBottom:i<topics.length-1?`1px solid ${th.cardBorder}`:'none' }}>
                <div style={{ width:15,height:15,borderRadius:4,background:tp.n<=2?th.cta:th.cardBorder,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:tp.n<=2?th.ctaText:th.textMuted }}>{tp.n}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:9,fontWeight:600,color:th.textPrimary,lineHeight:1.35 }}>{tp.t}</div>
                  <div style={{ fontSize:8,color:th.textMuted,marginTop:1 }}>{tp.r} replies</div>
                </div>
              </div>
            ))}
            <div style={{ margin:'8px 10px', background:`linear-gradient(135deg,${th.cta},${th.accent})`, borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:10,fontWeight:800,color:th.ctaText,marginBottom:3 }}>Refer a colleague</div>
              <div style={{ fontSize:8,color:'rgba(255,255,255,0.65)',lineHeight:1.4 }}>Know a great TA leader? Invite them in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:`linear-gradient(90deg,${th.navA},${th.navB})`, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:'white' }}>{th.name}</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.38)', marginTop:1 }}>{th.sub}</div>
        </div>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          <div title="Logo red (fixed)" style={{ width:14,height:14,borderRadius:'50%',background:LOGO_RED,border:'1.5px solid rgba(255,255,255,0.2)' }} />
          <div title="Nav active" style={{ width:14,height:14,borderRadius:'50%',background:th.navActive,border:'1.5px solid rgba(255,255,255,0.15)' }} />
          <div title="Accent" style={{ width:14,height:14,borderRadius:'50%',background:th.accent,border:'1.5px solid rgba(255,255,255,0.15)' }} />
          <div title="Page" style={{ width:14,height:14,borderRadius:'50%',background:th.pageBg,border:'1.5px solid rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  )
}

export default function ColorsGallery() {
  return (
    <div style={{ fontFamily:'system-ui,-apple-system,sans-serif', background:'#07070A', minHeight:'100vh', padding:'44px 28px' }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontFamily:'system-ui,-apple-system,sans-serif', fontWeight:900, fontSize:52, lineHeight:1, letterSpacing:'-0.03em', display:'inline-flex', alignItems:'baseline' }}>
            <span style={{ color:LOGO_RED }}>TA</span>
            <span style={{ color:'white' }}>LK</span>
          </span>
          <p style={{ color:'#444', fontSize:13, marginTop:12, maxWidth:480, margin:'12px auto 0' }}>
            The red stays. These 4 palettes are built to complement it —
            red appears only in the logo mark and one primary CTA. Everything else uses the supporting system.
          </p>
        </div>

        {/* 2×2 grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:44 }}>
          {themes.map(t => <Preview key={t.id} th={t} />)}
        </div>

        {/* Rationale cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:44 }}>
          {themes.map(t => (
            <div key={t.id} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:t.navA, border:`2px solid ${t.accent}`, flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:800, color:'white' }}>{t.name}</span>
              </div>
              <p style={{ fontSize:11, color:'#555', lineHeight:1.65, margin:0 }}>{t.why}</p>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div style={{ background:'#0c0c0e', border:'1px solid #1a1a1a', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', borderBottom:'1px solid #1a1a1a' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#333', textTransform:'uppercase', letterSpacing:'0.08em' }}>Comparison</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'110px repeat(4,1fr)', fontSize:11 }}>
            {['', ...themes.map(t => t.name)].map((h, i) => (
              <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid #141414', fontWeight:700,
                color: i===0 ? '#333' : 'white',
                background: i===0 ? 'transparent' : `linear-gradient(90deg,${themes[i-1].navA},${themes[i-1].navB})` }}>
                {h}
              </div>
            ))}
            {[
              { label:'Nav bg',    vals:['Deep navy','Warm slate','Espresso','Deep plum'] },
              { label:'Page bg',   vals:['Pale blue','Clean white','Warm cream','Dark indigo'] },
              { label:'Buttons',   vals:['Navy','Slate blue','Espresso brown','Violet'] },
              { label:'Red used',  vals:['Logo + 1 CTA','Logo + 1 CTA','Logo + 1 CTA','Logo + 1 CTA'] },
              { label:'Feel',      vals:['Authoritative','Professional','Human','Premium'] },
              { label:'Best for',  vals:['Widest appeal','Clean modern','Warmth & trust','Distinction'] },
            ].map((row, ri) => [
              <div key={`l${ri}`} style={{ padding:'8px 14px', borderBottom:'1px solid #141414', color:'#444', fontWeight:600 }}>{row.label}</div>,
              ...row.vals.map((v, vi) => (
                <div key={`v${ri}${vi}`} style={{ padding:'8px 14px', borderBottom:'1px solid #141414', color:'#777', borderLeft:'1px solid #141414' }}>{v}</div>
              ))
            ])}
          </div>
        </div>

        <p style={{ textAlign:'center', color:'#222', fontSize:11, marginTop:28 }}>
          Tell me which one feels right and I'll apply it to the whole app in one shot.
        </p>
      </div>
    </div>
  )
}
