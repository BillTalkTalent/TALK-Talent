'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Lazy-import posthog so it doesn't block the initial render
let _ph: import('posthog-js').PostHog | null = null

async function getPostHog() {
  if (_ph) return _ph
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  const { default: posthog } = await import('posthog-js')
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
  })
  _ph = posthog
  return posthog
}

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    getPostHog().then(ph => {
      if (!ph) return
      const url = window.location.href
      ph.capture('$pageview', { $current_url: url })
    })
  }, [pathname, searchParams])

  return null
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getPostHog() // initialise on mount
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  )
}
