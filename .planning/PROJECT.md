# SuplementAI - Evidence-Based Supplement Search Platform

## What This Is

SuplementAI is an evidence-based supplement search platform that analyzes 240M+ PubMed articles to provide scientifically-backed supplement recommendations. Built for Spanish-speaking health professionals, nutritionists, athletes, and health-conscious users across Latin America. Hosted on AWS Amplify with a Next.js 14 frontend and serverless Lambda backend.

v1.0 shipped 2026-03-06: all 158 supplements searchable in Spanish and English without errors, UI fully localized in ES, zero broken navigation links, SEO-ready with sitemap + analytics.

## Core Value

Users can search for ANY supplement in Spanish and get reliable, science-backed evidence analysis without errors or language barriers.

## Requirements

### Validated

- [x] SRCH-01: SUPPLEMENT_LEXICON synchronized with SUPPLEMENTS_DATABASE (90-entry auto-generated lexicon) — v1.0
- [x] SRCH-02: Search for "manzanilla" returns valid evidence results (no 500 error) — v1.0
- [x] SRCH-03: All 158 supplements searchable in Spanish, English, and Latin American variants — v1.0
- [x] SRCH-04: enrich-v2 handles unknown supplements gracefully (friendly 404, not 500) — v1.0
- [x] SRCH-05: recommend/route.ts error handling differentiates "no data" vs "system error" — v1.0
- [x] I18N-01: Locale stays consistent during search (/es/ does not switch to /en/) — v1.0
- [x] I18N-02: Nav items localized ("Search" -> "Buscar", "Plans" -> "Planes" in ES) — v1.0
- [x] I18N-03: Fallback suggestions localized per locale (not hardcoded English) — v1.0
- [x] I18N-04: Search tips remove "usa terminos en ingles" advice — v1.0
- [x] I18N-05: All search results render in user's selected locale — v1.0
- [x] CAT-01: Health categories expanded and validated against SUPPLEMENTS_DATABASE — v1.0
- [x] CAT-02: Category pages functional with correct supplement mappings — v1.0
- [x] LINK-01: All hyperlinks audited and verified functional — v1.0
- [x] LINK-02: Broken links return proper 404 pages, not blank screens — v1.0
- [x] SEO-01: Meta tags, Open Graph, and structured data for supplement pages — v1.0
- [x] SEO-02: Sitemap.xml generated from SUPPLEMENTS_DATABASE (182 URLs, 2 locales) — v1.0
- [x] SEO-03: Visitor tracking implemented (Vercel Analytics + GSC verification) — v1.0
- Autocomplete recognizes 158 supplements from SUPPLEMENTS_DATABASE (confirmed pre-v1.0)
- LanceDB vector search with 156 pristine supplements (Grade A/B/C)
- PubMed E-utilities integration for scientific study retrieval
- AWS Bedrock (Claude 3.5 Sonnet) for evidence analysis
- Multi-tier caching: DAX (L1) > Redis (L2) > DynamoDB (L3)
- Stripe subscription billing
- Cognito authentication

### Active

- [ ] PUB-01: When SupplementsDB lacks data, PubMed API queried as fallback (v2.0)
- [ ] PUB-02: PubMed results integrated into evidence display (v2.0)
- [ ] ADS-01: Amazon Ads integration for supplement product recommendations
- [ ] ADS-02: Affiliate link tracking and revenue reporting

### Out of Scope

| Feature | Reason |
|---------|--------|
| Amazon Ads | Deferred to future milestone — user explicit: "lo dejaria como una etapa posterior" |
| Mobile app | Web-first strategy |
| Real-time chat | Not core to supplement search |
| OAuth login | Cognito email/password sufficient |

## Context

### Current State (v1.0, 2026-03-06)

- **Codebase:** ~62,000 LOC TypeScript (Next.js 14 + serverless Lambda)
- **Tech stack:** Next.js 14, AWS Amplify, Lambda, DynamoDB, Bedrock (Claude 3.5 Sonnet), LanceDB, Vercel Analytics
- **Supplements:** 153 unique in DATABASE (5 deduped from original 158), 156 in LanceDB (3 discrepancy, unresolved), 90-entry auto-generated lexicon
- **Tests:** 633+ passing unit/integration tests
- **SEO:** Sitemap (182 URLs, 2 locales), robots.txt, GSC verification placeholder, 3 Vercel Analytics events wired

### Known Tech Debt

- NORMALIZATION_MAP deprecated but functional — cleanup when safe
- LanceDB 156 vs 153 supplement discrepancy — unresolved, not blocking
- 6 KNOWN_MISSING category slugs in knowledge-base.ts (lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea)
- Phase 02 VERIFICATION.md never written (administrative gap — code correct, all tests GREEN)
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
| Amazon Ads deferred | User explicit: "lo dejaria como una etapa posterior" | — Pending v2.0 |
| Phase 5 (PubMed fallback) deferred to v2.0 | Production analytics needed to justify complexity | — Pending analytics data |

---
*Last updated: 2026-03-06 after v1.0 milestone*
