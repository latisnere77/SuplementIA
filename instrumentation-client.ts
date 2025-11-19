/**
 * Client-side Instrumentation
 * Sentry initialization for browser/client-side code with ENHANCED DEBUGGING
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 *
 * ⚠️ IMPORTANT FOR PRODUCTION:
 * Current configuration is OPTIMIZED FOR DEBUGGING with:
 * - 100% Session Replay sampling
 * - All console.log captured
 * - Text/images NOT masked
 * - Full network request/response capture
 *
 * Before going to production, adjust:
 * 1. replaysSessionSampleRate: 0.1 (10% instead of 100%)
 * 2. maskAllText: true (mask sensitive text)
 * 3. console levels: ['warn', 'error'] only
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Your Sentry DSN (Data Source Name)
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment (dev, staging, production)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% in dev/staging, lower in production

  // Session Replay - ENHANCED FOR DEBUGGING
  // 🎥 100% sampling para debugging completo (ajustar a 0.1-0.2 en prod)
  replaysSessionSampleRate: 1.0, // 100% of sessions for debugging
  replaysOnErrorSampleRate: 1.0, // 100% when errors occur

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Integrations - ENHANCED FOR DEBUGGING
  integrations: [
    // 🎥 Session Replay with minimal masking for debugging
    Sentry.replayIntegration({
      maskAllText: false, // ⚠️ DEBUGGING: Show text (disable in prod with sensitive data)
      blockAllMedia: false, // ⚠️ DEBUGGING: Show images
      maskAllInputs: true, // Keep passwords/sensitive inputs masked
      // Capture console logs for debugging
      networkDetailAllowUrls: [typeof window !== 'undefined' ? window.location.origin : ''],
      networkCaptureBodies: true,
      networkRequestHeaders: ['content-type'],
      networkResponseHeaders: ['content-type'],
    }),
    // 📝 Capture console logs as breadcrumbs
    Sentry.breadcrumbsIntegration({
      console: true, // Capture console.log, console.warn, console.error
      dom: true, // Capture DOM events (clicks, inputs)
      fetch: true, // Capture fetch requests
      history: true, // Capture navigation
      sentry: true, // Capture Sentry events
      xhr: true, // Capture XMLHttpRequest
    }),
    // 🔍 Enhanced console integration
    Sentry.captureConsoleIntegration({
      levels: ['log', 'info', 'warn', 'error', 'debug'], // Capture ALL console levels
    }),
  ],

  // Filter out noise
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors
    'NetworkError',
    'Non-Error promise rejection captured',
  ],

  // Before sending events
  beforeSend(event, hint) {
    // Don't send in development (unless you want to test)
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event (dev mode, not sent):', event)
      return null
    }

    // Add custom context
    if (event.exception) {
      console.error('Sentry captured error:', hint.originalException || hint.syntheticException)
    }

    return event
  },
})

// Export router transition hook for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

