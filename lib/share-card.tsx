import { ImageResponse } from "next/og";

const NAVY_A = "#0F1F35";
const NAVY_B = "#162D4A";
const NAVY_C = "#1A3A5C";
const RED = "#E8503A";

export async function generateShareCardPng({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
}): Promise<Buffer> {
  const truncatedTitle = title.length > 90 ? `${title.slice(0, 87)}…` : title;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(160deg, ${NAVY_A} 0%, ${NAVY_B} 55%, ${NAVY_C} 100%)`,
          padding: "90px 100px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "22px" }}>
          <div style={{ display: "flex", fontSize: "56px", fontWeight: 900, letterSpacing: "-2px" }}>
            <span style={{ color: RED }}>TA</span>
            <span style={{ color: "#ffffff" }}>LK</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 700,
              color: "#93C5FD",
              textTransform: "uppercase",
              letterSpacing: "3px",
              padding: "10px 30px",
              border: "2px solid rgba(147,197,253,0.4)",
              borderRadius: "999px",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "26px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "70px",
              fontWeight: 900,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {truncatedTitle}
          </div>
          {subtitle && (
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            The private community for TA leaders.
          </div>
          <div style={{ display: "flex", fontSize: "26px", fontWeight: 500, color: "rgba(147,197,253,0.85)" }}>
            talktalent.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200 }
  );

  return Buffer.from(await image.arrayBuffer());
}
