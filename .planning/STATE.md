# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Users can search for ANY supplement in Spanish and get reliable evidence without errors
**Current focus:** Phase 1 - Search Backend Fix

## Current Phase

**Phase:** 1 - Search Backend Fix
**Status:** Complete
**Current Plan:** 2 of 2 (done)
**Requirements:** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05

## Progress

| Phase | Status | Requirements | Progress |
|-------|--------|-------------|----------|
| 1     | Complete    | 5       | 100%     |
| 2     | Pending | 5           | 0%       |
| 3     | Pending | 4           | 0%       |
| 4     | Pending | 3           | 0%       |
| 5     | Pending | 2           | 0%       |

## Decisions

- Used @swc/jest for TypeScript test transform (jest 30 + Node 20 has no native TS support)
- Resolver uses in-memory Map built at module load (no async, no API calls)
- Error responses use Spanish messages for user-facing text, English error codes for programmatic use
- Work executed from ~/Developer/suplementAI due to iCloud eviction issues in ~/Documents
- Lexicon groups supplements by base ID (strip -es/-en) and merges names+aliases into terms Set
- Spanish name as display name for lexicon (primary market is LatAm)
- Auto-generate lexicon from database rather than hardcoding (prevents desync)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | 43min    | 2     | 8     |
| 01    | 02   | 4min     | 2     | 5     |

## Forensic Audit Context

Key findings that inform Phase 1:
- SUPPLEMENT_LEXICON: 10/158 (6.3% coverage) - `lib/services/pubmed-search.ts:62-73`
- 500 error source: `app/api/portal/recommend/route.ts:268-279` and `:459`
- Locale bug: `/es/` redirects to `/en/` on search (separate from 500)
- "// Add other conditions here" comment at `pubmed-search.ts:93` confirms MVP abandoned

## Last Session

- **Stopped at:** Completed 01-02-PLAN.md (Phase 1 complete)
- **Timestamp:** 2026-03-06T04:00:00Z

---
*State initialized: 2026-03-05*
*Last updated: 2026-03-06*
