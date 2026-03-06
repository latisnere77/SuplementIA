# Phase 5: PubMed Fallback Pipeline - Research

**Researched:** 2026-03-06
**Domain:** Next.js API route wiring — PubMed NCBI E-utilities + AWS Bedrock (Claude Sonnet) + existing service layer
**Confidence:** HIGH

## Summary

Phase 5 is a targeted wiring fix in a single API route handler. All three service primitives already exist (`expandAbbreviation`, `searchPubMedForSupplement` via `executePubMedSearch`, `analyzeStudiesWithBedrock`). The work is: (1) export `executePubMedSearch` as a new public function in `pubmed-search.ts`, (2) replace the ~4-line broken branch in `quiz/route.ts` with the correct translate → search → analyze → return pipeline, and (3) add two test cases to the existing test file covering PUB-05 (catch block falls through) and PUB-04 (zero results returns `noData:true`).

There is one critical type mismatch to resolve before coding: `bedrock-analyzer.ts` imports `PubMedArticle` from `lib/services/medical-mcp-client.ts` (rich type: `pmid`, `abstract`, `authors: string[]`, `publicationTypes[]`), whereas `pubmed-search.ts` defines its own `PubMedArticle` (slim type: `uid`, no abstract, `authors: {name:string}[]`). The new `searchPubMedForSupplement` must return the type that `analyzeStudiesWithBedrock` accepts — the `medical-mcp-client` version. This is the single most important architectural decision the planner must encode in Wave 0.

A secondary issue in CONTEXT.md pseudocode: it references `translated.expanded` which does not exist on `AbbreviationExpansion`. The correct property is `translated.alternatives[0]`.

**Primary recommendation:** Export a new `searchPubMedForSupplement(name: string): Promise<PubMedArticle[]>` from `pubmed-search.ts` that maps the slim article shape to the rich `medical-mcp-client.PubMedArticle` shape before returning, so `analyzeStudiesWithBedrock` receives the type it expects.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **PUB-05 (catch block):** The LanceDB catch block at quiz/route.ts ~line 1053 ALREADY falls through. PUB-05 is VERIFICATION ONLY — add a test assertion that the catch block does not short-circuit. DO NOT modify the catch block unless the assertion fails.
- **PUB-02 (translation model):** Use `expandAbbreviation` from `lib/services/abbreviation-expander.ts` — Haiku (`us.anthropic.claude-3-5-haiku-20241022-v1:0`). NEVER use Sonnet or Opus for translation.
- **PUB-01 (PubMed function):** Do NOT modify or reuse `searchPubMed` for the fallback path. Export a new function `searchPubMedForSupplement(name: string): Promise<PubMedArticle[]>` from `pubmed-search.ts` that wraps `executePubMedSearch`.
- **PUB-03 (Bedrock analysis):** Pass articles to `analyzeStudiesWithBedrock(name, articles)` from `lib/services/bedrock-analyzer.ts`. Return the same evidence panel shape as curated enrichment. DO NOT create a new evidence panel format.
- **PUB-04 (zero results):** When PubMed returns 0 articles, return `{ success: true, noData: true, message: 'no encontramos datos científicos sobre este suplemento en PubMed' }` with HTTP 200. DO NOT throw or return 4xx/5xx.
- **Files that change:** `lib/services/pubmed-search.ts`, `app/api/portal/quiz/route.ts`, `app/api/portal/quiz/route.test.ts` only.
- **Do NOT reimplement:** `expandAbbreviation`, `analyzeStudiesWithBedrock`, `executePubMedSearch`.

### Claude's Discretion

- Response shape for the unknown-supplement path (as long as frontend can render it without new components)
- Whether to cache the PubMed+Bedrock result in DynamoDB or in-memory (suggest in-memory for v1)
- Error handling for PubMed API rate limits in the fallback path

### Deferred Ideas (OUT OF SCOPE)

