---
phase: 03-categories-links-audit
plan: 03
subsystem: ui
tags: [next.js, navigation, i18n, link-audit, null-check]

# Dependency graph
requires:
  - phase: 03-categories-links-audit
    provides: "Test file (03-01) and knowledge-base slug corrections (03-02)"
provides:
  - "Fixed category page back-link: href /portal/search → /portal"
  - "Fixed GuidesCategories View All button: router.push /portal/categories → /portal, locale-aware useRouter"
  - "Fixed supplement detail back-link: null-checked backHref using getCategoryBySlug"
affects:
  - navigation
  - portal
  - GuidesCategories
  - supplement-detail

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Null-check dynamic href with getCategoryBySlug before rendering back-link"
    - "Import useRouter from '@/src/i18n/navigation' (not next/navigation) in client components"

key-files:
  created: []
  modified:
    - "app/[locale]/portal/category/[slug]/page.tsx"
    - "components/portal/GuidesCategories.tsx"
    - "app/[locale]/portal/supplement/[slug]/page.tsx"
    - "lib/__tests__/categories-links-audit.test.ts"

key-decisions:
  - "Used Option B null-check (getCategoryBySlug validation) for supplement detail back-link — more defensive than simple truthy check"
  - "useRouter import updated to '@/src/i18n/navigation' in GuidesCategories — consistent with Phase 2 locale-aware routing pattern"
  - "No notFound() added to supplement detail page (client component — server-only function)"
  - "Test regex tightened to avoid false-positive on /portal/search-analytics import paths"

patterns-established:
  - "Pattern: All client-side navigation in portal uses useRouter from '@/src/i18n/navigation'"
  - "Pattern: Dynamic back-links validated with getCategoryBySlug before building href"

requirements-completed: [CAT-02, LINK-01, LINK-02]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 3 Plan 03: Fix three hardcoded broken navigation links and add null-checked supplement back-link

**Three broken hrefs removed (category back-link, View All button, unguarded benefit param) and GuidesCategories switched to locale-aware useRouter**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T19:15:00Z
- **Completed:** 2026-03-06T19:30:00Z
- **Tasks:** 3
- **Files modified:** 4 (3 source + 1 test fix)

## Accomplishments
- Fixed category page back-link from `/portal/search` (non-existent route) to `/portal`
- Fixed GuidesCategories "View All Categories" button from `/portal/categories` to `/portal`, plus switched useRouter to locale-aware import from `@/src/i18n/navigation`
- Added `backHref` null-check with `getCategoryBySlug` validation in supplement detail page so unknown `benefit` params fall back to `/portal` instead of rendering a broken href

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix category page back-link** - `8519987` (fix)
2. **Task 2: Fix GuidesCategories useRouter import and View All destination** - `e953a7d` (fix)
3. **Task 3: Add null-check for benefit param in supplement detail back-link** - `4fe0311` (fix)

## Files Created/Modified
- `app/[locale]/portal/category/[slug]/page.tsx` - Changed href="/portal/search" to href="/portal"; notFound() already present
- `components/portal/GuidesCategories.tsx` - Updated useRouter import to @/src/i18n/navigation; changed router.push('/portal/categories') to router.push('/portal')
- `app/[locale]/portal/supplement/[slug]/page.tsx` - Added getCategoryBySlug import; added backHref variable with null-check; replaced bare href template literal
- `lib/__tests__/categories-links-audit.test.ts` - Tightened /portal/search regex to avoid false-positive match on search-analytics import paths

## Decisions Made
- Used Option B null-check (`getCategoryBySlug` validation) for supplement detail back-link rather than simple truthy check — catches stale slugs that exist as strings but have no category entry
- No `notFound()` added to supplement detail page — it is `'use client'`; `notFound()` is server-only and would throw at runtime
- GuidesCategories useRouter import updated alongside the href fix (same file, same root cause, documented in 03-RESEARCH.md as related scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test regex false-positive on /portal/search-analytics import path**
- **Found during:** Task 2 (LINK-01 "no component links" test verification)
- **Issue:** `fileContent.includes('/portal/search')` matched `@/lib/portal/search-analytics` import in results/page.tsx, causing LINK-01 test 3 to fail even after the category page fix
- **Fix:** Changed to regex `/\/portal\/search(?![a-zA-Z0-9_-])/` to require word boundary after "search"
- **Files modified:** `lib/__tests__/categories-links-audit.test.ts`
- **Verification:** LINK-01 test 3 passes; no false-positive on search-analytics
- **Committed in:** `e953a7d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug in test regex)
**Impact on plan:** Necessary for correct test behavior. No scope creep.

## Issues Encountered
- Prerequisite plans 03-01 and 03-02 had been completed in prior sessions (test file and slug corrections already committed). Confirmed pre-existing work was complete before proceeding.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All LINK-01 and LINK-02 tests green (35 passing, 6 todo for KNOWN_MISSING slugs)
- CAT-01 and CAT-02 satisfied
- Portal navigation links are clean — ready for Phase 4

---
*Phase: 03-categories-links-audit*
*Completed: 2026-03-06*
