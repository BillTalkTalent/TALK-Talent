import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Capture 10% of transactions for performance monitoring (adjust as needed)
    tracesSampleRate: 0.1,

    // Replay 1% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
    ],

    // Don't send errors from browser extensions or local dev noise
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop')) return null
      return event
    },
  })
}
