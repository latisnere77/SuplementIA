---
phase: 04-seo-analytics
plan: 02
subsystem: ui
tags: [nextjs, seo, metadata, open-graph, server-components, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: robots.ts, sitemap.ts, layout-level metadata — prerequisite SEO foundation
provides:
  - Server wrapper page.tsx for results page exporting generateMetadata
  - Server wrapper page.tsx for supplement detail page exporting generateMetadata
  - ResultsClient.tsx (renamed client component, 'use client', preserves all functionality)
  - SupplementDetailClient.tsx (renamed client component, 'use client', preserves all functionality)
affects: [04-03, testing, seo-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js 14 server wrapper pattern: rename client page.tsx to *Client.tsx, create thin server wrapper exporting generateMetadata"
    - "generateMetadata reads params.locale for i18n-aware titles (es: Evidencia Científica, en: Scientific Evidence)"

key-files:
  created:
    - app/[locale]/portal/results/ResultsClient.tsx
    - app/[locale]/portal/results/__tests__/seo-meta.test.ts
    - app/[locale]/portal/supplement/[slug]/SupplementDetailClient.tsx
  modified:
    - app/[locale]/portal/results/page.tsx
    - app/[locale]/portal/supplement/[slug]/page.tsx
    - components/portal/__tests__/seo-meta.test.ts

key-decisions:
  - "Server wrappers pass no props to client components — clients use useParams/useSearchParams internally"
  - "generateMetadata capitalises supplement names from slug/query via replace(-,space)+toUpperCase pattern"
  - "canonicalUrl uses https://suplementia.com as base domain (confirm before go-live)"

patterns-established:
  - "Server wrapper pattern: thin page.tsx (no 'use client') imports *Client.tsx and exports generateMetadata"

requirements-completed: [SEO-01]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 4 Plan 02: SEO Server Wrappers Summary

**Next.js 14 server wrapper pattern applied to results and supplement-detail pages: locale-aware generateMetadata with Open Graph tags, canonical URLs, and 12 passing SEO tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T20:04:07Z
- **Completed:** 2026-03-06T20:06:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Renamed `results/page.tsx` client component to `ResultsClient.tsx` (preserving all `'use client'` logic)
- Created `results/page.tsx` server wrapper exporting `generateMetadata` with locale-aware titles, descriptions, Open Graph, and canonical URLs
- Renamed `supplement/[slug]/page.tsx` client component to `SupplementDetailClient.tsx`
- Created `supplement/[slug]/page.tsx` server wrapper with slug-derived supplement names and locale-aware metadata
- 12 seo-meta tests GREEN across 2 test suites (plan required 6 minimum)

## Task Commits

Each task was committed atomically:

1. **Task 1: Server wrapper for results page (SEO-01)** - `cfd9ac1` (feat)
2. **Task 2: Server wrapper for supplement detail page (SEO-01)** - `29f7187` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified
- `app/[locale]/portal/results/ResultsClient.tsx` - Renamed client component (identical to original page.tsx, 'use client' preserved)
- `app/[locale]/portal/results/page.tsx` - Server wrapper: generateMetadata + renders ResultsClient
- `app/[locale]/portal/results/__tests__/seo-meta.test.ts` - 6 TDD tests for results generateMetadata
- `app/[locale]/portal/supplement/[slug]/SupplementDetailClient.tsx` - Renamed client component ('use client' preserved)
- `app/[locale]/portal/supplement/[slug]/page.tsx` - Server wrapper: generateMetadata + renders SupplementDetailClient
- `components/portal/__tests__/seo-meta.test.ts` - Added jest.mock for ResultsClient to fix pre-existing test import

## Decisions Made
- Server wrappers do NOT pass props to client components — both clients use `useParams()`/`useSearchParams()` React hooks internally, so `_props` is unused in the wrapper's default export
- Supplement names are derived from slug/query via `.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())` for display-ready capitalisation
- Production domain `https://suplementia.com` used in canonical URLs with comment noting confirmation needed before go-live

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in results/page.tsx: Props spread to no-props component**
- **Found during:** Task 1 (results server wrapper creation)
- **Issue:** Plan template had `return <ResultsClient {...props} />` but `ResultsClient` exports `function ResultsPage()` with no props — TS2559 error
- **Fix:** Changed to `return <ResultsClient />` with `_props: Props` parameter on wrapper (unused)
- **Files modified:** `app/[locale]/portal/results/page.tsx`
- **Verification:** `npx tsc --noEmit` reports no errors in results files
- **Committed in:** `cfd9ac1` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed components/portal/__tests__/seo-meta.test.ts import failure**
- **Found during:** Task 1 test run
- **Issue:** Pre-existing test file imports `generateMetadata` from results/page without mocking `ResultsClient`, causing next-intl ESM SyntaxError
- **Fix:** Added `jest.mock('@/app/[locale]/portal/results/ResultsClient', ...)` at top of test file
- **Files modified:** `components/portal/__tests__/seo-meta.test.ts`
- **Verification:** Both seo-meta test suites pass (12/12 tests GREEN)
- **Committed in:** `cfd9ac1` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 bug)
**Impact on plan:** Both fixes necessary for TypeScript correctness and test suite health. No scope creep.

## Issues Encountered
- next-intl ESM modules cannot be imported in Node.js Jest environment — solved by mocking client components in test files (established pattern from Phase 02)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Results and supplement-detail pages now have unique SEO metadata per locale and supplement
- Ready for Phase 04-03 (structured data / JSON-LD) or analytics integration
- Both client components fully functional — server wrappers are transparent pass-throughs

---
*Phase: 04-seo-analytics*
*Completed: 2026-03-06*
