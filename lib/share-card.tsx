import { ImageResponse } from "next/og";

const NAVY_A = "#0F1F35";
const NAVY_B = "#162D4A";
const NAVY_C = "#1A3A5C";
const RED = "#E8503A";

const FONT_BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins";

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 600 | 900; style: "normal" }[]> | null = null;

// Satori (the renderer behind next/og) has no access to system or web
// fonts, so without this every card falls back to a generic thin
// sans-serif instead of the site's actual Poppins branding. Fetched once
// per server instance and reused across requests.
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(`${FONT_BASE}/Poppins-Black.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${FONT_BASE}/Poppins-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    ]).then(([black, semibold]) => [
      { name: "Poppins", data: black, weight: 900 as const, style: "normal" as const },
      { name: "Poppins", data: semibold, weight: 600 as const, style: "normal" as const },
    ]);
  }
  return fontsPromise;
}

export async function generateShareCardPng({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
}): Promise<Buffer> {
  const truncatedTitle = title.length > 70 ? `${title.slice(0, 67)}…` : title;
  const fonts = await loadFonts();

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: `linear-gradient(160deg, ${NAVY_A} 0%, ${NAVY_B} 55%, ${NAVY_C} 100%)`,
          padding: "130px 100px",
          fontFamily: "Poppins",
        }}
      >
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 900, letterSpacing: "-3px" }}>
          <span style={{ color: RED }}>TA</span>
          <span style={{ color: "#ffffff" }}>LK</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "26px",
            fontWeight: 600,
            color: "#93C5FD",
            textTransform: "uppercase",
            letterSpacing: "3px",
            padding: "10px 30px",
            border: "2px solid rgba(147,197,253,0.4)",
            borderRadius: "999px",
            marginTop: "40px",
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginTop: "100px",
          }}
        >
          {truncatedTitle}
        </div>

        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              textAlign: "center",
              marginTop: "24px",
            }}
          >
            {subtitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", fontSize: "30px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            The private community for TA leaders.
          </div>
          <div style={{ display: "flex", fontSize: "24px", fontWeight: 600, color: "rgba(147,197,253,0.8)" }}>
            talktalent.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}

// Richer variant for newsletter LinkedIn shares — the generic card above is
// just a floating title with a lot of dead navy space, which reads flat on
// a feed. This fills that space with real "this week in TALK" numbers
// instead, giving it something concrete to stop a scroll on.
export async function generateNewsletterCardPng({
  title,
  subtitle,
  stats,
}: {
  title: string;
  subtitle?: string | null;
  stats: { newMembers: number; forumPosts: number; eventRsvps: number; newJobs: number };
}): Promise<Buffer> {
  const truncatedTitle = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  const fonts = await loadFonts();
  const hasStats = stats.newMembers + stats.forumPosts + stats.eventRsvps + stats.newJobs > 0;
  const tiles = [
    { n: stats.newMembers, label: "NEW MEMBERS" },
    { n: stats.forumPosts, label: "FORUM POSTS" },
    { n: stats.eventRsvps, label: "EVENT RSVPS" },
    { n: stats.newJobs, label: "NEW JOBS" },
  ];

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: `linear-gradient(160deg, ${NAVY_A} 0%, ${NAVY_B} 55%, ${NAVY_C} 100%)`,
          padding: "100px 90px 70px",
          fontFamily: "Poppins",
        }}
      >
        <div style={{ display: "flex", fontSize: "64px", fontWeight: 900, letterSpacing: "-2px" }}>
          <span style={{ color: RED }}>TA</span>
          <span style={{ color: "#ffffff" }}>LK</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "22px",
            fontWeight: 600,
            color: "#93C5FD",
            textTransform: "uppercase",
            letterSpacing: "3px",
            padding: "9px 26px",
            border: "2px solid rgba(147,197,253,0.4)",
            borderRadius: "999px",
            marginTop: "32px",
          }}
        >
          TALK Newsletter
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "54px",
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginTop: "50px",
          }}
        >
          {truncatedTitle}
        </div>

        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              marginTop: "18px",
            }}
          >
            {subtitle}
          </div>
        )}

        {hasStats && (
          <div style={{ display: "flex", flexDirection: "row", gap: "20px", width: "100%", marginTop: "70px" }}>
            {tiles.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "20px",
                  padding: "32px 12px",
                }}
              >
                <div style={{ display: "flex", fontSize: "58px", fontWeight: 900, color: RED }}>{t.n}</div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.55)",
                    letterSpacing: "1px",
                    marginTop: "10px",
                    textAlign: "center",
                  }}
                >
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", fontSize: "28px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            The private community for TA leaders.
          </div>
          <div style={{ display: "flex", fontSize: "22px", fontWeight: 600, color: "rgba(147,197,253,0.8)" }}>
            talktalent.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}
