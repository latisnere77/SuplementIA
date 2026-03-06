---
phase: 04-seo-analytics
verified: 2026-03-06T20:11:14Z
status: human_needed
score: 8/8 must-haves verified
human_verification:
  - test: "Deploy to Vercel staging and visit /sitemap.xml"
    expected: "Valid XML sitemap with 182 entries (90 slugs x 2 locales + 2 index pages) visible in browser"
    why_human: "Next.js sitemap.ts only serves at /sitemap.xml when the app is running — cannot verify from static files"
  - test: "Deploy to Vercel staging and visit /robots.txt"
    expected: "Text file with 'Allow: /' and 'Sitemap: https://suplementia.com/sitemap.xml'"
    why_human: "robots.ts only activates at runtime under Next.js server"
  - test: "Visit /es/portal/results?q=ashwagandha in a browser with DevTools open, check <title> element"
    expected: "<title>Ashwagandha — Evidencia Científica | SuplementIA</title>"
    why_human: "generateMetadata renders into the HTML <head>; cannot verify without a running Next.js server"
  - test: "Visit /en/portal/results?q=ashwagandha in a browser and inspect page title"
    expected: "<title>Ashwagandha — Scientific Evidence | SuplementIA</title>"
    why_human: "Same reason — server-rendered metadata"
  - test: "Submit a search in the portal, then open Vercel Analytics → Custom Events in the dashboard"
    expected: "search_submitted event appears with query and locale properties"
    why_human: "Vercel Analytics events only appear in production/staging dashboard, not in automated tests"
  - test: "View a supplement result page, then check Vercel Analytics dashboard"
    expected: "supplement_view event appears with supplement and locale properties"
    why_human: "Same — runtime analytics only"
  - test: "Click a product link on a results page, then check Vercel Analytics dashboard"
    expected: "result_click event appears with supplement and from='results_page' properties"
    why_human: "Same — runtime analytics only"
  - test: "Paste actual GSC token into app/[locale]/layout.tsx verification.google field and verify Google Search Console ownership"
    expected: "GSC dashboard shows ownership verified for suplementia.com"
    why_human: "Ops task requiring a real GSC account — current value is placeholder 'PASTE_GSC_TOKEN_HERE'"
---

# Phase 4: SEO & Analytics Verification Report

**Phase Goal:** Add foundational SEO infrastructure (per-page meta, sitemap, robots.txt) and Vercel Analytics event tracking to the SuplementAI portal so that Google can index the site and product owners can measure user behaviour from day one.
**Verified:** 2026-03-06T20:11:14Z
**Status:** human_needed — all automated checks pass, runtime behaviour requires human verification
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Results page exports `generateMetadata` with locale-aware titles (ES: "Evidencia Científica", EN: "Scientific Evidence") | VERIFIED | `app/[locale]/portal/results/page.tsx` lines 12-51; 12 seo-meta tests GREEN |
| 2  | Supplement detail page exports `generateMetadata` with slug-derived locale-aware titles | VERIFIED | `app/[locale]/portal/supplement/[slug]/page.tsx` lines 12-45; supplement server wrapper present and wired |
| 3  | Both results and supplement pages are server components (no `'use client'`) exporting `generateMetadata` | VERIFIED | Neither wrapper file contains `'use client'` directive; TypeScript will reject `generateMetadata` in client components |
| 4  | Client component functionality is fully preserved after the rename | VERIFIED | `ResultsClient.tsx` has `'use client'` at line 8; `SupplementDetailClient.tsx` has `'use client'` at line 11; both wired via import in server wrappers |
| 5  | Sitemap is auto-generated from SUPPLEMENTS_DATABASE — covers both locales for every unique slug | VERIFIED | `app/sitemap.ts` imports `SUPPLEMENTS_DATABASE`, derives unique slugs with Set+regex strip; all 5 sitemap tests GREEN |
| 6  | robots.txt references the sitemap URL | VERIFIED | `app/robots.ts` line 8: `sitemap: 'https://suplementia.com/sitemap.xml'` |
| 7  | Layout metadata has a non-empty `verification.google` field | VERIFIED | `app/[locale]/layout.tsx` line 14-15: `verification: { google: 'PASTE_GSC_TOKEN_HERE' }` (placeholder); gsc.test.ts GREEN |
| 8  | Three analytics events wired in client components: `search_submitted`, `supplement_view`, `result_click` | VERIFIED | `portal/page.tsx:182`, `ResultsClient.tsx:737`, `ResultsClient.tsx:1337`; all in `'use client'` files only |