- DynamoDB caching for PubMed+Bedrock results for unknown supplements (post-roadmap)
- Expanding `BENEFIT_LEXICON` in pubmed-search.ts with more conditions (post-roadmap)
- Using the existing `searchPubMed` condition path for non-supplement unknown queries (out of scope)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUB-05 | LanceDB catch block does not short-circuit — verification + test assertion | Catch block at line 1053 confirmed falls through (no early return). Test needed to lock this. |
| PUB-02 | Spanish supplement name translated to EN/scientific name via Haiku before PubMed | `expandAbbreviation` exists, exports correct type. LLM portion currently disabled (returns []); programmatic fallback covers common terms. Critical implication: see pitfall below. |
| PUB-01 | Unknown supplement routes to PubMed supplement-specific search, not condition search | `executePubMedSearch` is private in pubmed-search.ts. Must export as `searchPubMedForSupplement`. Type mismatch with bedrock-analyzer input — must resolve. |
| PUB-03 | PubMed articles analyzed with Bedrock — user sees full evidence panel (same quality as curated) | `analyzeStudiesWithBedrock` exists and returns `StudyAnalysis` (rich type). Frontend already renders this shape for enrich path. |
| PUB-04 | Zero PubMed results → friendly 200 response with noData:true, not 500 | Simple guard before calling analyzeStudiesWithBedrock. No library needed. |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js API route | 14.x | Request/response handler | Already in use |
| `@aws-sdk/client-bedrock-runtime` | existing | Bedrock invocation in bedrock-analyzer.ts | Already imported |
| NCBI E-utilities REST API | v2 (free) | PubMed search — esearch + esummary | Already used in executePubMedSearch |

### No New Dependencies
This phase requires zero new npm packages. All services are implemented. The work is exclusively route wiring and type alignment.

**Installation:**
```bash
# No new packages needed
```

---

## Architecture Patterns

### Recommended Project Structure
No new directories. Changes are confined to:
```
lib/services/pubmed-search.ts          # Add export searchPubMedForSupplement
app/api/portal/quiz/route.ts           # Replace broken branch (lines ~1072-1075)
app/api/portal/quiz/route.test.ts      # Add PUB-04 and PUB-05 test cases
```

### Pattern 1: The Correct Unknown-Supplement Branch

**What:** Replace the 4-line broken branch that calls `searchPubMed(sanitizedCategory)` with the full translate → search → analyze → return pipeline.

**When to use:** When `searchType === 'condition'` in `quiz/route.ts` (which is the label used for any unrecognized supplement — not actually a condition query).

**Key insight from code audit:** The intent detection at lines 1066-1070 labels everything NOT in `SUPPLEMENTS_DATABASE` as `searchType = 'condition'`. This includes unknown supplements like "tejocote". The label is a misnomer — it is the unknown-supplement path.

**Correct implementation shape:**
```typescript
// Source: CONTEXT.md target path + type audit
if (searchType === 'condition') {
  const expansion = await expandAbbreviation(sanitizedCategory);
  // NOTE: use alternatives[0], NOT expanded (property does not exist)
  const searchName = expansion.alternatives[0] || sanitizedCategory;
  const articles = await searchPubMedForSupplement(searchName);
  if (articles.length === 0) {
    return NextResponse.json(
      { success: true, noData: true, message: 'no encontramos datos científicos sobre este suplemento en PubMed' },
      { status: 200 }
    );
  }
  const analysis = await analyzeStudiesWithBedrock(searchName, articles);
  return NextResponse.json(
    { success: true, supplement: searchName, evidence: analysis },
    { status: 200 }
  );
}
```

### Pattern 2: searchPubMedForSupplement — Type Bridge

**What:** A new exported wrapper in `pubmed-search.ts` that calls `executePubMedSearch` and maps the slim article shape to the `medical-mcp-client.PubMedArticle` shape.

**Why this is necessary (CRITICAL):** `bedrock-analyzer.ts` imports `PubMedArticle` from `lib/services/medical-mcp-client.ts`, not from `pubmed-search.ts`. These are two different types:

| Field | pubmed-search.ts `PubMedArticle` | medical-mcp-client.ts `PubMedArticle` |
|-------|----------------------------------|---------------------------------------|
| id field | `uid: string` | `pmid: string` |
| abstract | not present | `abstract: string` (required) |
| authors | `{ name: string }[]` | `string[]` |
| journal | `source: string` | `journal: string` |
| year | not present | `year: number` |
| publicationTypes | not present | `publicationTypes: string[]` (required for RCT/meta-analysis counting) |

The `analyzeStudiesWithBedrock` prompt builder accesses `study.pmid`, `study.abstract`, `study.authors`, `study.journal`, `study.year`, `study.publicationTypes`. All of these must be present.

**Implementation:** `searchPubMedForSupplement` must map the slim E-utilities response to the rich type, supplying reasonable defaults for missing fields:
```typescript
// Source: type audit of pubmed-search.ts + medical-mcp-client.ts + bedrock-analyzer.ts
import type { PubMedArticle as RichPubMedArticle } from './medical-mcp-client';

export async function searchPubMedForSupplement(name: string): Promise<RichPubMedArticle[]> {
  const articles = await executePubMedSearch(name);
  return articles.map(a => ({
    pmid: a.uid,
    title: a.title,
    abstract: 'No abstract available',  // esummary does not return abstracts
    authors: (a.authors || []).map(au => au.name),
    journal: a.source,
    year: a.pubdate ? parseInt(a.pubdate.substring(0, 4), 10) : 0,
    publicationTypes: [],  // esummary does not return pub types in this call
  }));
}
```

