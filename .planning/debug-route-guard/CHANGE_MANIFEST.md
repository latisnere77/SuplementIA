# CHANGE_MANIFEST - Dev Debug Route Guard

Generated: 2026-06-19

## Summary

Added production guards to debug/test pages and API routes so they are unavailable in production
unless explicitly enabled by debug-route flags.

## Files Changed

- `app/[locale]/portal/debug-enrich/page.tsx`
  - Renders nothing in production unless `NEXT_PUBLIC_ENABLE_DEBUG_ROUTES=true`.
- `app/[locale]/portal/stream-test/page.tsx`
  - Renders nothing in production unless `NEXT_PUBLIC_ENABLE_DEBUG_ROUTES=true`.
- `app/api/test-lancedb/route.ts`
  - Returns 404 in production unless `ENABLE_DEBUG_ROUTES=true` before importing LanceDB code.
- `app/api/test-lambda-direct/route.ts`
  - Returns 404 in production unless `ENABLE_DEBUG_ROUTES=true` before fetch.
- `app/api/portal/test-config/route.ts`
  - Returns 404 in production unless `ENABLE_DEBUG_ROUTES=true` before fetch.
- `app/api/test-lancedb/route.test.ts`
- `app/api/test-lambda-direct/route.test.ts`
- `app/api/portal/test-config/route.test.ts`
  - Added focused production guard coverage.
- `.planning/debug-route-guard/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/debug-route-guard/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T19 done after PR handoff.

## Validation

- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test -- app/api/test-lancedb/route.test.ts app/api/test-lambda-direct/route.test.ts app/api/portal/test-config/route.test.ts` -> exit 0; 3 suites passed, 3 tests passed.
- `npm run test:e2e -- e2e/portal.spec.ts` -> exit 0; 44 passed.

## Gates

- No merge to `main`.
- No deploy.
- No AWS read/write.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flag change.
- No Bedrock, LanceDB mutation, or `production-content-enricher` action.
