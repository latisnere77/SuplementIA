# SuplementAI - Evidence-Based Supplement Search Platform

## What This Is

SuplementAI is an evidence-based supplement search platform that analyzes 240M+ PubMed articles to provide scientifically-backed supplement recommendations. Built for Spanish-speaking health professionals, nutritionists, athletes, and health-conscious users across Latin America. Hosted on AWS Amplify with a Next.js 14 frontend and serverless Lambda backend.

v1.0 shipped 2026-03-06: all 158 supplements searchable in Spanish and English without errors, UI fully localized in ES, zero broken navigation links, SEO-ready with sitemap + analytics.

v2.0 shipped 2026-03-07: unknown supplements (not in DB) now route through PubMed fallback — Haiku translates ES→EN, PubMed returns studies, Bedrock delivers full evidence analysis. Zero dead ends. 6 missing category slugs resolved.

## Core Value

Users can search for ANY supplement in Spanish and get reliable, science-backed evidence analysis without errors or language barriers.

## Requirements

### Validated

- ✓ SRCH-01: SUPPLEMENT_LEXICON synchronized with SUPPLEMENTS_DATABASE (90-entry auto-generated lexicon) — v1.0
- ✓ SRCH-02: Search for "manzanilla" returns valid evidence results (no 500 error) — v1.0
- ✓ SRCH-03: All 158 supplements searchable in Spanish, English, and Latin American variants — v1.0
- ✓ SRCH-04: enrich-v2 handles unknown supplements gracefully (friendly 404, not 500) — v1.0
- ✓ SRCH-05: recommend/route.ts error handling differentiates "no data" vs "system error" — v1.0
- ✓ I18N-01: Locale stays consistent during search (/es/ does not switch to /en/) — v1.0
- ✓ I18N-02: Nav items localized ("Search" -> "Buscar", "Plans" -> "Planes" in ES) — v1.0
- ✓ I18N-03: Fallback suggestions localized per locale (not hardcoded English) — v1.0
- ✓ I18N-04: Search tips remove "usa terminos en ingles" advice — v1.0
- ✓ I18N-05: All search results render in user's selected locale — v1.0
- ✓ CAT-01: Health categories expanded and validated against SUPPLEMENTS_DATABASE — v1.0
- ✓ CAT-02: Category pages functional with correct supplement mappings — v1.0
- ✓ LINK-01: All hyperlinks audited and verified functional — v1.0
- ✓ LINK-02: Broken links return proper 404 pages, not blank screens — v1.0
- ✓ SEO-01: Meta tags, Open Graph, and structured data for supplement pages — v1.0
- ✓ SEO-02: Sitemap.xml generated from SUPPLEMENTS_DATABASE (182 URLs, 2 locales) — v1.0
- ✓ SEO-03: Visitor tracking implemented (Vercel Analytics + GSC verification) — v1.0
- ✓ PUB-01: Unknown supplement routes to PubMed (not error) — v2.0
- ✓ PUB-02: Spanish term translated via Haiku before PubMed query — v2.0 (programmatic dict active; LLM path pending infra fix)
- ✓ PUB-03: PubMed articles analyzed with Bedrock — full evidence panel — v2.0
- ✓ PUB-04: Zero PubMed results → HTTP 200 noData:true friendly message — v2.0
- ✓ PUB-05: LanceDB catch block falls through to PubMed path (not 500) — v2.0
- ✓ SLUG-01: 6 missing category slugs added (lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea) — v2.0

### Active

- [ ] ADS-01: Amazon Ads integration for supplement product recommendations
- [ ] ADS-02: Affiliate link tracking and revenue reporting
- [ ] UX-01: Visual differentiation between curated DB results vs PubMed fallback results
- [ ] DB-01: Add LATAM supplements (tejocote, damiana, etc.) to SUPPLEMENTS_DATABASE manually

### Out of Scope

| Feature | Reason |
|---------|--------|
| Amazon Ads | Deferred to future milestone — user explicit: "lo dejaria como una etapa posterior" |
| Mobile app | Web-first strategy |
| Real-time chat | Not core to supplement search |
| OAuth login | Cognito email/password sufficient |
| Tabla de traducción ES→EN manual | No escala; anti-pattern rechazado. Haiku traduce dinámicamente. |

## Context

### Current State (v2.0, 2026-03-07)

