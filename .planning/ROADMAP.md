# Roadmap: SuplementAI Stabilization

**Created:** 2026-03-05
**Phases:** 5
**Requirements:** 19 mapped

## Phase 1: Search Backend Fix (CRITICAL)

**Goal:** All 158 supplements searchable without errors in Spanish and English

**Requirements:** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05

**Plans:** 2/2 complete

| Plan | Name | Status |
|------|------|--------|
| 01-01 | Deduplicate DB + Spanish-to-English resolver + error handling | Complete |
| 01-02 | Lexicon expansion from 10 to 90 entries + exhaustive coverage tests | Complete |

**Success Criteria:**
1. SUPPLEMENT_LEXICON contains all 158 supplements from SUPPLEMENTS_DATABASE with Spanish + English terms
2. Searching "manzanilla" returns valid evidence (no 500 error)
3. recommend/route.ts returns friendly 404 for "no data" and 500 only for real system errors
4. All 158 supplements tested via automated test suite

**Key Files:**
- `lib/services/pubmed-search.ts` (SUPPLEMENT_LEXICON expansion)
- `app/api/portal/recommend/route.ts` (error handling fix)
- `app/api/portal/enrich-v2/route.ts` (graceful fallback)
- `lib/portal/supplements-database.ts` (source of truth)

---

## Phase 2: Internationalization Fix

**Goal:** UI fully localized in Spanish when ES locale selected, no locale switching

**Requirements:** I18N-01, I18N-02, I18N-03, I18N-04, I18N-05

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Create failing test stubs for all i18n requirements (Wave 1)
- [x] 02-02-PLAN.md — Fix useRouter imports in 3 files + wire PortalHeader translations + add nav message keys (Wave 2)
- [x] 02-03-PLAN.md — Fix ErrorState: remove English tips + replace window.location.href with locale-aware router (Wave 2, parallel)

**Success Criteria:**
1. Searching from /es/portal stays in /es/portal/results (no redirect to /en/)
2. Nav items show "Buscar" and "Planes" in ES locale
3. Fallback suggestions show Spanish supplement names in ES locale
4. "Usa terminos en ingles" advice removed from search tips
5. Evidence results render in selected locale language

**Key Files:**
- `middleware.ts` (locale routing)
- `app/[locale]/portal/results/page.tsx` (results page locale)
- `components/portal/ErrorState.tsx` (localized suggestions)
- `messages/es.json`, `messages/en.json` (translation files)

---

## Phase 3: Categories & Links Audit

**Goal:** Categories expanded, validated, and all navigation links functional

**Requirements:** CAT-01, CAT-02, LINK-01, LINK-02

**Plans:** 3/3 plans complete

Plans:
- [ ] 03-01-PLAN.md — Create failing test stubs for all 4 requirements (Wave 0)
- [ ] 03-02-PLAN.md — Fix 5 slug mismatches in knowledge-base.ts (Wave 1)
- [ ] 03-03-PLAN.md — Fix 3 broken hrefs + useRouter import + benefit null-check (Wave 1, parallel)

**Success Criteria:**
1. Health categories cover all supplement categories from SUPPLEMENTS_DATABASE
2. Category detail pages show correct supplements with evidence grades
3. All hyperlinks audited (automated crawl) with 0 broken links
4. Broken link attempts show proper 404 page

**Key Files:**
- `lib/knowledge-base.ts` (slug corrections)
- `app/[locale]/portal/category/[slug]/page.tsx`
- `components/portal/GuidesCategories.tsx`
- `app/[locale]/portal/supplement/[slug]/page.tsx`

---

## Phase 4: SEO & Analytics

**Goal:** Site discoverable by search engines, visitor behavior tracked

**Requirements:** SEO-01, SEO-02, SEO-03

**Success Criteria:**
1. Each supplement page has unique meta title, description, Open Graph tags
2. sitemap.xml auto-generated from SUPPLEMENTS_DATABASE (158 URLs)
3. Google Search Console connected and indexing verified
4. Analytics dashboard shows page views, search queries, user journeys

**Key Files:**
- `app/[locale]/portal/results/page.tsx` (meta tags)
- `app/sitemap.ts` (new - sitemap generation)
- Vercel Analytics (already installed) + enhanced tracking

---

## Phase 5: PubMed API Fallback

**Goal:** When SupplementsDB lacks data, PubMed API provides fallback evidence

**Requirements:** PUB-01, PUB-02

**Success Criteria:**
1. If enrich-v2 returns insufficient_data, PubMed E-utilities queried directly
2. PubMed results formatted and displayed in same evidence panel format
3. User sees "Fuente: PubMed" indicator for fallback results

**Key Files:**
- `lib/services/pubmed-search.ts` (direct PubMed query)
- `app/api/portal/enrich-v2/route.ts` (fallback chain)
- `components/portal/EvidenceAnalysisPanelNew.tsx` (source indicator)

---

## Phase Dependencies

```
Phase 1 (Search Fix) <- BLOCKS everything
    |
    v
Phase 2 (i18n) <- Independent after Phase 1
Phase 3 (Categories/Links) <- Independent after Phase 1
    |
    v
Phase 4 (SEO/Analytics) <- Needs working pages from Phase 2+3
    |
    v
Phase 5 (PubMed Fallback) <- Enhancement, lowest priority
```

## Cleanup (Post-Roadmap)

- Remove deprecated NORMALIZATION_MAP (`lib/portal/query-normalization/normalizer.ts`)
- Investigate 156 vs 158 LanceDB discrepancy
- Sync LanceDB rebuild if DATABASE changes

---
*Roadmap created: 2026-03-05*
*Based on forensic audit evidence*
