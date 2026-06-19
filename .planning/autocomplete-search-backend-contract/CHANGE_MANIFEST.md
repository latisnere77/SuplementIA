# CHANGE_MANIFEST - Autocomplete Search Backend Contract

Generated: 2026-06-19

## Summary

Aligned autocomplete backend selection with the main search isolation contract:
`SEARCH_BACKEND=local` now forces local autocomplete even when `USE_LANCEDB=true`.

## Files Changed

- `lib/portal/autocomplete-suggestions-fuzzy.ts`
  - Replaced module-load LanceDB flag with runtime `shouldUseLanceDBAutocomplete()`.
  - Disabled LanceDB autocomplete when `SEARCH_BACKEND=local`.
- `lib/portal/autocomplete-suggestions-fuzzy.test.ts`
  - Added tests for local backend override and allowed LanceDB path with mocked LanceDB.
- `docs/search-backend-contracts.md`
  - Documented `SEARCH_BACKEND=local` behavior for autocomplete.
  - Removed stale open follow-up for the search API Lambda log.
- `.planning/autocomplete-search-backend-contract/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/autocomplete-search-backend-contract/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T21 done after PR handoff.

## Validation

- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test -- lib/portal/autocomplete-suggestions-fuzzy.test.ts` -> exit 0; 1 suite passed, 2 tests passed.
- `npm test` -> exit 0; 115 passed suites, 2 skipped.

## Gates

- No LanceDB mutation.
- No Bedrock call.
- No AWS read/write.
- No merge to `main`.
- No deploy.
- No Lambda invoke/update, Terraform/EventBridge, feature flag, or `production-content-enricher` action.
