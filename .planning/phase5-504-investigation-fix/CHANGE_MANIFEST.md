# CHANGE_MANIFEST — phase5-504-investigation-fix

Date: 2026-06-29

## Summary

Prepared a scoped hardening fix for the Phase 5 public smoke 504 pattern. Current
production smoke now passes on all three public bases, which points to transient upstream
latency rather than a deterministic broken route. The code still lacked local timeout
guards around the slowest remote ranking/search paths, so this PR adds bounded timeouts
and preserves controlled fallback behavior.

## Files Changed

- `app/api/portal/quiz/route.ts`
  - Adds explicit timeout handling for the synchronous studies-fetcher Lambda call.
  - Adds a bounded timeout for async enrichment invocation so the API response does not
    block on a fire-and-forget path.
  - Logs timeout-specific structured warnings and continues into existing controlled
    fallback behavior.
- `app/api/portal/quiz/route.test.ts`
  - Adds coverage that a studies ranking timeout returns `200 processing` instead of
    blocking toward a platform 504.
- `lib/search-service.ts`
  - Adds an explicit timeout to the Lambda Function URL search fallback.
- `lib/search-service.test.ts`
  - Asserts the Lambda search fallback carries an `AbortSignal`.
- `.planning/phase5-504-investigation-fix/**`
  - Adds spec, change manifest, and audit evidence.
- `ROADMAP.md`
  - Keeps Phase 5 gated and records the scoped fix evidence path.

## Root-Cause Assessment

- The original 504s were not reproducible during this task. Public smoke now passes:
  - `https://suplementai.com`: `failures=0`
  - `https://www.suplementai.com`: `failures=0`
  - `https://main.d2yn3faih4ykom.amplifyapp.com`: `failures=0`
- The code path remained vulnerable because `/api/portal/quiz` could wait on remote
  ranking/search work before returning a controlled `processing`, `completed`, or
  `insufficient_data` state.
- The fix is defensive: remote ranking/search latency now has local bounds, and existing
  clinical fallback semantics remain unchanged.

## Validation

- `npm test -- --runInBand --runTestsByPath app/api/portal/quiz/route.test.ts lib/search-service.test.ts` — PASS, 64 tests.
- `npm run gsd:invariants` — PASS.
- `npm run gsd:offline-certify -- --quick` — PASS.
- `npm run validate` — PASS:
  - type-check PASS
  - build PASS
  - Jest PASS, 115 passed / 117 total suites, 851 passed / 866 total tests, skips unchanged.
- `npm run test:e2e -- e2e/portal.spec.ts --workers=1` — PASS, 46/46.
- `npm run smoke:production:portal` — PASS, `https://suplementai.com`, `failures=0`.
- `PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal` — PASS, `failures=0`.
- `PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal` — PASS, `failures=0`.

## Gates

- No deploy.
- No `.deploy-go`.
- No AWS reads or writes.
- No Lambda invoke/update outside mocked unit tests and existing production app public HTTP behavior.
- No Terraform/EventBridge.
- No feature flags.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher` edits.
- No checkout/live purchase.
- No real GitHub issues.

## Follow-Up

Phase 5 must remain `ESPERA_GATE` until a human-reviewed merge and a separate production
verification/deploy acceptance path confirm the hardened code in production.
