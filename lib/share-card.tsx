import { ImageResponse } from "next/og";

// Hand-copied path data from lucide-react (users/message-square/
// calendar-days/briefcase/arrow-right, ISC licensed) rendered as plain SVG.
// Can't use the lucide-react components directly here — they call
// useContext internally, and satori/next-og walks the element tree outside
// a real React render, so any component using hooks crashes.
type IconShape =
  | { tag: "path"; d: string }
  | { tag: "rect"; x: string; y: string; width: string; height: string; rx?: string }
  | { tag: "circle"; cx: string; cy: string; r: string };

const ICON_PATHS: Record<string, IconShape[]> = {
  users: [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "path", d: "M16 3.128a4 4 0 0 1 0 7.744" },
    { tag: "path", d: "M22 21v-2a4 4 0 0 0-3-3.87" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
  ],
  messageSquare: [
    {
      tag: "path",
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
    },
  ],
  calendarDays: [
    { tag: "path", d: "M8 2v4" },
    { tag: "path", d: "M16 2v4" },
    { tag: "rect", x: "3", y: "4", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "M3 10h18" },
    { tag: "path", d: "M8 14h.01" },
    { tag: "path", d: "M12 14h.01" },
    { tag: "path", d: "M16 14h.01" },
    { tag: "path", d: "M8 18h.01" },
    { tag: "path", d: "M12 18h.01" },
    { tag: "path", d: "M16 18h.01" },
  ],
  briefcase: [
    { tag: "path", d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" },
    { tag: "rect", x: "2", y: "6", width: "20", height: "14", rx: "2" },
  ],
  arrowRight: [
    { tag: "path", d: "M5 12h14" },
    { tag: "path", d: "m12 5 7 7-7 7" },
  ],
};

function renderIcon(name: keyof typeof ICON_PATHS, size: number, color: string) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={name === "arrowRight" ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "flex" }}
    >
      {ICON_PATHS[name].map((shape, i) => {
        if (shape.tag === "path") return <path key={i} d={shape.d} />;
        if (shape.tag === "rect") return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
        return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />;
      })}
    </svg>
  );
}

const NAVY_A = "#0F1F35";
const NAVY_B = "#162D4A";
const NAVY_C = "#1A3A5C";
const RED = "#E8503A";

const FONT_BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins";

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 600 | 900; style: "normal" }[]> | null = null;

// Satori (the renderer behind next/og) has no access to system or web
// fonts, so without this every card falls back to a generic thin
// sans-serif instead of the site's actual Poppins branding. Fetched once
// per server instance and reused across requests. Never throws — a
// transient fetch failure shouldn't take down card generation entirely,
// it should just render with satori's default fallback font instead.
async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(`${FONT_BASE}/Poppins-Black.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${FONT_BASE}/Poppins-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    ]).then(([black, semibold]) => [
      { name: "Poppins", data: black, weight: 900 as const, style: "normal" as const },
      { name: "Poppins", data: semibold, weight: 600 as const, style: "normal" as const },
    ]);
    // Don't cache a rejected promise — let the next call retry the fetch.
    fontsPromise.catch(() => {
      fontsPromise = null;
    });
  }
  try {
    return await fontsPromise;
  } catch {
    return [];
  }
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

// Richer variant for newsletter LinkedIn shares — v1 was just a floating
// title in dead navy space; the stats fix filled the space but the plain
// bordered boxes still read flat/corporate. This version adds the same
// glow-orb atmosphere already used on the marketing homepage hero, and
// treats each stat as a colorful icon badge rather than a spreadsheet row.
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
    { n: stats.newMembers, label: "NEW MEMBERS", icon: "users" as const, color: "#8B5CF6" },
    { n: stats.forumPosts, label: "FORUM POSTS", icon: "messageSquare" as const, color: "#14B8A6" },
    { n: stats.eventRsvps, label: "EVENT RSVPS", icon: "calendarDays" as const, color: "#3B82F6" },
    { n: stats.newJobs, label: "NEW JOBS", icon: "briefcase" as const, color: "#F59E0B" },
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
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(160deg, ${NAVY_A} 0%, ${NAVY_B} 55%, ${NAVY_C} 100%)`,
          padding: "90px 90px 64px",
          fontFamily: "Poppins",
        }}
      >
        {/* Ambient glow orbs — same brand treatment as the homepage hero */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-220px",
            right: "-180px",
            width: "720px",
            height: "720px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${RED}59 0%, ${RED}00 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "-260px",
            left: "-200px",
            width: "760px",
            height: "760px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #2563EB4D 0%, #2563EB00 70%)",
          }}
        />

        <div style={{ display: "flex", fontSize: "62px", fontWeight: 900, letterSpacing: "-2px" }}>
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
            marginTop: "30px",
          }}
        >
          TALK Newsletter
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "52px",
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginTop: "46px",
          }}
        >
          {truncatedTitle}
        </div>

        <div
          style={{
            display: "flex",
            width: "110px",
            height: "6px",
            borderRadius: "999px",
            marginTop: "26px",
            background: `linear-gradient(90deg, ${RED}, #F07058)`,
          }}
        />

        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: "27px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              marginTop: "22px",
            }}
          >
            {subtitle}
          </div>
        )}

        {hasStats && (
          <div style={{ display: "flex", flexDirection: "row", gap: "22px", width: "100%", marginTop: "64px" }}>
            {tiles.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  background: `${t.color}1F`,
                  border: `1.5px solid ${t.color}59`,
                  borderRadius: "24px",
                  padding: "28px 10px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: `${t.color}33`,
                    marginBottom: "14px",
                  }}
                >
                  {renderIcon(t.icon, 30, t.color)}
                </div>
                <div style={{ display: "flex", fontSize: "50px", fontWeight: 900, color: "#ffffff" }}>{t.n}</div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: t.color,
                    letterSpacing: "1px",
                    marginTop: "8px",
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
            alignItems: "center",
            gap: "14px",
            marginTop: hasStats ? "56px" : "80px",
            padding: "22px 44px",
            borderRadius: "999px",
            background: `linear-gradient(90deg, ${RED}, #F07058)`,
            boxShadow: `0 20px 50px ${RED}40`,
          }}
        >
          <div style={{ display: "flex", fontSize: "28px", fontWeight: 800, color: "#ffffff" }}>
            Read the full newsletter
          </div>
          {renderIcon("arrowRight", 26, "#ffffff")}
        </div>

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
