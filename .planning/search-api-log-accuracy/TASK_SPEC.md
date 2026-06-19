# TASK_SPEC - Search API Log Accuracy

Generated: 2026-06-19

## Task

T17 - Search API log accuracy: stop labeling every backend as Lambda.

## Objective

Correct the misleading search API log that claims every request searches "via Lambda", even
though `lib/search-service.ts` chooses local catalog, LanceDB, or Lambda based on environment.

## IN SCOPE

- `app/api/portal/search/route.ts`
- `app/api/portal/search/route.test.ts`
- `.planning/search-api-log-accuracy/TASK_SPEC.md`
- `.planning/search-api-log-accuracy/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- Search backend selection logic.
- `lib/search-service.ts`.
- LanceDB, Bedrock, Lambda invoke/update, AWS reads/writes.
- Environment variable changes.
- Portal render or e2e.
- Dependency updates.

## Implementation Plan

1. Change the log text in `GET` so it references the configured search backend instead of Lambda.
2. Replace the superficial route test with a direct handler test that mocks `searchSupplements`.
3. Assert the log no longer contains `via Lambda`.
4. Keep invalid-query behavior covered.

## Validation

```bash
npm run lint
npm run type-check
npm test -- app/api/portal/search/route.test.ts
```

Expected: every command exits 0.

## Risks

- Importing the route in tests must not initialize remote search clients. Mock `@/lib/search-service`
  before executing the handler.
