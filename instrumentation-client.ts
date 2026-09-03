import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,  // undefined = Sentry no-ops gracefully
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  // Third-party noise that isn't ours to fix and isn't a real user-facing
  // problem: "Object Not Found Matching Id" is a well-known artifact of
  // browser extensions' internal messaging breaking; MetaMask errors are a
  // visitor's wallet extension trying to auto-connect; the circular-JSON
  // error traces to PostHog's autocapture trying to serialize a DOM node,
  // not anything our own code does.
  ignoreErrors: [
    'Object Not Found Matching Id',
    'Failed to connect to MetaMask',
    'Converting circular structure to JSON',
  ],
  beforeSend(event) {
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop')) return null
    return event
  },
})

// Required by @sentry/nextjs v10 to instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// We ship frequently, so a visitor with a page open across a deploy can hit a
// 404 fetching a JS chunk that no longer exists at that URL once the new
// deployment supersedes it (ChunkLoadError) — which then cascades into
// unrelated-looking failures (Supabase's auth-lock coordination aborting,
// plain "Failed to fetch") since the app is left in a half-loaded state.
// Recover with a single automatic reload instead of leaving the page broken.
if (typeof window !== 'undefined') {
  const isChunkLoadError = (value: unknown): boolean => {
    const message = typeof value === 'string' ? value : (value as { message?: string } | null)?.message ?? ''
    return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(message)
  }

  const reloadOnce = () => {
    if (sessionStorage.getItem('talk-chunk-reload')) return
    sessionStorage.setItem('talk-chunk-reload', '1')
    window.location.reload()
  }

  // Clear the guard once this load has settled, so a tab left open across a
  // *later* deploy can still recover the same way rather than being stuck
  // "already reloaded once" forever for the rest of the tab's lifetime.
  window.addEventListener('load', () => {
    setTimeout(() => sessionStorage.removeItem('talk-chunk-reload'), 10000)
  })

  window.addEventListener('error', (e) => {
    if (isChunkLoadError(e.error) || isChunkLoadError(e.message)) reloadOnce()
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkLoadError(e.reason)) reloadOnce()
  })
}
