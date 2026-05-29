import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.exception?.values?.[0]?.value?.includes('NEXT_REDIRECT')) return null
    return event
  },
})
