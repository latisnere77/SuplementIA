/**
 * Sentry Server Configuration
 * Error tracking and performance monitoring for server-side/API routes
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Your Sentry DSN (Data Source Name)
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment (dev, staging, production)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% in dev/staging, adjust for production

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Filter out noise
  ignoreErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],

  // Before sending events
  beforeSend(event, hint) {
    // Don't send in development (unless you want to test)
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Server Event (dev mode, not sent):', event)
      return null
    }

    // Log server errors
    if (event.exception) {
      console.error('Sentry server error:', hint.originalException || hint.syntheticException)
    }

    return event
  },

  // Server-specific: Don't capture console.log as breadcrumbs
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'], // Only capture errors and warnings
    }),
  ],
})