**Score:** 8/8 truths verified (automated)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/__tests__/sitemap.test.ts` | Wave 0 RED sitemap test stubs | VERIFIED | 5 tests, data-driven from SUPPLEMENTS_DATABASE, all GREEN |
| `components/portal/__tests__/seo-meta.test.ts` | Wave 0 RED seo-meta test stubs | VERIFIED | 6 tests, all GREEN (with jest.mock for ResultsClient) |
| `lib/__tests__/analytics-events.test.ts` | Wave 0 analytics event stubs | VERIFIED | 3 `it.todo` stubs — expected per plan spec |
| `lib/__tests__/gsc.test.ts` | GSC verification field test | VERIFIED | 1 test GREEN |
| `app/[locale]/portal/results/ResultsClient.tsx` | Renamed client component with 'use client' | VERIFIED | `'use client'` at line 8; all original logic preserved |
| `app/[locale]/portal/results/page.tsx` | Server wrapper exporting `generateMetadata` | VERIFIED | No `'use client'`; exports both `generateMetadata` and default `ResultsPage` |
| `app/[locale]/portal/supplement/[slug]/SupplementDetailClient.tsx` | Renamed client component with 'use client' | VERIFIED | `'use client'` at line 11; all original logic preserved |
| `app/[locale]/portal/supplement/[slug]/page.tsx` | Server wrapper exporting `generateMetadata` | VERIFIED | No `'use client'`; exports both `generateMetadata` and default `SupplementDetailPage` |
| `app/sitemap.ts` | Auto-generated sitemap from SUPPLEMENTS_DATABASE | VERIFIED | Imports DB, derives unique slugs via Set+regex, returns 2 index + N supplement URLs |
| `app/robots.ts` | robots.txt pointing to sitemap | VERIFIED | `rules: {userAgent:'*', allow:'/'}`, `sitemap: 'https://suplementia.com/sitemap.xml'` |
| `app/[locale]/layout.tsx` (modified) | GSC verification.google field added | VERIFIED | Lines 14-15: placeholder value present, gsc test passes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/[locale]/portal/results/page.tsx` | `ResultsClient.tsx` | `import ResultsClient from './ResultsClient'` | WIRED | Line 5 import + line 54 usage `<ResultsClient />` |
| `app/[locale]/portal/supplement/[slug]/page.tsx` | `SupplementDetailClient.tsx` | `import SupplementDetailClient from './SupplementDetailClient'` | WIRED | Line 5 import + line 48 usage `<SupplementDetailClient />` |
| `app/sitemap.ts` | `lib/portal/supplements-database.ts` | `import { SUPPLEMENTS_DATABASE }` | WIRED | Line 5 import + line 14 usage in `.map()` |
| `app/[locale]/layout.tsx` | Google Search Console | `metadata.verification.google` | WIRED (placeholder) | Field exists at line 14; actual token is an ops task |
| `app/[locale]/portal/page.tsx` | `@vercel/analytics` | `import { track } from '@vercel/analytics'` | WIRED | Line 24 import; `track('search_submitted', ...)` at line 182 inside `handleSearch` after validation |
| `app/[locale]/portal/results/ResultsClient.tsx` | `@vercel/analytics` | `import { track } from '@vercel/analytics'` | WIRED | Line 46 import; `track('supplement_view', ...)` at line 737 in useEffect; `track('result_click', ...)` at line 1337 in `handleBuyClick` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| SEO-01 | 04-02 | Per-page unique meta titles and Open Graph tags | SATISFIED | `generateMetadata` in both results and supplement wrappers; 12 seo-meta tests GREEN |
| SEO-02 | 04-03 | Auto-generated XML sitemap covering both locales | SATISFIED | `app/sitemap.ts` functional; 10 sitemap tests GREEN across 2 suites |
| SEO-03 | 04-03, 04-04 | GSC verification token + Vercel Analytics custom events | SATISFIED (code) | `verification.google` placeholder in layout; 3 track() calls in client components; runtime verification is ops/human |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/[locale]/portal/results/ResultsClient.tsx` | 189, 1360 | Pre-existing TODO comments (backend categorization, StreamingResults) | Info | Pre-existing debt, not introduced by Phase 04 — no impact on SEO goal |
| `app/[locale]/layout.tsx` | 15 | `'PASTE_GSC_TOKEN_HERE'` placeholder | Info (expected) | Explicitly accepted by plan spec; requires ops action to complete GSC ownership |

No blockers introduced by Phase 04. The GSC placeholder and analytics-events `it.todo` stubs are intentional design decisions per the plan.

### Test Suite Results

```
Test Suites: 6 passed, 6 total
Tests:       3 todo, 23 passed, 26 total
```

Suites verified:
- `lib/__tests__/sitemap.test.ts` — 5 tests GREEN
- `app/__tests__/sitemap.test.ts` — 5 tests GREEN (additional data-driven suite from Plan 03)
- `components/portal/__tests__/seo-meta.test.ts` — 6 tests GREEN
- `app/[locale]/portal/results/__tests__/seo-meta.test.ts` — 6 tests GREEN (additional suite from Plan 02)
- `lib/__tests__/gsc.test.ts` — 1 test GREEN
- `lib/__tests__/analytics-events.test.ts` — 3 todos (expected — client component rendering deferred)

### Notable Deviations Accepted

1. **Sitemap URL count is 182, not 308.** Plan originally projected 308 (153 slugs x 2 + 2). Actual DB has all entries with `-es`/`-en` suffixes, yielding 90 unique slugs → 182 URLs. The sitemap test was updated to be data-driven from `SUPPLEMENTS_DATABASE` at runtime, so it stays in sync with any future DB changes. This is a correct and documented deviation.

2. **analytics-events.test.ts uses `it.todo` not full assertions.** Three event tests are deferred because client component rendering with mock setup was descoped. Manual verification in the Vercel Analytics dashboard is the acceptance path. The `track()` calls are confirmed present in the source.

### Human Verification Required

#### 1. Sitemap XML endpoint

**Test:** Deploy to any environment (Vercel preview or `next dev`), then open `/sitemap.xml` in a browser.
**Expected:** Valid XML with entries for `/es/portal`, `/en/portal`, and 180 supplement result URLs all prefixed with `https://suplementia.com/`.
**Why human:** Next.js `MetadataRoute.Sitemap` only serves at runtime — cannot verify from static files.