**Note for planner:** The E-utilities `esummary` endpoint used by `executePubMedSearch` does not return full abstracts or publication types. This means `analyzeStudiesWithBedrock` will work on title-only data for the fallback path. This is acceptable for v1 — Bedrock can still grade and classify based on titles, which include study type keywords (meta-analysis, RCT, etc.) used by the existing grading logic.

### Pattern 3: PUB-05 Verification Test

**What:** A Jest test that confirms the catch block at line 1053 does NOT short-circuit (no early return inside catch).

**How:** Mock `searchSupplements` (the LanceDB wrapper) to throw an error, then mock `searchPubMedForSupplement` to return valid articles, and assert the response comes from the Bedrock analysis path — not from a 500 error.

### Anti-Patterns to Avoid
- **Do not call `searchPubMed` (the condition-based function) in the new path.** It runs multiple PubMed queries and returns `PubMedQueryResult`, which the frontend cannot render as an evidence panel.
- **Do not pass the slim `pubmed-search.PubMedArticle[]` directly to `analyzeStudiesWithBedrock`.** TypeScript will reject it (different shapes), and the prompt builder will fail at runtime (`study.pmid` undefined, `study.abstract` undefined).
- **Do not use `translated.expanded`.** That property does not exist on `AbbreviationExpansion`. Use `translated.alternatives[0]`.
- **Do not call LLM expansion without accounting for the disabled state.** `expandWithLLM` is currently commented out — `expandAbbreviation` will return `alternatives: [originalTerm]` for non-Spanish, non-abbreviation terms. This is intentional and correct for the fallback path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ES→EN supplement translation | Custom prompt to Sonnet/Opus | `expandAbbreviation` (Haiku) | Already exists, locked decision |
| PubMed supplement search | New fetch/parse logic | `executePubMedSearch` (expose it) | All parsing already implemented |
| Evidence analysis | New Bedrock prompt | `analyzeStudiesWithBedrock` | Rich prompt + response parsing already implemented and tested in enrich path |
| Frontend evidence panel | New React component | Existing `WorksForSection`, grade display | `StudyAnalysis` shape already rendered by frontend |

---

## Common Pitfalls

### Pitfall 1: Type Mismatch — Two `PubMedArticle` Definitions
**What goes wrong:** If `searchPubMedForSupplement` returns the slim type from `pubmed-search.ts`, TypeScript will complain when passing it to `analyzeStudiesWithBedrock`. At runtime, the Bedrock prompt builder will log `undefined` for `study.pmid`, `study.abstract`, etc., causing degraded or broken analysis output.
**Why it happens:** Two files define `PubMedArticle` with different shapes. `bedrock-analyzer.ts` imports from `medical-mcp-client.ts`.
**How to avoid:** Import `PubMedArticle` from `medical-mcp-client.ts` in `pubmed-search.ts` and use it as the return type of `searchPubMedForSupplement`. Map fields explicitly in the new function body.
**Warning signs:** TypeScript error `Type 'PubMedArticle' is not assignable to type 'PubMedArticle'` (same name, different modules).

### Pitfall 2: `translated.expanded` Does Not Exist
**What goes wrong:** CONTEXT.md pseudocode uses `translated.expanded || sanitizedCategory`. `AbbreviationExpansion` has no `expanded` field — accessing it returns `undefined`, so the fallback `sanitizedCategory` always fires, making translation a no-op.
**Why it happens:** The pseudocode was written with a hypothetical shape. The actual type was not checked.
**How to avoid:** Use `translated.alternatives[0] || sanitizedCategory`.
**Warning signs:** TypeScript will not catch this — `translated.expanded` evaluates to `undefined` silently.

### Pitfall 3: LLM Expansion Is Currently Disabled
**What goes wrong:** `expandWithLLM` is commented out with `TEMPORARILY DISABLED` notice. This means `expandAbbreviation` relies entirely on heuristic Spanish detection + `translateSpanishProgrammatically`. For terms not in that dictionary (e.g., "tejocote"), it returns the original Spanish term as `alternatives[0]`.
**Why it happens:** AWS credentials for Haiku are not configured in the Amplify environment.
**How to avoid:** This is acceptable for v1 — PubMed will still be queried with the original term, which may or may not return results. PUB-04 handles the zero-results case gracefully. Do NOT attempt to re-enable LLM expansion in this phase.
**Warning signs:** Search for "tejocote" returns `noData:true` — expected behavior until LLM is re-enabled post-roadmap.

