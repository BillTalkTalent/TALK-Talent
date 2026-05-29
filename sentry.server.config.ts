import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,

    // Don't surface expected auth redirects as errors
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes('NEXT_REDIRECT')) return null
      return event
    },
  })
}
