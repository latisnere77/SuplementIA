---
phase: 04-seo-analytics
plan: 03
subsystem: seo
tags: [sitemap, robots, next.js, google-search-console, metadata]

# Dependency graph
requires:
  - phase: 04-01
    provides: Wave 0 RED stubs for sitemap and gsc tests
provides:
  - Auto-generated sitemap at /sitemap.xml covering 90 unique slugs × 2 locales + 2 index = 182 URLs
  - robots.txt pointing crawlers to /sitemap.xml
  - GSC verification placeholder in layout metadata
affects: [04-04, future-seo]

# Tech tracking
tech-stack:
  added: []
  patterns: [next.js MetadataRoute.Sitemap from app/sitemap.ts, next.js MetadataRoute.Robots from app/robots.ts]

key-files:
  created:
    - app/sitemap.ts
    - app/robots.ts
    - app/__tests__/sitemap.test.ts
    - __mocks__/styleMock.js
  modified:
    - app/[locale]/layout.tsx
    - lib/__tests__/sitemap.test.ts
    - jest.config.js

key-decisions:
  - "Sitemap has 182 total URLs (not 308): all 153 DB entries have -es/-en suffix, yielding 90 unique slugs; 90×2+2=182"
  - "Test counts derived from SUPPLEMENTS_DATABASE at runtime to stay in sync with DB changes"
  - "jest.config.js updated to transform next-intl/use-intl/next ESM packages and mock CSS files"

patterns-established:
  - "sitemap.ts uses Set dedup on SUPPLEMENTS_DATABASE ids with /-(?:es|en)$/ strip"
  - "tests import SUPPLEMENTS_DATABASE directly to avoid hardcoded counts"

requirements-completed: [SEO-02, SEO-03]

# Metrics
duration: 18min
completed: 2026-03-06
---

# Phase 4 Plan 3: Sitemap, Robots, and GSC Verification Summary

**Next.js native sitemap (182 URLs from 90 unique supplement slugs) + robots.txt + GSC verification placeholder — site now crawlable by Google**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-06T20:00:00Z
- **Completed:** 2026-03-06T20:18:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Auto-generated sitemap at /sitemap.xml with 182 entries (90 slug × 2 locales + 2 index pages)
- robots.txt via app/robots.ts allowing all crawlers and pointing to sitemap
- GSC verification meta tag placeholder added to layout.tsx (ready for token swap)
- TDD: 5 new sitemap tests + fixed pre-existing 2 tests with wrong counts (GREEN: 11 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Sitemap failing tests** - `7b9790c` (test)
2. **Task 1 GREEN: sitemap.ts implementation + lib/__tests__/sitemap.test.ts fix** - `cae6415` (feat)
3. **Task 2: robots.ts + GSC verification + jest config fixes** - `278bcf2` (feat)

## Files Created/Modified
- `app/sitemap.ts` - Next.js native sitemap generator, 182 URLs from SUPPLEMENTS_DATABASE
- `app/robots.ts` - Robots handler, allows all crawlers, points to /sitemap.xml
- `app/[locale]/layout.tsx` - Added verification.google placeholder field to metadata
- `app/__tests__/sitemap.test.ts` - 5 new sitemap tests (data-driven from SUPPLEMENTS_DATABASE)
- `lib/__tests__/sitemap.test.ts` - Fixed hardcoded counts (308→182) to match actual DB
- `jest.config.js` - Added CSS mock + expanded transformIgnorePatterns for next-intl/use-intl/next
- `__mocks__/styleMock.js` - CSS module stub for Jest

## Decisions Made
- Sitemap URL count is 182 not 308: all DB entries have language suffixes (-es/-en), so unique slug Set yields 90, not 153. Plan noted "adjust if count differs significantly" — documented accordingly.
- Tests use `SUPPLEMENTS_DATABASE` at runtime to derive expected counts, avoiding stale hardcoded numbers.
- jest.config.js needed `transformIgnorePatterns` expansion to handle `next-intl` ESM imports when testing layout.tsx.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing sitemap test with wrong URL counts**
- **Found during:** Task 1 (sitemap.ts implementation)
- **Issue:** `lib/__tests__/sitemap.test.ts` had hardcoded 308 total / 306 supplement URL counts, based on incorrect assumption that all 153 DB entries have unique base slugs. Actual unique slugs = 90.
- **Fix:** Updated test to derive expected counts dynamically from SUPPLEMENTS_DATABASE
- **Files modified:** `lib/__tests__/sitemap.test.ts`
- **Verification:** 10 sitemap tests pass GREEN
- **Committed in:** `cae6415`

**2. [Rule 3 - Blocking] Added CSS mock and ESM transform to jest.config.js**
- **Found during:** Task 2 (gsc.test.ts verification)
- **Issue:** `app/[locale]/layout.tsx` imports `./globals.css` and `next-intl` (ESM). Jest couldn't parse CSS or ESM modules when gsc.test.ts imported layout metadata.
- **Fix:** Added `\\.(css)$` → styleMock.js in moduleNameMapper; expanded transformIgnorePatterns to allow next-intl/use-intl/next through @swc/jest
- **Files modified:** `jest.config.js`, `__mocks__/styleMock.js`
- **Verification:** gsc.test.ts passes GREEN
- **Committed in:** `278bcf2`

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking)
**Impact on plan:** Both fixes necessary for test correctness and test infrastructure. No scope creep.

## Issues Encountered
- `--testPathPattern` replaced by `--testPathPatterns` in current Jest version — used new flag throughout.

## User Setup Required

**GSC token swap required before going live:**
1. Go to Google Search Console → Settings → Ownership verification → HTML tag method
2. Copy the content value from the meta tag
3. Replace `'PASTE_GSC_TOKEN_HERE'` in `app/[locale]/layout.tsx` `verification.google` field with the actual token
4. Deploy and verify ownership in GSC dashboard

## Next Phase Readiness
- Sitemap and robots.txt ready for Google indexing once deployed
- GSC verification token pending user action (paste token in layout.tsx)
- Phase 04-04 (analytics) can proceed independently

---
*Phase: 04-seo-analytics*
*Completed: 2026-03-06*
