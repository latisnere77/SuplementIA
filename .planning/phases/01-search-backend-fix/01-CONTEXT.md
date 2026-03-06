# Phase 1: Search Backend Fix - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning
**Source:** Browser audit + forensic evidence

<domain>
## Phase Boundary

Fix the search backend so all 158 supplements are searchable without 500 errors in Spanish and English. No frontend changes. No infrastructure additions.

</domain>

<decisions>
## Implementation Decisions

### Root Cause (Validated with browser evidence)
- Frontend sends display name only: `supplement = "Manzanilla"` (no ID, no English name)
- Autocomplete returns `{ text: "Manzanilla", type: "category", score: 100 }` — no `id` field
- `recommend/route.ts` sends Spanish name directly to Lambda → Lambda needs English → 500
- SUPPLEMENT_LEXICON is NOT in the main search flow (only used in quiz route)
- The deprecated NORMALIZATION_MAP returns original term with confidence 0.0 for unknown supplements

### Fix Strategy: In-memory DATABASE lookup (Opcion B - locked)
- In `recommend/route.ts`: lookup SUPPLEMENTS_DATABASE to resolve Spanish name → English name
- Match by `name` or `aliases` (case-insensitive)
- Use the ID pattern (`chamomile-es` → strip suffix → find `chamomile-en` → `name: "Chamomile"`)
- Send English name to enrich-v2 → Lambda
- Zero frontend changes, zero new infrastructure, zero external calls

### Error Handling Fix
- `recommend/route.ts` lines 266-281: when enrich-v2 returns non-404, check if it's actually "no data" vs real system error
- Return friendly 404 for "no studies found", 500 only for genuine system failures
- Remove catch-all 500 at line 459 or make it more specific

### Data Integrity Fix
- SUPPLEMENTS_DATABASE has 5 duplicate IDs: collagen-es, vitamin-e-es, vitamin-a-es, selenium-es, potassium-es
- Deduplicate before relying on DATABASE as lookup source
- Verify all ES entries have corresponding EN pairs (needed for translation)

### SUPPLEMENT_LEXICON (quiz route - separate scope)
- LEXICON only affects `/api/portal/quiz/route.ts`, NOT the main search
- Expand LEXICON from 10 → all supplements for quiz completeness
- Auto-generate from SUPPLEMENTS_DATABASE to prevent future desync

### Claude's Discretion
- Implementation details of the DATABASE lookup function (helper location, caching)
- Whether to remove deprecated NORMALIZATION_MAP now or defer
- Test suite implementation approach

</decisions>

<specifics>
## Specific Ideas

- The lookup function should handle: exact name match, alias match, case-insensitive
- ES→EN mapping via ID pairs: strip `-es` suffix → append `-en` → find in DATABASE
- For supplements without EN pair (conditions like sleep-condition-es), use the name as-is
- Automated test: iterate all 158 DATABASE entries, verify each resolves to an English name

</specifics>

<deferred>
## Deferred Ideas

- Frontend passing supplementId instead of display name (would be ideal but requires frontend changes — Phase 2+ scope)
- Autocomplete API returning `id` field (same reason)
- BENEFIT_LEXICON expansion (only has joint-pain and sleep — quiz route scope)

</deferred>

---

*Phase: 01-search-backend-fix*
*Context gathered: 2026-03-05 via browser audit + forensic evidence*
