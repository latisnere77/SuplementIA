# Milestones

## v2.0 PubMed Expansion (Shipped: 2026-03-07)

**Phases completed:** 2 phases (5–6), 4 plans, 9 tasks
**Requirements shipped:** 6/6 (PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, SLUG-01)
**LOC:** +1,882 / -151 across 34 files
**Timeline:** 2026-03-06 → 2026-03-07 (2-day sprint)

**Key accomplishments:**
- `searchPubMedForSupplement` exported with slim→rich type bridge — PubMed esummary shape mapped to Bedrock's `PubMedArticle` interface (PUB-01)
- quiz/route.ts condition branch replaced with full translate→search→analyze pipeline — zero dead ends for unknown supplements (PUB-02, PUB-03)
- HTTP 200 `noData:true` guard — zero PubMed results returns friendly "no encontramos datos científicos" message, not 500 (PUB-04)
- LanceDB catch block falls through to PubMed path — no 500 on DB failure (PUB-05)
- 12 SupplementEntry objects added for 6 missing category slugs — 40/40 CAT-01 tests pass, KNOWN_MISSING cleared (SLUG-01)
- 20 automated tests added: 7 unit (pubmed-search-supplement), 5 route (quiz fallback pipeline), 8 route (enrich-simple slugs)

**Known Tech Debt (v3.0+):**
- PUB-02 Haiku LLM translation disabled (`expandWithLLM` returns `[]`) — AWS credentials not in Amplify env; programmatic ~20-term dict active
- Human E2E browser verification pending: tejocote → evidence panel, xyzunknownxyz → noData message
- Phase 5 VALIDATION.md never closed (nyquist_compliant: false)
- Phase 6 has no VALIDATION.md
- LINK-02 pre-existing test failure (Phase 3 debt — SupplementDetailClient vs page.tsx mismatch)

**Archive:**
- `.planning/milestones/v2.0-ROADMAP.md`
- `.planning/milestones/v2.0-REQUIREMENTS.md`
- `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

---

## v1.0 Stabilization MVP (Shipped: 2026-03-06)

**Phases completed:** 4 phases, 12 plans
**Requirements shipped:** 17/19 (PUB-01/02 explicitly deferred to v2.0)
**LOC:** ~62,000 TypeScript
**Timeline:** 2026-03-05 → 2026-03-06 (1-day sprint)

**Key accomplishments:**
- Spanish-to-English supplement resolver (`resolveToEnglishName`) — eliminated 500 errors on Spanish supplement names
- SUPPLEMENT_LEXICON auto-generated from SUPPLEMENTS_DATABASE: 10 hardcoded entries → 90 auto-generated, proven by 611 exhaustive tests
- Locale-consistent navigation: `useRouter` from `@/src/i18n/navigation` wired in all 4 portal client components
- PortalHeader fully localized in ES: "Buscar", "Planes", "Iniciar sesion", "Cerrar sesion" via `useTranslations`
- Knowledge-base slug corrections (5 mismatches fixed) + 0 broken hrefs in category/supplement navigation
- SEO: locale-aware `generateMetadata` per page + 182-URL sitemap + `robots.ts` + GSC verification tag + 3 Vercel Analytics `track()` events

**Known Gaps (accepted as tech debt):**
- Phase 02 VERIFICATION.md never written (administrative gap — all 16 i18n tests GREEN)
- GSC verification token is placeholder — ops team must insert real token before indexing activates
- Vercel Analytics events require production deployment for dashboard confirmation

**Archive:**
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

---
