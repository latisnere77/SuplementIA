---
phase: 05-pubmed-fallback-pipeline
plan: 02
subsystem: api
tags: [pubmed, bedrock, abbreviation-expander, quiz-route, fallback-pipeline]

# Dependency graph
requires:
  - phase: 05-pubmed-fallback-pipeline plan 01
    provides: searchPubMedForSupplement export with slim→rich type bridge
provides:
  - Unknown-supplement condition branch wired to translate→search→analyze pipeline
  - Zero-results guard returning HTTP 200 + noData:true
  - PubMed API error guard returning HTTP 200 + retryable:true
affects:
  - 05-03 (condition branch test update)
  - quiz/route.ts consumers expecting evidence panel shape

# Tech tracking
tech-stack:
  added: []
  patterns: [expand-translate-search-analyze pipeline, noData sentinel pattern, retryable error 200 response]

key-files:
  created: []
  modified:
    - app/api/portal/quiz/route.ts
    - app/api/portal/quiz/route.test.ts

key-decisions:
  - "expansion.alternatives[0] used instead of expansion.expanded (field does not exist on AbbreviationExpansion)"
  - "PubMed errors caught in condition branch return HTTP 200 + retryable:true (not 500) to prevent frontend error states"
  - "searchPubMed import removed from route.ts — only used in the replaced branch"
  - "Condition test + 500 test both test old branch behavior — both intentionally failing, to be updated in Plan 03"

patterns-established:
  - "noData sentinel: HTTP 200 + { success: true, noData: true, message } when search returns empty"
  - "Retryable error: HTTP 200 + { success: false, retryable: true } for transient API failures"

requirements-completed: [PUB-02, PUB-03, PUB-04]

# Metrics
duration: 18min
completed: 2026-03-06
---

# Phase 5 Plan 02: Route Condition Branch Wiring Summary

**Unknown-supplement branch in quiz/route.ts replaced with expand→search→analyze pipeline returning evidence panel shape the frontend already renders**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-06T~02:40Z
- **Completed:** 2026-03-06T~02:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced 3-line broken `searchPubMed(sanitizedCategory)` call with full translate→search→analyze pipeline
- Added zero-results guard: HTTP 200 + `{ success: true, noData: true, message: 'no encontramos datos...' }`
- Added PubMed API error catch: HTTP 200 + `{ success: false, retryable: true }` preventing 500s
- Fixed test suite crash caused by `SUPPLEMENTS_DATABASE` mock missing `id` field required by `lexicon-generator.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace broken condition branch in quiz/route.ts** - `754c611` (feat)
2. **Task 2: Smoke test — existing quiz route tests still pass** - `a155c5f` (fix)

## Files Created/Modified
- `app/api/portal/quiz/route.ts` - Condition branch replaced with pipeline; searchPubMed import removed
- `app/api/portal/quiz/route.test.ts` - Mock fixes for new branch dependencies; 2 tests intentionally failing

## Decisions Made
- Used `expansion.alternatives[0] || sanitizedCategory` as the PubMed search name — `alternatives[0]` is always populated per the AbbreviationExpansion contract
- Removed `searchPubMed` import (was only used in the replaced branch) to avoid unused import TypeScript warnings
- PubMed API errors wrapped in try/catch returning HTTP 200 (not 500) to avoid frontend error state for transient failures

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test suite crash: SUPPLEMENTS_DATABASE mock missing id field**
- **Found during:** Task 2 (smoke test)
- **Issue:** Adding `searchPubMedForSupplement` import caused `pubmed-search.ts` → `lexicon-generator.ts` to execute at module init. `lexicon-generator.ts` calls `entry.id.replace(...)` but mock entry had no `id` field, crashing the entire suite before any test ran
- **Fix:** Added `id: 'magnesium-es'` and `language: 'es'` to the `SUPPLEMENTS_DATABASE` mock entry
- **Files modified:** `app/api/portal/quiz/route.test.ts`
- **Verification:** Suite now runs (3 tests execute instead of 0)
- **Committed in:** `a155c5f`

**2. [Rule 1 - Bug] Added mocks for new branch dependencies in test file**
- **Found during:** Task 2 (smoke test)
- **Issue:** Auto-mocked `searchPubMedForSupplement` returns `undefined` by default; `articles.length` throws TypeError
- **Fix:** Added `beforeEach` default `mockResolvedValue([])` for `searchPubMedForSupplement`; added factory mocks for `expandAbbreviation` and `analyzeStudiesWithBedrock`
- **Files modified:** `app/api/portal/quiz/route.test.ts`
- **Verification:** No more TypeError; 400 test passes cleanly
- **Committed in:** `a155c5f`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs exposed by adding new import)
**Impact on plan:** Both fixes necessary for tests to run at all. No scope creep.

## Issues Encountered

**Intentionally failing tests (expected per plan):**
- `should call searchPubMed and return 200 OK for a "condition" query` — tests old `searchPubMed` call, to be replaced in Plan 03
- `should return a 500 Internal Server Error if the searchPubMed service fails` — sends "any condition" which now hits condition branch; new branch catches errors as HTTP 200 (not 500); this test also tests old branch behavior and will be updated in Plan 03

**Passing tests:**
- `should return a 400 Bad Request if the category field is missing` — PASSES (non-condition-branch path, unaffected)

## Next Phase Readiness
- Plan 03 should update both failing tests: the "condition" test to use new mock shape, and the "500" test to test a different error path or update input to avoid the condition branch
- The condition branch pipeline is complete and TypeScript-clean; Plan 03 can focus purely on test alignment

---
*Phase: 05-pubmed-fallback-pipeline*
*Completed: 2026-03-06*