### Pitfall 4: esummary Does Not Return Abstracts
**What goes wrong:** `executePubMedSearch` uses `esummary.fcgi` which returns bibliographic metadata only (title, authors, source, date). It does NOT return abstracts. `analyzeStudiesWithBedrock`'s prompt fills `Abstract: No abstract available` for all studies, reducing analysis quality.
**Why it happens:** Full abstracts require `efetch.fcgi` with `retmode=text&rettype=abstract` — a separate API call per article.
**How to avoid:** Accept this limitation for v1 (title-based analysis is still useful). The Bedrock prompt uses title keywords to detect study type (RCT, meta-analysis). Do NOT add efetch calls — that is post-roadmap scope.
**Warning signs:** All abstracts in Bedrock prompt show "No abstract available" — this is correct v1 behavior.

### Pitfall 5: Existing Test for "condition" Path Will Break
**What goes wrong:** `route.test.ts` line 66 asserts `expect(mockedSearchPubMed).toHaveBeenCalledWith('joint pain')` and line 65 asserts `expect(body).toEqual(mockResult)` where `mockResult` is a `PubMedQueryResult`. After this phase, the "condition" branch calls `searchPubMedForSupplement` + Bedrock, not `searchPubMed`. Both existing assertions will fail.
**Why it happens:** The test mocks the old code path that is being replaced.
**How to avoid:** Update the existing "condition" test (lines 31-68) to mock `searchPubMedForSupplement` and `analyzeStudiesWithBedrock` instead. The planner must include this as an explicit task — not just "add new tests" but also "update existing condition test."

---

## Code Examples

### Correct expandAbbreviation Usage
```typescript
// Source: lib/services/abbreviation-expander.ts — AbbreviationExpansion type
const expansion = await expandAbbreviation(sanitizedCategory);
// alternatives[0] is always populated (falls back to original term)
const searchName = expansion.alternatives[0] || sanitizedCategory;
```

### Correct searchPubMedForSupplement Signature and Type Bridge
```typescript
// Source: pubmed-search.ts executePubMedSearch + medical-mcp-client.ts PubMedArticle
import type { PubMedArticle as RichPubMedArticle } from './medical-mcp-client';

export async function searchPubMedForSupplement(name: string): Promise<RichPubMedArticle[]> {
  const articles = await executePubMedSearch(name);
  return articles.map(a => ({
    pmid: a.uid,
    title: a.title,
    abstract: 'No abstract available',
    authors: (a.authors || []).map(au => au.name),
    journal: a.source,
    year: a.pubdate ? parseInt(a.pubdate.substring(0, 4), 10) : 0,
    publicationTypes: [],
  }));
}
```

### Correct Zero-Results Guard (PUB-04)
```typescript
// Source: CONTEXT.md — HTTP 200, success:true, noData:true
if (articles.length === 0) {
  return NextResponse.json(
    {
      success: true,
      noData: true,
      message: 'no encontramos datos científicos sobre este suplemento en PubMed',
    },
    { status: 200 }
  );
}
```

### PUB-05 Test Structure
```typescript
// Source: app/api/portal/quiz/route.test.ts pattern
it('should fall through to PubMed when LanceDB throws (PUB-05)', async () => {
  mockedSearchSupplements.mockRejectedValue(new Error('LanceDB unavailable'));
  mockedSearchPubMedForSupplement.mockResolvedValue([/* articles */]);
  mockedAnalyzeStudies.mockResolvedValue({ overallGrade: 'B', ...rest });

  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(mockedSearchPubMedForSupplement).toHaveBeenCalled();
});
```