#### 2. robots.txt endpoint

**Test:** Open `/robots.txt` in a browser after deployment.
**Expected:** `User-agent: *`, `Allow: /`, `Sitemap: https://suplementia.com/sitemap.xml`.
**Why human:** Same — runtime only.

#### 3. Results page meta title (ES)

**Test:** Open `/es/portal/results?q=ashwagandha` in a browser, inspect `<title>` in DevTools.
**Expected:** `Ashwagandha — Evidencia Científica | SuplementIA`
**Why human:** Server-rendered `<head>` metadata requires a running Next.js server.

#### 4. Results page meta title (EN)

**Test:** Open `/en/portal/results?q=ashwagandha` in a browser, inspect `<title>` in DevTools.
**Expected:** `Ashwagandha — Scientific Evidence | SuplementIA`
**Why human:** Same.

#### 5. search_submitted analytics event

**Test:** Submit a search query in the portal. Check Vercel Analytics → Custom Events.
**Expected:** `search_submitted` event with `query` and `locale` properties.
**Why human:** Vercel Analytics only records events in connected Vercel projects; not testable in Jest.

#### 6. supplement_view analytics event

**Test:** Navigate to a results page for any supplement. Check Vercel Analytics → Custom Events.
**Expected:** `supplement_view` event with `supplement` (the query param value) and `locale` properties.
**Why human:** Same — runtime analytics only.

#### 7. result_click analytics event

**Test:** On a results page, click the product/buy link. Check Vercel Analytics → Custom Events.
**Expected:** `result_click` event with `supplement` and `from: 'results_page'` properties.
**Why human:** Same.

#### 8. GSC ownership verification

**Test:** Replace `'PASTE_GSC_TOKEN_HERE'` in `app/[locale]/layout.tsx` with the actual token from Google Search Console → Settings → Ownership verification → HTML tag method. Deploy and verify in GSC dashboard.
**Expected:** GSC confirms ownership of `suplementia.com`.
**Why human:** Requires a Google Search Console account and actual DNS-verified domain.

### Gaps Summary

No gaps. All code deliverables are implemented, substantive, and wired. The 8 items flagged for human verification are runtime/ops tasks that are either:
- Inherently unverifiable from static analysis (SEO `<head>` rendering, sitemap XML endpoint, robots.txt endpoint)
- Dependent on external services (Vercel Analytics dashboard, Google Search Console)
- Intentionally deferred by plan design (GSC token swap, analytics-events full test assertions)

The phase goal — Google can index the site and product owners can measure user behaviour from day one — is achievable once deployed. The code infrastructure is complete.

---

_Verified: 2026-03-06T20:11:14Z_
_Verifier: Claude (gsd-verifier)_
