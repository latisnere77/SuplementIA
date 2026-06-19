# TASK_SPEC - Dev Debug Route Guard

Generated: 2026-06-19

## Task

T19 - Dev/debug route guard: prevent accidental production exposure.

## Objective

Prevent debug pages and test endpoints from being available in production unless explicitly
enabled by a local debug-route flag.

## IN SCOPE

- `app/[locale]/portal/debug-enrich/page.tsx`
- `app/[locale]/portal/stream-test/page.tsx`
- `app/api/test-lancedb/route.ts`
- `app/api/test-lambda-direct/route.ts`
- `app/api/portal/test-config/route.ts`
- New focused route tests where practical
- `.planning/debug-route-guard/TASK_SPEC.md`
- `.planning/debug-route-guard/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- Deleting routes.
- Running or invoking LanceDB, Lambda, AWS, or external APIs.
- Bedrock, `production-content-enricher`, deploy, migrations, auth redesign, dependencies.
- Shared guard abstraction.

## Implementation Plan

1. Add local production guards to test/debug API routes before any dynamic import, fetch, or
   backend call.
2. Add local client-side availability guards to debug pages using `NEXT_PUBLIC_ENABLE_DEBUG_ROUTES`.
3. Add focused tests for API route production blocking.
4. Keep non-production behavior unchanged.

## Validation

```bash
npm run lint
npm run type-check
npm test -- app/api/test-lancedb/route.test.ts app/api/test-lambda-direct/route.test.ts app/api/portal/test-config/route.test.ts
npm run test:e2e -- e2e/portal.spec.ts
```

Expected: every command exits 0.

## Risks

- API tests must assert the guard returns before remote calls.
- Client pages cannot emit a true HTTP 404 without converting the page structure; for this task,
  production unavailability is implemented by rendering nothing unless explicitly enabled.