### PUB-04 Test Structure
```typescript
it('should return 200 with noData:true when PubMed returns zero articles (PUB-04)', async () => {
  mockedSearchPubMedForSupplement.mockResolvedValue([]);

  const response = await POST(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.noData).toBe(true);
  expect(body.message).toContain('no encontramos datos científicos');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Broken: `searchPubMed(sanitizedCategory)` + raw return | Correct: translate → `searchPubMedForSupplement` → Bedrock → formatted response | This phase | Users get evidence panel instead of 500/wrong data |
| `executePubMedSearch` private | `searchPubMedForSupplement` exported | This phase | Testable, callable from route |

**Known disabled/degraded:**
- `expandWithLLM` (Haiku): Commented out with `TEMPORARILY DISABLED` notice. Falls back to heuristic translation. Post-roadmap: re-enable once Amplify credentials are configured.
- `generateSearchVariations`: Also commented out. No impact on this phase.

---

## Open Questions

1. **Does the frontend handle `{ success: true, noData: true, message: '...' }` gracefully today?**
   - What we know: The frontend is not in scope for this phase (per CONTEXT.md). No new components allowed.
   - What's unclear: Whether the existing quiz UI shows a friendly state for `noData:true` or crashes on unexpected shape.
   - Recommendation: Planner should add a Wave 0 task to verify the existing frontend handles this shape (read-only audit, no new components). If it crashes, it is an integration concern for a later phase.

2. **Should `searchPubMedForSupplement` add `[Supplementation]` MeSH term to the query?**
   - What we know: `executePubMedSearch` takes a raw query string. PubMed searches for exact terms. Searching "tejocote" will return all PubMed articles mentioning that term.
   - What's unclear: Whether appending `[Supplementation]` or `AND supplement` improves result quality.
   - Recommendation: Start with raw supplement name only (matches CONTEXT.md target path). Post-v1 optimization.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via `@swc/jest` transform) |
| Config file | `/Users/latisnere/Developer/suplementAI/jest.config.js` |
| Quick run command | `npx jest app/api/portal/quiz/route.test.ts --no-coverage` |
| Full suite command | `npx jest --testPathPattern="quiz|pubmed" --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-05 | LanceDB catch block falls through to PubMed path | unit (mock) | `npx jest app/api/portal/quiz/route.test.ts --no-coverage` | ✅ (add test case to existing file) |
| PUB-02 | expandAbbreviation called before PubMedForSupplement | unit (mock) | same | ✅ (add assertion to PUB-05 test or separate case) |
| PUB-01 | searchPubMedForSupplement called with translated name | unit (mock) | same | ✅ (add test case) |
| PUB-03 | analyzeStudiesWithBedrock called; response shape has `evidence` key | unit (mock) | same | ✅ (add test case) |
| PUB-04 | 0 articles → 200 `{success:true, noData:true}` | unit (mock) | same | ✅ (add test case) |

### Sampling Rate
- **Per task commit:** `npx jest app/api/portal/quiz/route.test.ts --no-coverage`
- **Per wave merge:** `npx jest --testPathPattern="quiz|pubmed" --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `app/api/portal/quiz/route.test.ts` — needs 4 new test cases (PUB-01, PUB-03, PUB-04, PUB-05) and 1 updated test case (existing "condition" test now mocks wrong functions)
- [ ] Mock for `searchPubMedForSupplement` and `analyzeStudiesWithBedrock` needed in test file — neither is currently mocked
- [ ] Existing test `'should call searchPubMed and return 200 OK for a "condition" query'` (line 31) MUST be updated — it will fail after this phase changes the condition branch

---

## Sources

### Primary (HIGH confidence)
- Direct file audit: `lib/services/pubmed-search.ts` — confirmed `executePubMedSearch` is private, `PubMedArticle` slim shape, `searchPubMed` is condition-based
- Direct file audit: `lib/services/abbreviation-expander.ts` — confirmed `AbbreviationExpansion` type (no `expanded` field, uses `alternatives[]`), LLM disabled
- Direct file audit: `lib/services/bedrock-analyzer.ts` — confirmed `analyzeStudiesWithBedrock` signature, imports `PubMedArticle` from `medical-mcp-client`
- Direct file audit: `lib/services/medical-mcp-client.ts` — confirmed rich `PubMedArticle` type with `pmid`, `abstract`, `publicationTypes`
- Direct file audit: `app/api/portal/quiz/route.ts` lines 1053-1075 — confirmed catch block, broken branch location, `searchType = 'condition'` label
- Direct file audit: `app/api/portal/quiz/route.test.ts` — confirmed existing test structure, mock patterns, test that will break

### Secondary (MEDIUM confidence)
- NCBI E-utilities documentation (knowledge): `esummary` returns bibliographic data only, not abstracts — relevant to abstract field limitation

### Tertiary (LOW confidence)
- None needed — all findings are from direct code audit

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all services already installed, zero new dependencies
- Architecture: HIGH — type mismatch and property name error confirmed by code audit
- Pitfalls: HIGH — all identified from direct code inspection, not speculation
- Test gaps: HIGH — existing test file read line by line, gaps confirmed

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable domain — only changes if services are modified)
