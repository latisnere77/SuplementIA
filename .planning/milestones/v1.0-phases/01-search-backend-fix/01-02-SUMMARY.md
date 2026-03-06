---
phase: 01-search-backend-fix
plan: 02
subsystem: api
tags: [pubmed, lexicon, supplements, search, testing]

requires:
  - phase: 01-search-backend-fix plan 01
    provides: Deduplicated SUPPLEMENTS_DATABASE (153 entries), resolve-supplement-name.ts
provides:
  - Auto-generated SUPPLEMENT_LEXICON from SUPPLEMENTS_DATABASE (90 entries, was 10 hardcoded)
  - Exhaustive coverage tests proving 100% supplement coverage
  - Integration tests for PubMed search pipeline with mocked API
affects: [quiz-route, pubmed-search, search-pipeline]

tech-stack:
  added: []
  patterns: [lexicon-generator-from-database, test-each-exhaustive-coverage]

key-files:
  created:
    - lib/services/lexicon-generator.ts
    - lib/services/lexicon-generator.test.ts
    - lib/services/__tests__/lexicon-coverage.test.ts
    - lib/services/__tests__/search-integration.test.ts
  modified:
    - lib/services/pubmed-search.ts

key-decisions:
  - "Lexicon groups supplements by base ID (strip -es/-en suffix) and merges all names+aliases into terms Set"
  - "Spanish name used as display name since primary market is LatAm"
  - "Base ID added as search term to ensure minimum 1 term per entry (handles edge case where name=alias=baseId)"
  - "Test relaxed from >=2 terms to >=1 per entry (resveratrol has identical name, alias, and base ID)"

patterns-established:
  - "Lexicon auto-generation: derive lookup tables from SUPPLEMENTS_DATABASE rather than hardcoding"
  - "Exhaustive test.each: iterate all database entries to prove 100% coverage"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03]

duration: 4min
completed: 2026-03-06
---

# Phase 1 Plan 2: Lexicon Expansion Summary

**Auto-generated SUPPLEMENT_LEXICON from SUPPLEMENTS_DATABASE with 90 entries (was 10 hardcoded), proven by 611 exhaustive tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T03:56:08Z
- **Completed:** 2026-03-06T04:00:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Expanded SUPPLEMENT_LEXICON from 10 hardcoded entries to 90 auto-generated entries covering all supplements in SUPPLEMENTS_DATABASE
- Created lexicon-generator.ts that groups ES/EN pairs by base ID, merging all names and aliases into case-insensitive terms Sets
- 611 tests prove 100% coverage: every supplement name and every alias is findable in the lexicon
- Integration tests verify searchPubMed works with representative supplements, unknown terms, and network failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate SUPPLEMENT_LEXICON and update pubmed-search** - `2e0c906` (feat)
2. **Task 2: Exhaustive coverage and integration tests** - `99073df` (test)

_TDD RED commit for Task 1:_ `6ea8421` (test: add failing tests for lexicon generator)

## Files Created/Modified
- `lib/services/lexicon-generator.ts` - Auto-generates lexicon from SUPPLEMENTS_DATABASE, exports generateLexicon() and GENERATED_LEXICON
- `lib/services/lexicon-generator.test.ts` - 7 unit tests for lexicon generator (entry count, terms, merging, lowercasing)
- `lib/services/__tests__/lexicon-coverage.test.ts` - 153 name checks + all alias checks + regression checks + integrity checks
- `lib/services/__tests__/search-integration.test.ts` - Integration tests with mocked PubMed API (10 supplements, unknown terms, network failures)
- `lib/services/pubmed-search.ts` - Replaced hardcoded 10-entry SUPPLEMENT_LEXICON with import from lexicon-generator

## Decisions Made
- Lexicon groups supplements by base ID (stripping -es/-en suffix) and merges all names+aliases into a single terms Set per supplement
- Spanish name used as display name since primary market is LatAm
- Added base ID as search term to handle edge case where name equals alias equals base ID (resveratrol)
- Relaxed "at least 2 terms" test to "at least 1 term" for edge cases (resveratrol has identical name/alias/base-id)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resveratrol single-term edge case**
- **Found during:** Task 1 (lexicon generator implementation)
- **Issue:** Resveratrol has name "Resveratrol", alias ["resveratrol"], base ID "resveratrol" - all collapse to 1 unique lowercase term
- **Fix:** Added base ID as a search term (helps other entries too), relaxed test from >=2 to >=1 with assertion that nearly all entries have >=2
- **Files modified:** lib/services/lexicon-generator.ts, lib/services/lexicon-generator.test.ts
- **Verification:** All 611 tests pass
- **Committed in:** 2e0c906 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/edge case)
**Impact on plan:** Minor test adjustment for data edge case. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SUPPLEMENT_LEXICON now has 100% coverage of SUPPLEMENTS_DATABASE
- Both search flows are now covered: recommend route (Plan 01 resolver) and quiz route (Plan 02 lexicon)
- Phase 1 complete - ready for Phase 2

---
*Phase: 01-search-backend-fix*
*Completed: 2026-03-06*
