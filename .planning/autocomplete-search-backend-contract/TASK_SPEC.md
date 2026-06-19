# TASK_SPEC - Autocomplete Search Backend Contract

Generated: 2026-06-19

## Task

T21 - Autocomplete backend contract: align debug docs with SEARCH_BACKEND.

## Objective

Make autocomplete respect `SEARCH_BACKEND=local` so local/e2e isolation cannot reach LanceDB or
Bedrock through autocomplete even if `USE_LANCEDB=true`.

## IN SCOPE

- `lib/portal/autocomplete-suggestions-fuzzy.ts`
- New or existing autocomplete tests
- `docs/search-backend-contracts.md`
- `.planning/autocomplete-search-backend-contract/TASK_SPEC.md`
- `.planning/autocomplete-search-backend-contract/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- `lib/lancedb-service.ts`
- Bedrock, LanceDB mutation, Lambda, AWS reads/writes
- Portal render, production, `production-content-enricher`, dependencies
- Redesigning autocomplete ranking

## Implementation Plan

1. Replace module-load `USE_LANCEDB` decision with a runtime predicate that checks both
   `SEARCH_BACKEND` and `USE_LANCEDB`.
2. Treat `SEARCH_BACKEND=local` as local database only.
3. Add a test that sets `SEARCH_BACKEND=local` and `USE_LANCEDB=true`, then asserts
   `searchLanceDB` is not called.
4. Update `docs/search-backend-contracts.md`.

## Validation

```bash
npm run lint
npm run type-check
npm test -- lib/portal/autocomplete-suggestions-fuzzy.test.ts
npm test
```

Expected: every command exits 0.

## Risks

- Env-dependent behavior must be read at call time so tests and Playwright isolation can set env
  without stale module state.
