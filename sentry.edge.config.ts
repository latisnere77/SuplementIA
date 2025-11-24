/**
 * Sentry Edge Configuration
 * Error tracking for Edge Runtime (middleware, edge functions)
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Your Sentry DSN (Data Source Name)
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment (dev, staging, production)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Before sending events
  beforeSend(event) {
    // Don't send in development
    if (process.env.NODE_ENV === 'development') {
      return null
    }

    return event
  },
})

