import { ArrowRight } from 'lucide-react'

// Talent Engineer Workshop promo bar, shown above the public homepage nav.
// Set SHOW_WORKSHOP_BANNER to false (or delete the <WorkshopBanner /> line in
// app/page.tsx) once Cohort 1 fills or applications close.
export const SHOW_WORKSHOP_BANNER = true

// Plain <a>, not next/link: /teengineer is a vercel.json redirect to the
// HubSpot landing page, so it needs a full page navigation.
const WORKSHOP_URL = '/teengineer'

export default function WorkshopBanner() {
  if (!SHOW_WORKSHOP_BANNER) return null

  return (
    <a
      href={WORKSHOP_URL}
      className="group block border-b border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
    >
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-center gap-2 text-center text-xs sm:text-sm text-white/80">
        <span
          className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: '#E8503A' }}
        >
          New
        </span>
        <span>
          <strong className="font-semibold text-white">Talent Engineer Workshop, Cohort 1</strong>
          <span className="hidden sm:inline"> · 4 weeks, 20 seats</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-white group-hover:underline">
          See the workshop
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </a>
  )
}