- **Codebase:** ~62,000 LOC TypeScript (Next.js 14 + serverless Lambda)
- **Tech stack:** Next.js 14, AWS Amplify, Lambda, DynamoDB, Bedrock (Claude 3.5 Sonnet), LanceDB, PubMed E-utilities, Vercel Analytics
- **Supplements:** 153 unique in DATABASE (165 entries with v2.0 additions), 156 in LanceDB (3 discrepancy, unresolved)
- **Tests:** 650+ passing unit/integration tests (20 new in v2.0)
- **SEO:** Sitemap (182 URLs, 2 locales), robots.txt, GSC verification placeholder, 3 Vercel Analytics events wired
- **PubMed fallback:** Active in quiz/route.ts condition branch. Translation via programmatic dict (~20 terms); Haiku LLM path disabled pending AWS credential fix in Amplify env.

### Known Tech Debt

- NORMALIZATION_MAP deprecated but functional — cleanup when safe
- LanceDB 156 vs 153 supplement discrepancy — unresolved, not blocking
- PUB-02 Haiku translation disabled (`expandWithLLM` returns `[]`) — `expandWithLLM` in abbreviation-expander.ts lines 224-228 unconditionally returns `[]`. AWS credentials not in Amplify env. Fix in v3.0.
- Phase 5 VALIDATION.md never closed (nyquist_compliant: false, wave_0_complete: false)
- Phase 6 has no VALIDATION.md
- LINK-02 pre-existing test failure: SupplementDetailClient.tsx vs page.tsx (Phase 3 debt)
- Human E2E verification pending: tejocote search → evidence panel; xyzunknownxyz → noData (can't be automated)
- GSC token is placeholder — ops team inserts real token before indexing activates

## Constraints

- **Tech stack:** Next.js 14 + AWS (Amplify, Lambda, DynamoDB, RDS, Bedrock) — no changes
- **Data source:** PubMed E-utilities API (public, rate-limited) + SupplementsDB
- **Budget:** Minimize AWS costs (Bedrock calls are expensive); current ~$4/mo
- **Users:** Spanish-speaking Latin America primary market

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SUPPLEMENTS_DATABASE is source of truth | 153 supplements (post-dedup), used by LanceDB and lexicon | ✓ Good — auto-sync prevents desync |
| Auto-generate SUPPLEMENT_LEXICON from DATABASE | Prevents the 10/158 coverage bug from recurring | ✓ Good — 633 tests prove 100% coverage |
| Fix LEXICON before replacing normalizer | LEXICON caused 500s; normalizer deprecated but functional | ✓ Good — unblocked all search |
| resolveToEnglishName() before any Lambda call | Spanish inputs fail silently in Lambda; resolver is O(1) in-memory | ✓ Good — manzanilla → chamomile works |
| @swc/jest for TypeScript compilation | jest 30 + Node 20 has no native TS support | ✓ Good — tests run in <5s |
| useRouter from @/src/i18n/navigation in all portal clients | next/navigation useRouter doesn't preserve locale | ✓ Good — /es/ stays /es/ |
| Server wrapper pattern for SEO pages | Next.js 14 requires server component to export generateMetadata | ✓ Good — clean separation |
| Amazon Ads deferred | User explicit: "lo dejaria como una etapa posterior" | ⚠️ Revisit — ADS-01/02 now in Active for next milestone |
| PubMed fallback via condition branch in quiz/route.ts | Reuses existing Bedrock analysis pipeline; minimal surface area change | ✓ Good — translate→search→analyze wired cleanly |
| noData sentinel: HTTP 200 + { noData: true } | Prevents frontend error states for valid "no data" conditions | ✓ Good — clean separation from 500 errors |
| Haiku translation via programmatic dict (LLM disabled) | AWS credentials not in Amplify env; 20-term dict covers common cases | ⚠️ Revisit — Haiku LLM path needed for long-tail Spanish terms (v3.0) |
| expansion.alternatives[0] as PubMed search name | AbbreviationExpansion type has no `.expanded` field | ✓ Good — always populated per contract |
| 12 SupplementEntry objects for 6 category slugs | ES+EN pairs following {slug}-{lang} pattern — consistent with DATABASE schema | ✓ Good — 40/40 CAT-01 tests pass |

---
*Last updated: 2026-03-07 after v2.0 milestone*
