# SuplementAI - Stabilization & Spanish Search Fix

## What This Is

SuplementAI is an evidence-based supplement search platform that analyzes 240M+ PubMed articles to provide scientifically-backed supplement recommendations. Built for Spanish-speaking health professionals, nutritionists, athletes, and health-conscious users across Latin America. Hosted on AWS Amplify with a Next.js 14 frontend and serverless Lambda backend.

## Core Value

Users can search for ANY supplement in Spanish and get reliable, science-backed evidence analysis without errors or language barriers.

## Requirements

### Validated

- Autocomplete recognizes 158 supplements from SUPPLEMENTS_DATABASE (confirmed working)
- LanceDB vector search with 156 pristine supplements (Grade A/B/C)
- PubMed E-utilities integration for scientific study retrieval
- AWS Bedrock (Claude 3.5 Sonnet) for evidence analysis
- Multi-tier caching: DAX (L1) > Redis (L2) > DynamoDB (L3)
- Stripe subscription billing
- Cognito authentication

### Active

- [ ] Search works 100% for all 158 supplements in Spanish, English, and Latin American variants
- [ ] No 500 errors for valid supplement searches
- [ ] Locale stays consistent (no /es/ to /en/ switching)
- [ ] UI fully localized in Spanish when ES locale selected
- [ ] All hyperlinks functional
- [ ] SEO mechanisms for organic growth
- [ ] Analytics/tracking for visitor behavior
- [ ] Expanded and validated health categories
- [ ] PubMed API as fallback when SupplementsDB lacks data

### Out of Scope

- Amazon Ads integration -- deferred to future milestone, user explicit request
- Mobile app -- web-first strategy
- Real-time chat -- not core to supplement search value

## Context

### Forensic Audit Findings (2026-03-05)

**Critical bugs identified with evidence:**

1. **SUPPLEMENT_LEXICON desync**: Only 10/158 supplements indexed in PubMed search (6.3% coverage). Root cause of search failures.
2. **500 error on valid searches**: "Manzanilla" (chamomile) causes "Error del Sistema - Internal server error". Reproduced in production with screenshot evidence.
3. **Locale switch bug**: Searching from /es/portal redirects to /en/portal/results. Language context lost.
4. **Nav not localized**: "Search", "Plans" show in English even in ES locale.
5. **Deprecated normalizer**: NORMALIZATION_MAP (223 variants, ~50-60 canonicals) marked deprecated, no replacement implemented.
6. **Fallback suggestions hardcoded in English**: Ashwagandha, Omega-3, Vitamin D, Magnesium shown regardless of locale.

**Architecture:**
- SUPPLEMENTS_DATABASE (158 supplements) = source of truth
- LanceDB (156 supplements) = built from DATABASE, vector search
- SUPPLEMENT_LEXICON (10 supplements) = PubMed matching, MVP abandoned
- NORMALIZATION_MAP (223 variants) = deprecated, partially functional

**500 Error traced to:** `app/api/portal/recommend/route.ts` lines 268-279 (enrichment_failed) and line 459 (catch-all). Two independent tickets from locale bug.

## Constraints

- **Tech stack**: Next.js 14 + AWS (Amplify, Lambda, DynamoDB, RDS, Bedrock) -- no changes
- **Data source**: PubMed E-utilities API (public, rate-limited) + SupplementsDB
- **Budget**: Minimize AWS costs (Bedrock calls are expensive)
- **Users**: Spanish-speaking Latin America primary market

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SUPPLEMENTS_DATABASE is source of truth | 158 supplements, used by LanceDB build | -- Pending |
| Fix LEXICON before replacing normalizer | LEXICON causes 500s now; normalizer is deprecated but functional | -- Pending |
| Amazon Ads deferred | User explicit: "lo dejaria como una etapa posterior" | -- Pending |
| Backend first, then frontend | User: "asegurar que el backend funciona como reloj suizo" | -- Pending |

---
*Last updated: 2026-03-05 after initialization and forensic audit*
