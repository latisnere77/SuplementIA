# TASK_SPEC - Portal Results Log Hygiene

Generated: 2026-06-19

## Task

T18 - Portal log hygiene: gate results-page debug traces.

## Objective

Reduce console noise in the portal results page by gating trace-level `console.log` calls behind
a local debug flag while preserving operational `console.warn` and `console.error` behavior.

## IN SCOPE

- `app/[locale]/portal/results/page.tsx`
- Existing tests under `app/[locale]/portal/results/__tests__/**` only if log gating requires
  updates
- `.planning/portal-results-log-hygiene/TASK_SPEC.md`
- `.planning/portal-results-log-hygiene/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- `app/[locale]/portal/PortalPageClient.tsx`
- API routes
- UI behavior, copy, layout, recommendation logic, cache semantics, async polling semantics,
  variant selection semantics, or analytics payloads
- AWS/Lambda, Bedrock, LanceDB, `production-content-enricher`
- Dependency updates or shared logger abstraction

## Implementation Plan

1. Add a file-local `debugPortalResults()` helper gated by `NEXT_PUBLIC_DEBUG_PORTAL === 'true'`.
2. Replace trace-level `console.log` calls in `results/page.tsx` with `debugPortalResults`.
3. Keep `console.warn` and `console.error` in place for operational signals.
4. Verify no direct `console.log` remains outside the debug helper.

## Validation

Because this touches portal render, run:

```bash
npm run lint
npm run type-check
npm test
npm run test:e2e -- e2e/portal.spec.ts
```

Expected: every command exits 0.

## Risks

- Mechanical replacement must not alter function arguments or branch conditions.
- Playwright may still show existing `console.warn`/`console.error` output; that is out of scope
  unless it causes test failure.
