import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? ''
    if (message.includes('NEXT_REDIRECT')) return null
    // Expected validation failure (profiles_require_linkedin_for_approval) —
    // already caught and surfaced as a banner on /admin, not a real error.
    if (message.includes('no LinkedIn URL on file')) return null
    return event
  },
})
