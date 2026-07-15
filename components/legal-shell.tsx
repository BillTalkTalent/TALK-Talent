import Link from "next/link";
import type { ReactNode } from "react";

// Shared wrapper for public legal pages (privacy, terms). Server component.
export default function LegalShell({
  title,
  effective,
  children,
}: {
  title?: string;
  effective?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ background: "#F5F8FC", minHeight: "100vh" }}>
      <header
        className="px-6 py-4"
        style={{ background: "linear-gradient(90deg, #0F1F35 0%, #162D4A 100%)" }}
      >
        <Link href="/" aria-label="TALK home">
          <span
            style={{
              fontFamily: "var(--font-poppins), system-ui",
              fontWeight: 900,
              fontSize: "1.6rem",
              letterSpacing: "-0.03em",
              display: "inline-flex",
              alignItems: "baseline",
            }}
          >
            <span style={{ color: "#E8503A" }}>TA</span>
            <span style={{ color: "#ffffff" }}>LK</span>
          </span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-7 md:p-12">
          {title && <h1 className="text-3xl font-bold text-[#0F1F35]">{title}</h1>}
          {effective && <p className="text-sm text-zinc-500 mt-2">Last updated: {effective}</p>}
          <div className={title ? "mt-8 space-y-2" : ""}>{children}</div>
        </div>
        <p className="text-center text-xs text-zinc-400 mt-8">
          <Link href="/privacy" className="hover:text-zinc-600">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-zinc-600">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="hover:text-zinc-600">Home</Link>
        </p>
      </main>
    </div>
  );
}

// Small section + paragraph helpers so the pages read cleanly.
export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-[#0F1F35] mt-8 mb-2">{children}</h2>;
}
export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-600 leading-relaxed">{children}</p>;
}
export function LI({ children }: { children: ReactNode }) {
  return <li className="text-sm text-zinc-600 leading-relaxed">{children}</li>;
}
