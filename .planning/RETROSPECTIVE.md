# Retrospective: SuplementAI

## Milestone: v1.0 — Stabilization MVP

**Shipped:** 2026-03-06
**Phases:** 4 | **Plans:** 12

### What Was Built

- Spanish-to-English supplement resolver eliminating 500 errors on Spanish search terms
- SUPPLEMENT_LEXICON auto-generated from SUPPLEMENTS_DATABASE (10 hardcoded → 90 auto-generated, 611 exhaustive tests)
- Locale-consistent search routing via `@/src/i18n/navigation` across all portal client components
- PortalHeader fully localized in ES via `useTranslations` + `messages/es.json`
- Knowledge-base slug corrections (5 mismatches) + zero broken hrefs in category/supplement navigation
- SEO: locale-aware `generateMetadata` + 182-URL sitemap + `robots.ts` + GSC verification + Vercel Analytics events

### What Worked

- **TDD Wave 0 pattern:** RED stubs before any fix code forced tight feedback loops and caught bugs early (Phases 1, 3, 4)
- **Parallel plan execution:** Phases 2 and 3 ran plans simultaneously (02-02 + 02-03 in parallel, 03-02 + 03-03 in parallel) — cut execution time significantly
- **DATABASE as single source of truth:** Auto-generating the lexicon from the database prevented the entire class of "hardcoded list desync" bugs
- **Dedicated test file per phase:** One file per phase (categories-links-audit.test.ts, i18n-routing.test.ts) made failures easy to locate

### What Was Inefficient

- **Phase 02 VERIFICATION.md never written:** Administrative gap surfaced in audit. All 16 tests GREEN but no formal verification record. Cost time in audit phase.
- **VALIDATION.md frontmatter not updated:** All 4 phases had `nyquist_compliant: false` even after tests passed. Required retroactive audit closure.
- **iCloud eviction discovered mid-session:** Work had to move from `~/Documents/suplementAI` to `~/Developer/suplementAI`. Should be caught in project setup.
- **Sitemap URL count miscalculated in plan:** Plan spec said 308 URLs; actual output is 182 (all 153 DB entries have -es/-en suffix, yielding 90 unique slugs x 2 locales + 2 index). Plan assumption was wrong; implementation derived correctly from data.

### Patterns Established

- `resolveToEnglishName()` before any Lambda call — Spanish inputs fail silently in Lambda
- `@swc/jest` for TypeScript compilation in Jest 30 + Node 20
- `useRouter` from `@/src/i18n/navigation` in ALL portal client components (not `next/navigation`)
- Next.js 14 server wrapper pattern: rename `*page.tsx` to `*Client.tsx`, create thin server wrapper exporting `generateMetadata`
- Auto-generate lookup tables from database rather than hardcoding (prevents desync)
- `it.todo` for KNOWN_MISSING gaps — flagged, not silently skipped

### Key Lessons

1. Write VERIFICATION.md immediately when plan execution completes — do not defer to "after testing"
2. Update VALIDATION.md `nyquist_compliant: true` in the same commit as test passage
3. Check for iCloud sync on working directories before any session begins
4. Plan URL/count assumptions should be derived from data, not estimated manually
5. PUB-01/02 deferral was correct — production analytics from v1.0 will determine if/when Phase 5 is worth building

### Cost Observations

- Sessions: ~4 focused sessions (1 per phase)
- Model: claude-sonnet-4-6 (balanced profile)
- Notable: 1-day sprint for 4 phases; tight TDD loops kept sessions short and deterministic

---

## Milestone: v2.0 — PubMed Expansion

**Shipped:** 2026-03-07
**Phases:** 2 | **Plans:** 4

### What Was Built

- `searchPubMedForSupplement` exported with slim→rich type bridge — PubMed esummary shape connected to Bedrock's `PubMedArticle` interface
- quiz/route.ts condition branch replaced: translate→search→analyze pipeline for unknown supplements (zero dead ends)
- HTTP 200 `noData:true` guard — friendly "no encontramos datos científicos" when PubMed has no results
- LanceDB catch block falling through to PubMed path (not 500)
- 12 SupplementEntry objects for 6 missing category slugs — 40/40 CAT-01 tests pass, KNOWN_MISSING cleared
- 20 automated tests: 7 unit (type bridge), 5 route (fallback pipeline), 8 route (enrich-simple slugs)

### What Worked

- **Slim→rich type bridge pattern:** Wrapping private `executePubMedSearch` in a typed public wrapper kept the interface clean and prevented callers from accidentally using the wrong type
- **noData sentinel pattern:** HTTP 200 + `{ noData: true }` cleanly separates "valid no-data" from actual 500 errors — frontend can handle both without guessing
- **Phase 6 independence:** Running slug completion (Phase 6) as independent-of-Phase-5 enabled clean parallelization of unrelated work
- **Call-order assertions in tests:** Using `expect(expandAbbreviation).toHaveBeenCalledBefore(searchPubMedForSupplement)` in route tests proved PUB-02 pipeline order without brittle implementation coupling

### What Was Inefficient

- **VALIDATION.md not closed again:** Same pattern as v1.0 — Phase 5 VALIDATION.md has `nyquist_compliant: false`, all tasks `pending`, despite Phase 5 being fully executed. Phase 6 has no VALIDATION.md at all.
- **Haiku LLM path disabled without tracking:** `expandWithLLM` silently returns `[]` — the infra dependency (AWS credentials in Amplify env) was known but not surfaced as a v2.0 blocker early enough. Result: PUB-02 is implemented but degraded.
- **Human E2E verification deferred:** Browser tests (tejocote → panel, xyzunknownxyz → noData) were documented as pending but not scheduled. No mechanism to close this gap without manual ops involvement.

### Patterns Established

- Slim→rich type bridge: wrap private typed function, expose only the public typed wrapper
- `noData` sentinel: HTTP 200 + `{ success: true, noData: true, message }` for valid empty states
- `retryable` sentinel: HTTP 200 + `{ success: false, retryable: true }` for transient API failures
- `expansion.alternatives[0] || fallback` as PubMed search name (not `.expanded` — field doesn't exist on AbbreviationExpansion)
- `year: 0` as sentinel when `pubdate` is missing — safe default for Bedrock prompt builder

### Key Lessons

1. Close VALIDATION.md in the same commit that passes tests — do not leave `nyquist_compliant: false`
2. Surface infra dependencies (Amplify env vars) as explicit blockers in the phase plan, not just as comments in code
3. For "human E2E pending" verifications, add a tracking item with an explicit owner/step — don't let them accumulate
4. `it.todo` stub pattern (Phase 6 KNOWN_MISSING) is effective at converting deferred debt to explicit tracked tests

### Cost Observations

- Sessions: ~2 focused sessions (one per phase)
- Model: claude-sonnet-4-6 (balanced profile)
- Notable: 2-day sprint. Plans were fast (2–18 min each). Main overhead was audit + milestone completion, not execution.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Key Win | Key Miss |
| --------- | ------ | ----- | ---- | ------- | -------- |
| v1.0      | 4      | 12    | 1    | TDD Wave 0 pattern | VERIFICATION.md gap |
| v2.0      | 2      | 4     | 2    | Type bridge + noData sentinel | VALIDATION.md not closed (again) |
