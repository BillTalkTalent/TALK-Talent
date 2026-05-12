import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)" }}>

      {/* Logo */}
      <Link href="/dashboard" className="mb-10">
        <span className="text-2xl font-black text-white tracking-tight">
          T<span className="relative inline-block">
            A
            <span className="absolute rounded-full" style={{ width: 5, height: 5, background: "linear-gradient(135deg,#9B5CFF,#6F2CFF)", bottom: 2, left: "50%", transform: "translateX(-50%)" }} />
          </span>LK
        </span>
      </Link>

      {/* 404 number */}
      <div className="text-8xl font-black text-white/10 leading-none mb-4 select-none">404</div>

      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-white/50 text-base max-w-sm mb-8 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-bold text-[#0d0d0d] hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
        >
          Go to Dashboard
        </Link>
        <Link
          href="/forum"
          className="px-6 py-3 rounded-xl font-semibold text-white/70 border border-white/20 hover:border-white/40 hover:text-white transition-all"
        >
          Browse Forum
        </Link>
      </div>
    </div>
  );
}
