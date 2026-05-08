export default function MockupPage() {

  const palettes = [
    {
      label: "Teal + Violet + Amber",
      desc: "Electric teal primary, deep violet for forum/polls, warm amber for events",
      nav: "linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)",
      colors: [
        { name: "Primary (Members, CTA)", hex: "#00d4aa", text: "#0d0d0d" },
        { name: "Violet (Forum, Polls)", hex: "#7c3aed", text: "white" },
        { name: "Amber (Events, Featured)", hex: "#f59e0b", text: "#0d0d0d" },
        { name: "Nav active", hex: "#00d4aa", text: "#0d0d0d" },
      ],
      btns: [
        { label: "Join Chapter", bg: "#00d4aa", color: "#0d0d0d" },
        { label: "View Event", bg: "#f59e0b", color: "#0d0d0d" },
        { label: "Vote Now", bg: "#7c3aed", color: "white" },
        { label: "Apply", bg: "#3b82f6", color: "white" },
      ],
    },
    {
      label: "Teal + Rose + Gold",
      desc: "Teal primary, rose/coral accent for energy, gold for premium highlights",
      nav: "linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)",
      colors: [
        { name: "Primary (Members, CTA)", hex: "#00d4aa", text: "#0d0d0d" },
        { name: "Rose (Forum, Events)", hex: "#f43f5e", text: "white" },
        { name: "Gold (Featured, Jobs)", hex: "#eab308", text: "#0d0d0d" },
        { name: "Nav active", hex: "#00d4aa", text: "#0d0d0d" },
      ],
      btns: [
        { label: "Join Chapter", bg: "#00d4aa", color: "#0d0d0d" },
        { label: "View Event", bg: "#f43f5e", color: "white" },
        { label: "Vote Now", bg: "#eab308", color: "#0d0d0d" },
        { label: "Apply", bg: "#00b894", color: "#0d0d0d" },
      ],
    },
    {
      label: "Teal + Purple + Orange",
      desc: "Teal primary, deep purple for depth, vivid orange for energy and contrast",
      nav: "linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)",
      colors: [
        { name: "Primary (Members, CTA)", hex: "#00d4aa", text: "#0d0d0d" },
        { name: "Purple (Forum, Chapters)", hex: "#8b5cf6", text: "white" },
        { name: "Orange (Events, Jobs)", hex: "#f97316", color: "#0d0d0d" },
        { name: "Nav active", hex: "#00d4aa", text: "#0d0d0d" },
      ],
      btns: [
        { label: "Join Chapter", bg: "#8b5cf6", color: "white" },
        { label: "View Event", bg: "#f97316", color: "white" },
        { label: "Vote Now", bg: "#00d4aa", color: "#0d0d0d" },
        { label: "Apply", bg: "#8b5cf6", color: "white" },
      ],
    },
  ]

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#111", minHeight: "100vh", padding: "32px" }}>
      <h1 style={{ textAlign: "center", fontSize: "16px", color: "#aaa", marginBottom: "8px", fontWeight: 700, letterSpacing: "0.5px" }}>
        TALK — Expanded Palette Options
      </h1>
      <p style={{ textAlign: "center", fontSize: "12px", color: "#555", marginBottom: "32px" }}>
        Base: Dark Charcoal #0d0d0d → #1a1a2e + Electric Teal #00d4aa
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {palettes.map((p) => (
          <div key={p.label} style={{ background: "#1a1a1a", borderRadius: "16px", overflow: "hidden", border: "1px solid #333" }}>

            {/* Mini nav preview */}
            <div style={{ background: p.nav, padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#00d4aa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 34 34"><rect x="6" y="10" width="22" height="3.5" rx="1.75" fill="white"/><rect x="6" y="17" width="16" height="3.5" rx="1.75" fill="white"/></svg>
              </div>
              <span style={{ color: "white", fontWeight: 800, fontSize: "14px" }}>TALK</span>
              <div style={{ marginLeft: "8px", display: "flex", gap: "4px" }}>
                {["Dashboard", "Members", "Events", "Forum"].map((item, i) => (
                  <span key={item} style={{
                    padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                    background: i === 0 ? p.colors[0].hex : "transparent",
                    color: i === 0 ? p.colors[0].text : "rgba(255,255,255,0.5)"
                  }}>{item}</span>
                ))}
              </div>
            </div>

            {/* Color swatches */}
            <div style={{ padding: "16px", display: "flex", gap: "8px" }}>
              {p.colors.map((c) => (
                <div key={c.name} style={{ flex: 1 }}>
                  <div style={{ height: "40px", borderRadius: "8px", background: c.hex, marginBottom: "4px" }} />
                  <p style={{ fontSize: "9px", color: "#666", textAlign: "center", lineHeight: 1.3 }}>{c.name.split(" ")[0]}</p>
                  <p style={{ fontSize: "9px", color: "#444", textAlign: "center" }}>{c.hex}</p>
                </div>
              ))}
            </div>

            {/* Button preview */}
            <div style={{ padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {p.btns.map((b) => (
                <div key={b.label} style={{
                  padding: "7px 14px", borderRadius: "8px",
                  background: b.bg, color: b.color,
                  fontSize: "11px", fontWeight: 700,
                  display: "inline-block"
                }}>
                  {b.label}
                </div>
              ))}
            </div>

            {/* Mini card preview */}
            <div style={{ margin: "0 16px 16px", background: "#242424", borderRadius: "12px", padding: "12px", display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: "8px", background: p.colors[0].hex, borderRadius: "4px", width: "70%", marginBottom: "6px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "90%", marginBottom: "4px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "60%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "8px", background: p.colors[1].hex, borderRadius: "4px", width: "70%", marginBottom: "6px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "90%", marginBottom: "4px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "60%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "8px", background: p.colors[2].hex, borderRadius: "4px", width: "70%", marginBottom: "6px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "90%", marginBottom: "4px" }} />
                <div style={{ height: "6px", background: "#333", borderRadius: "4px", width: "60%" }} />
              </div>
            </div>

            <div style={{ padding: "0 16px 16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "4px" }}>{p.label}</p>
              <p style={{ fontSize: "11px", color: "#666", lineHeight: 1.5 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
