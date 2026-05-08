export default function MockupPage() {
  const benefits = ["Exclusive TA leader network", "Real-time chat & forums", "Events, jobs & vendors"];

  const options = [
    {
      label: "A — Deep Indigo / Violet",
      leftBg: "linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%)",
      logoBg: "rgba(255,255,255,0.2)",
      checkBg: "#818cf8",
      btnBg: "linear-gradient(90deg, #4f46e5, #7c3aed)",
      linkColor: "#4f46e5",
      rightBg: "#f5f5ff",
    },
    {
      label: "B — Deep Burgundy / Red",
      leftBg: "linear-gradient(160deg, #1c0a0a 0%, #7f1d1d 55%, #b91c1c 100%)",
      logoBg: "rgba(255,255,255,0.2)",
      checkBg: "#f87171",
      btnBg: "linear-gradient(90deg, #991b1b, #dc2626)",
      linkColor: "#b91c1c",
      rightBg: "#fff8f8",
    },
    {
      label: "C — Deep Navy / Cobalt Blue",
      leftBg: "linear-gradient(160deg, #0a0f1e 0%, #1e3a5f 55%, #2563eb 100%)",
      logoBg: "rgba(255,255,255,0.2)",
      checkBg: "#60a5fa",
      btnBg: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
      linkColor: "#2563eb",
      rightBg: "#f5f8ff",
    },
    {
      label: "D — Dark Charcoal + Electric Teal",
      leftBg: "linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)",
      logoBg: "#00d4aa",
      checkBg: "#00d4aa",
      btnBg: "linear-gradient(90deg, #00b894, #00d4aa)",
      linkColor: "#00b894",
      rightBg: "#f5fffe",
    },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#e8e8e8", minHeight: "100vh", padding: "32px" }}>
      <h1 style={{ textAlign: "center", fontSize: "16px", color: "#444", marginBottom: "32px", fontWeight: 700, letterSpacing: "0.5px" }}>
        TALK — Brand Color Options
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        {options.map((opt) => (
          <div key={opt.label}>
            <div style={{ borderRadius: "16px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", height: "520px", display: "flex" }}>
              {/* Left panel */}
              <div style={{ width: "42%", background: opt.leftBg, padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: opt.logoBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 34 34"><rect width="34" height="34" rx="9" fill="rgba(255,255,255,0.25)"/><rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/><rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/></svg>
                    </div>
                    <span style={{ fontSize: "24px", fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>TALK</span>
                  </div>
                  <p style={{ fontSize: "7.5px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginTop: "6px" }}>
                    Talent Acquisition Leadership
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {benefits.map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: opt.checkBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "9px", color: "white", fontWeight: 700 }}>✓</div>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{b}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>Join thousands of TA professionals</p>
              </div>

              {/* Right panel */}
              <div style={{ flex: 1, background: opt.rightBg, padding: "28px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "14px" }}>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "#111" }}>Welcome back</div>
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>Sign in to your TALK account</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#555" }}>Email</label>
                  <input readOnly value="bill@talktalent.com" style={{ padding: "9px 12px", borderRadius: "10px", border: "1.5px solid #e0e0e0", fontFamily: "inherit", fontSize: "12px", background: "white", color: "#333" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#555" }}>Password</label>
                  <input readOnly type="password" value="password" style={{ padding: "9px 12px", borderRadius: "10px", border: "1.5px solid #e0e0e0", fontFamily: "inherit", fontSize: "12px", background: "white" }} />
                </div>
                <div style={{ padding: "11px", borderRadius: "10px", background: opt.btnBg, color: "white", fontWeight: 700, fontSize: "13px", textAlign: "center" }}>
                  Sign In
                </div>
                <div style={{ fontSize: "11px", color: "#999", textAlign: "center" }}>
                  No account? <span style={{ fontWeight: 700, color: opt.linkColor }}>Sign up</span>
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#555" }}>{opt.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
