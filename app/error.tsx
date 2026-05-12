"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)" }}>

      <div className="size-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(239,68,68,0.15)" }}>
        <AlertTriangle className="size-8 text-red-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-white/50 text-base max-w-sm mb-8 leading-relaxed">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl font-bold text-[#0d0d0d] hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-semibold text-white/70 border border-white/20 hover:border-white/40 hover:text-white transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
