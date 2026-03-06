# Retrospective: SuplementAI

## Milestone: v1.0 — Stabilization MVP

**Shipped:** 2026-03-06
**Phases:** 4 | **Plans:** 12

### What Was Built

- Spanish-to-English supplement resolver eliminating 500 errors on Spanish search terms
- SUPPLEMENT_LEXICON auto-generated from SUPPLEMENTS_DATABASE (10 hardcoded → 90 auto-generated, 633 exhaustive tests)
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

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Key Win | Key Miss |
| --------- | ------ | ----- | ---- | ------- | -------- |
| v1.0      | 4      | 12    | 1    | TDD Wave 0 pattern | VERIFICATION.md gap |
