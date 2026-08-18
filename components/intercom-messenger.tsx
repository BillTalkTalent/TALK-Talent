'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Intercom, { update } from '@intercom/messenger-js-sdk'

// Mounted once inside the authenticated app layout (app/(app)/layout.tsx) —
// public/logged-out pages never see this, matching the "members only"
// audience the widget was scoped to. No-ops entirely when
// NEXT_PUBLIC_INTERCOM_APP_ID isn't set, so it's safe in previews/dev where
// that env var isn't configured.
export default function IntercomMessenger({
  userId,
  email,
  name,
  createdAt,
}: {
  userId: string
  email: string
  name: string | null
  createdAt: string
}) {
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  // Boot once per mount — the signed-in member's identity doesn't change
  // mid-session, so this only needs to run when the layout first mounts.
  useEffect(() => {
    if (!appId) return
    Intercom({
      app_id: appId,
      user_id: userId,
      email,
      name: name ?? undefined,
      created_at: Math.floor(new Date(createdAt).getTime() / 1000),
    })
    lastPath.current = pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Client-side route changes don't trigger a full page load, so nudge
  // Intercom on navigation to log the page view and check for new messages.
  useEffect(() => {
    if (!appId || lastPath.current === pathname) return
    lastPath.current = pathname
    update({})
  }, [appId, pathname])

  return null
}
