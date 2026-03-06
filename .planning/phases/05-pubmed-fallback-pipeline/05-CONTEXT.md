# Phase 5: PubMed Fallback Pipeline - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** Developer inline decisions + codebase audit

<domain>
## Phase Boundary

When a user searches for a supplement NOT in SUPPLEMENTS_DATABASE (e.g., "tejocote"), the current
code falls through to `searchPubMed(sanitizedCategory)` — but the existing `searchPubMed` function
does a condition-based search (finds supplements by condition), NOT a supplement-specific search.
This phase fixes that path: translate the term → fetch PubMed studies for that specific supplement
→ run Bedrock analysis → return the same evidence panel structure as curated results.

This phase does NOT touch the curated supplement path or the enrich/Lambda pipeline for known
supplements. It only wires the unknown-supplement fallback correctly.

</domain>

<decisions>
## Implementation Decisions

### PUB-05: Catch Block Verification (pre-condition only)
- The LanceDB catch block at quiz/route.ts line ~1053 ALREADY falls through to the intent detection path
- PUB-05 is VERIFICATION ONLY — add a test assertion that confirms the catch block does not short-circuit
- DO NOT reimplement or modify the catch block unless the assertion fails

### PUB-02: ES→EN Translation via Haiku (LOCKED)
- Use the existing `expandAbbreviation` from `lib/services/abbreviation-expander.ts`
- This already uses Claude Haiku (`us.anthropic.claude-3-5-haiku-20241022-v1:0`)
- Call it before any PubMed API call when search falls to the unknown-supplement path
- NEVER call Sonnet or Opus for translation — Haiku only

### PUB-01: PubMed Supplement-Specific Search (LOCKED)
- The current `searchPubMed` in `lib/services/pubmed-search.ts` does a CONDITION-BASED search — do not use it for the fallback path
- Instead, export a new function `searchPubMedForSupplement(name: string): Promise<PubMedArticle[]>` from `pubmed-search.ts` that runs `executePubMedSearch` with the translated supplement name directly
- Wire this in `quiz/route.ts` in the unknown-supplement branch (currently calls `searchPubMed(sanitizedCategory)`)

### PUB-03: Bedrock Analysis (LOCKED)
- Pass the `PubMedArticle[]` returned from the supplement search to `analyzeStudiesWithBedrock(name, articles)` from `lib/services/bedrock-analyzer.ts`
- Return the same structure as curated enrichment (evidence panel with `worksFor`, `doesntWorkFor`, grade, studies)
- DO NOT create a new evidence panel format — reuse what `analyzeStudiesWithBedrock` already returns and format for the API response
- The response should match the shape the frontend already renders for enriched supplements

### PUB-04: Zero-Results Graceful Fallback (LOCKED)
- When PubMed returns 0 articles for the translated supplement name, return a friendly JSON response (not 500)
- Message: "no encontramos datos científicos sobre este suplemento en PubMed"
- HTTP status: 200 with `success: true, noData: true` — do NOT throw or return 4xx/5xx

### Claude's Discretion
- Response shape for the unknown-supplement path (as long as frontend can render it without new components)
- Whether to cache the PubMed+Bedrock result in DynamoDB or in-memory (suggest in-memory for v1)
- Error handling for PubMed API rate limits in the fallback path

</decisions>

<specifics>
## Specific Implementation Notes

**Files that will change:**
- `lib/services/pubmed-search.ts` — add `searchPubMedForSupplement(name: string): Promise<PubMedArticle[]>` (exports `executePubMedSearch` result for a supplement name)
- `app/api/portal/quiz/route.ts` — replace current `searchPubMed(sanitizedCategory)` call in the unknown-supplement branch with: translate → `searchPubMedForSupplement` → `analyzeStudiesWithBedrock` → format → return
- `app/api/portal/quiz/route.test.ts` — add test for PUB-05 (catch block falls through) and PUB-04 (zero results returns 200 with noData)

**Existing functions to reuse (do NOT reimplement):**
- `expandAbbreviation(term)` — `lib/services/abbreviation-expander.ts` (Haiku ES→EN)
- `analyzeStudiesWithBedrock(name, articles)` — `lib/services/bedrock-analyzer.ts`
- `executePubMedSearch(query)` — currently private in `pubmed-search.ts`, export or extract

**Current broken path (quiz/route.ts ~line 1071):**
```ts
if (searchType === 'condition') {
  const pubmedResults = await searchPubMed(sanitizedCategory); // condition-based, wrong for supplements
  return NextResponse.json(pubmedResults, { status: 200 });
}
```

**Target path:**
```ts
// Unknown supplement path
const translated = await expandAbbreviation(sanitizedCategory);
const searchName = translated.expanded || sanitizedCategory;
const articles = await searchPubMedForSupplement(searchName);
if (articles.length === 0) {
  return NextResponse.json({ success: true, noData: true, message: 'no encontramos datos científicos...' }, { status: 200 });
}
const analysis = await analyzeStudiesWithBedrock(searchName, articles);
return NextResponse.json({ success: true, supplement: searchName, evidence: analysis }, { status: 200 });
```

</specifics>

<deferred>
## Deferred Ideas

- DynamoDB caching for PubMed+Bedrock results for unknown supplements (post-roadmap)
- Expanding `BENEFIT_LEXICON` in pubmed-search.ts with more conditions (post-roadmap)
- Using the existing `searchPubMed` condition path for non-supplement unknown queries (out of scope for this phase)

</deferred>

---

*Phase: 05-pubmed-fallback-pipeline*
*Context gathered: 2026-03-06 via developer inline decisions + codebase audit*
