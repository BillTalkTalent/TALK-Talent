'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { logPageView } from '@/lib/log-page-view'

// Mounted once inside the authenticated app layout. Logs a route
// navigation every time the path changes — powers the "most visited
// sections" / "where members are going" view in /admin/activity.
export default function PageViewTracker() {
  const pathname = usePathname()
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || lastLogged.current === pathname) return
    lastLogged.current = pathname
    logPageView(pathname).catch(() => {})
  }, [pathname])

  return null
}
