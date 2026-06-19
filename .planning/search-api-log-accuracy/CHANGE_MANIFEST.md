# CHANGE_MANIFEST - Search API Log Accuracy

Generated: 2026-06-19

## Summary

Corrected the portal search API log so it no longer labels every request as Lambda-backed.
Replaced the placeholder route test with a direct handler test that mocks `searchSupplements`.

## Files Changed

- `app/api/portal/search/route.ts`
  - Changed the log text to reference the configured search backend.
- `app/api/portal/search/route.test.ts`
  - Added direct `GET` handler coverage.
  - Mocked `@/lib/search-service` to avoid network/AWS/backend calls.
  - Asserted the log does not contain `via Lambda`.
  - Preserved invalid query coverage.
- `.planning/search-api-log-accuracy/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/search-api-log-accuracy/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T17 done after PR handoff.

## Validation

- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test -- app/api/portal/search/route.test.ts` -> exit 0; 1 suite passed, 2 tests passed.

## Gates

- No merge to `main`.
- No deploy.
- No AWS read/write.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flag change.
- No Bedrock, LanceDB mutation, or `production-content-enricher` action.
