# Portal And API Logging Classification

Generated: 2026-06-17

## Scope

This is a classification document only. It does not remove logs, change runtime behavior, or approve production deploys.

## Structured Observability

Keep or migrate toward these patterns:

- `lib/portal/structured-logger.ts`
  - JSON log entries with `timestamp`, `level`, `event`, `jobId`, `supplementName`, `correlationId`, and `requestId`.
  - `logPortalSupplementOutcome()` already strips response body, body, and stack fields for supplement outcome logs.
- `lib/portal/api-logger.ts`
  - Portal API request/success/error breadcrumbs and Sentry capture.
  - Useful, but should be reviewed before broad production use because it can include full URLs, error stacks, and custom context.
- `lib/search-service.ts` and `lib/lancedb-service.ts`
  - `debugSearch()` is gated by `DEBUG_SEARCH === 'true'`.
  - This is the preferred shape for search debug logging.
- `app/api/portal/autocomplete/route.ts`
  - Uses request IDs and Sentry capture for errors.

## Operational Error And Warning Logs

These are generally useful if sanitized and not too noisy:

- API `console.error` for failed route handlers, subscription/webhook failures, monitoring routes, and status endpoints.
- `console.warn` for upstream unavailable, rate limiting, terminal async statuses, and local-development DynamoDB fallbacks.
- Job-store errors and warnings in `lib/portal/job-store.ts`, especially when DynamoDB is unavailable.

Guardrail: these logs should not include full request bodies, auth/payment details, raw tokens, or unsanitized user payloads.

## Debug Residual

High-priority cleanup candidates:

- `app/[locale]/portal/results/page.tsx`
  - Highest observed density with about 90 `console.*` call sites.
  - Includes render-branch, state-transition, cache-validation, URL, benefit, variant-cache, and async-polling debug traces.
  - Recommendation: gate behind a portal debug flag or remove after targeted e2e coverage confirms behavior.
- `app/[locale]/portal/PortalPageClient.tsx`
  - Search form submit, query validation, and navigation debug logs.
  - Recommendation: remove or gate behind `NEXT_PUBLIC_DEBUG_PORTAL`.
- `app/api/portal/quiz/route.ts`
  - Many debug traces around enrichment, Lambda payloads, search, merge, studies fetcher, and deployment markers.
  - Recommendation: replace broad `console.log` with structured events only for request outcome, upstream fallback, rate limit, and errors.
- `app/api/portal/enrich/route.ts` and `app/api/portal/enrich-async/route.ts`
  - Many enrichment status and cache-path traces.
  - Recommendation: keep job outcome/error logs, gate step-by-step traces.
- Test/debug routes:
  - `app/[locale]/portal/stream-test/page.tsx`
  - `app/[locale]/portal/debug-enrich/page.tsx`
  - `app/api/test-lancedb/route.ts`
  - `app/api/portal/test-config/route.ts`
  - Recommendation: keep only if routes are intentionally available in non-production, or gate/retire separately.

## Test-Only Logging

Several tests override `console.log`, `console.warn`, or `console.error` to reduce output. Leave those alone unless the associated runtime logs are changed in the same scoped task.

## Cleanup Priority

1. Gate or remove consumer-facing client logs in `results/page.tsx` and `PortalPageClient.tsx`.
2. Replace noisy API debug logs in `quiz/route.ts`, `enrich/route.ts`, and `enrich-async/route.ts` with structured events.
3. Review `api-logger.ts` context fields for URL, stack, and payload exposure before expanding usage.
4. Decide whether test/debug routes should be dev-only.

## Non-Goals

- No runtime logging changes were made.
- No new logger abstraction was introduced.
- No production log retention or vendor policy was changed.
