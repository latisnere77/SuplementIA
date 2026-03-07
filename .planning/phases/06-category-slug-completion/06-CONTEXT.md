# Phase 6: Category Slug Completion - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The 6 supplement slugs (lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea) already exist in knowledge-base.ts as supplement entries within categories. The gap is that they are NOT in SUPPLEMENTS_DATABASE — causing CAT-01 tests to be marked `.todo` and potentially causing the supplement detail pages (enrich-simple → Lambda) to fail if those slugs aren't in LanceDB/DynamoDB.

This phase: add ES + EN SUPPLEMENTS_DATABASE entries for all 6, remove them from KNOWN_MISSING so CAT-01 runs them as real tests, and verify the enrich-simple → Lambda path doesn't break for these slugs.

This phase does NOT wire the PubMed fallback into the supplement detail page (that would mix Phase 5 and Phase 6 scope).

</domain>

<decisions>
## Implementation Decisions

### SUPPLEMENTS_DATABASE entries
- Add ES + EN entries for all 6 slugs: lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea
- Matches the existing pattern (every supplement has both language variants)
- Entry structure: id, name, aliases, category, healthConditions, language — same shape as existing entries
- CAT-01 uses baseIds (strips -es/-en suffix), so either variant makes the test pass — both are added for completeness

### Lambda path verification
- The plan must include a step to verify the enrich-simple → Lambda path for these 6 slugs
- Two unknowns to resolve in research/planning: (1) whether the Lambda uses exact slug matching or fuzzy/semantic search via LanceDB, (2) whether LanceDB already has entries for these 6 supplements
- Verification approach: automated test that confirms the category API resolves the supplement entries correctly (not an end-to-end Lambda call — those are mocked)

### Recovery if Lambda fails for specific slugs
- If verification finds that 1-2 slugs break (Lambda returns error), the response is: document the broken slug with specific error data, open a follow-up issue, ship Phase 6 anyway
- Do NOT block Phase 6 on Lambda data gaps
- Do NOT remove broken slugs from knowledge-base.ts categories
- Do NOT wire PubMed fallback into enrich-simple (out of scope)

### Test cleanup
- Remove all 6 slugs from the KNOWN_MISSING set in `lib/__tests__/categories-links-audit.test.ts`
- Do NOT change the CAT-01 test logic — the existing `baseIds.has(supplement.slug)` check runs automatically once KNOWN_MISSING is cleared
- Run the full `categories-links-audit.test.ts` suite at phase end (covers LINK-01, LINK-02, CAT-01, CAT-02) to confirm fix + no regression

### Claude's Discretion
- Specific aliases for each supplement entry (should follow existing patterns in the DB)
- healthConditions array contents for each entry
- Whether to group the 6 new entries by language or by supplement in the DB file

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/portal/supplements-database.ts`: Target file — add 6 × 2 entries (ES + EN) using the existing SupplementEntry shape
- `lib/__tests__/categories-links-audit.test.ts`: KNOWN_MISSING set to clear, CAT-01 test logic untouched
- `lib/knowledge-base.ts`: Already has all 6 slugs in category entries — no changes needed here

### Established Patterns
- Entry IDs follow `{slug}-{lang}` pattern (e.g., `caffeine-es`, `caffeine-en`)
- Each entry has: id, name, aliases (3-5 entries), category, healthConditions (3-6 items), language
- Spanish names use accented characters (e.g., "Cafeína", "Lavanda", "Equinácea")
- SUPPLEMENT_LEXICON is auto-generated from SUPPLEMENTS_DATABASE — adding entries here automatically adds them to autocomplete

### Integration Points
- `lib/__tests__/categories-links-audit.test.ts` line 16-28: `baseIds` built from SUPPLEMENTS_DATABASE, KNOWN_MISSING set checked against it — removing from KNOWN_MISSING makes CAT-01 test these slugs
- `app/api/portal/enrich-simple/route.ts`: Calls Lambda with `supplementId: supplementName` (the raw slug from the URL) — Lambda lookup behavior (exact vs fuzzy) is UNKNOWN and must be audited in research
- `app/[locale]/portal/supplement/[slug]/SupplementDetailClient.tsx`: Calls enrich-simple with the slug — no changes needed here

### Unknown to Resolve in Research
- Does the Lambda (content-enricher) use exact supplementId matching or LanceDB vector/semantic search?
- Are lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea currently in LanceDB (156-entry dataset)?

</code_context>

<specifics>
## Specific Ideas

- Verification is pragmatic: assume common supplements (caffeine, lavender) likely work; less common ones (beta-alanine, fiber-psyllium, bacopa-monnieri) are the higher-risk ones to check
- User was explicit: "la opción 2 mezcla Phase 5 y Phase 6 — aumenta el scope y el riesgo" — keep Phase 6 narrowly scoped
- The .todo test status was a temporary gap marker from Phase 3 — Phase 6 is the intended closure

</specifics>

<deferred>
## Deferred Ideas

- Wiring enrich-simple → PubMed fallback for supplement detail pages when Lambda has no data — would be Phase 7 or v3.0
- Adding more LATAM supplements (tejocote, damiana, etc.) to SUPPLEMENTS_DATABASE — PubMed fallback from Phase 5 handles these dynamically, so no urgency

</deferred>

---

*Phase: 06-category-slug-completion*
*Context gathered: 2026-03-06*
