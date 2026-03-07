# Roadmap: SuplementAI

## Milestones

- ✅ **v1.0 Stabilization MVP** — Phases 1-4 (shipped 2026-03-06)
- 🚧 **v2.0 PubMed Expansion** — Phases 5-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 Stabilization MVP (Phases 1-4) — SHIPPED 2026-03-06</summary>

- [x] Phase 1: Search Backend Fix (2/2 plans) — completed 2026-03-06
- [x] Phase 2: Internationalization Fix (3/3 plans) — completed 2026-03-06
- [x] Phase 3: Categories & Links Audit (3/3 plans) — completed 2026-03-06
- [x] Phase 4: SEO & Analytics (4/4 plans) — completed 2026-03-06

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v2.0 PubMed Expansion (In Progress)

**Milestone Goal:** When a supplement is not in SUPPLEMENTS_DATABASE, the system translates the Spanish term to a scientific name via Haiku, queries PubMed, runs Bedrock analysis, and delivers a complete evidence response — no dead ends.

- [ ] **Phase 5: PubMed Fallback Pipeline** — Unknown supplements route through Haiku translation → PubMed query → Bedrock analysis → full evidence panel or friendly "no data" message
- [ ] **Phase 6: Category Slug Completion** — 6 missing category slugs added to knowledge-base.ts, eliminating all known broken category hrefs

## Phase Details

### Phase 5: PubMed Fallback Pipeline
**Goal**: Users who search for any supplement not in SUPPLEMENTS_DATABASE receive a complete, Bedrock-analyzed evidence result sourced from PubMed — or a clear "no data found" message when PubMed also has nothing
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: PUB-05, PUB-02, PUB-01, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):
  1. Searching a supplement not in SUPPLEMENTS_DATABASE (e.g., "tejocote") returns a full evidence analysis panel with study data, not a 500 error or blank screen
  2. The evidence panel for an unknown supplement shows Bedrock analysis with the same structure and quality as curated DB results
  3. Searching a term with no PubMed studies shows a friendly "no encontramos datos científicos" message, not an error page
  4. The quiz/route.ts catch block no longer short-circuits on LanceDB failure — intent detection falls through to PubMed path (pre-condition: prior commit verified)
  5. The Spanish supplement term is translated to scientific/English name by Haiku before any PubMed API call is issued
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Export searchPubMedForSupplement with slim→rich type bridge + unit tests (PUB-01)
- [ ] 05-02-PLAN.md — Replace broken condition branch in quiz/route.ts with translate→search→analyze pipeline (PUB-02, PUB-03, PUB-04)
- [ ] 05-03-PLAN.md — Update route.test.ts: rewrite condition test, add PUB-05 / PUB-04 / PUB-02 / PUB-03 assertions (PUB-05, PUB-04, PUB-02, PUB-03)

### Phase 6: Category Slug Completion
**Goal**: All 6 known-missing category slugs resolve to valid knowledge-base entries — no broken category links in navigation or SEO pages
**Depends on**: Phase 4 (v1.0 complete — can run in parallel with Phase 5)
**Requirements**: SLUG-01
**Success Criteria** (what must be TRUE):
  1. Navigating to each of the 6 category pages (lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea) renders content, not a 404 or broken page
  2. The KNOWN_MISSING list in knowledge-base.ts no longer contains these 6 slugs
  3. No new broken hrefs are introduced in category or supplement navigation after the additions
**Plans**: TBD

Plans:
- [ ] 06-01: Add 6 missing slug entries to knowledge-base.ts with correct supplement mappings and verify zero broken hrefs

## Progress

**Execution Order:** 5 → 6 (Phase 6 can run in parallel with Phase 5)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Search Backend Fix | v1.0 | 2/2 | Complete | 2026-03-06 |
| 2. Internationalization Fix | v1.0 | 3/3 | Complete | 2026-03-06 |
| 3. Categories & Links Audit | v1.0 | 3/3 | Complete | 2026-03-06 |
| 4. SEO & Analytics | v1.0 | 4/4 | Complete | 2026-03-06 |
| 5. PubMed Fallback Pipeline | 1/3 | In Progress|  | - |
| 6. Category Slug Completion | v2.0 | 0/1 | Not started | - |

---
*v1.0 shipped: 2026-03-06*
*v2.0 roadmap created: 2026-03-06*
