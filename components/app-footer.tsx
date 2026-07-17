'use client'

import { usePathname } from 'next/navigation'

// Full-height pages (DMs and channel chat) own the whole area below the nav and
// manage their own internal scroll. A footer inside the scrollable <main> makes
// it double-scroll, which clips the top of the chat panel — so hide it there.
export default function AppFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith('/messages') || pathname?.startsWith('/chat')) return null

  return (
    <footer className="border-t border-zinc-100 py-4 px-6 mt-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <span className="text-xs text-zinc-400">© {new Date().getFullYear()} TALK Community</span>
        <div className="flex items-center gap-5 text-xs text-zinc-400">
          <a href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-zinc-600 transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  )
}
