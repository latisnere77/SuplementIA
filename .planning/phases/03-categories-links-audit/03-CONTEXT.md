# Phase 3: Categories & Links Audit - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand and validate health categories against SUPPLEMENTS_DATABASE, and fix all known broken navigation links. No new features, no manual curation of evidence content, no automated crawlers.

</domain>

<decisions>
## Implementation Decisions

### Category System Alignment
- `lib/knowledge-base.ts` is the source of truth for category pages — do not modify this role
- `components/portal/GuidesCategories.tsx` is a separate discovery component that links to search queries (`/portal/results?q=xxx`) — do NOT reconcile or consolidate with knowledge-base
- The two systems serve different UX purposes (curated category pages vs. quick search entry points) and must remain independent

### Category Validation (CAT-01, CAT-02)
- Do NOT expand knowledge-base manually — editorial content (evidence grades, summaries) requires clinical judgment beyond scope
- DO verify that every supplement `slug` in `knowledge-base.ts` resolves to a real entry in SUPPLEMENTS_DATABASE
- If a slug in knowledge-base has no match in DATABASE, flag it (do not silently serve stale data)

### Known Broken Links (LINK-01)
Three hardcoded broken links to fix:
1. `app/[locale]/portal/category/[slug]/page.tsx`: back button `href="/portal/search"` → change to `href="/portal"`
2. `components/portal/GuidesCategories.tsx`: "View All Categories" button pushes to `/portal/categories` → change to `/portal`
3. Dynamic links from `SupplementEvidenceCard` → `category/[slug]/page.tsx`: the `?benefit=${categorySlug}` param is used to build the back-link `/portal/category/${benefit}` — add a null-check so unknown benefit slugs do not produce a broken href

### Broken Link Treatment (LINK-02)
- Hardcoded broken hrefs: fix at source (update the href value directly)
- Dynamic broken links: add null-check + fallback redirect to `/portal` in the relevant page.tsx
- All dynamic route pages must call `notFound()` for unknown slugs (category page already does this; verify supplement page does too)
- No new 404 page required — Next.js default 404 is acceptable

### Claude's Discretion
- Exact implementation of the null-check fallback in category/[slug]/page.tsx
- Whether to surface slug validation mismatches as a build-time warning or runtime log
- Order of fix commits (can be a single plan or multiple plans)

</decisions>

<specifics>
## Specific Ideas

- Slug validation: iterate knowledge-base entries, check each supplement slug against SUPPLEMENTS_DATABASE IDs (strip `-es`/`-en` suffix pattern established in Phase 1)
- "View all categories" in GuidesCategories should go to `/portal` (main search/portal page) since `/portal/categories` doesn't exist and building it is out of scope
- The `?benefit=` param in supplement detail page back-link should gracefully handle unknown values rather than producing a broken `/portal/category/undefined` link

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/knowledge-base.ts`: `getAllCategories()` and `getCategoryBySlug()` — source of truth for category pages
- `lib/portal/supplements-database.ts`: SUPPLEMENTS_DATABASE — use for slug validation
- Phase 1 slug pattern: `chamomile-es` → strip `-es`/`-en` suffix → base ID — reuse for validation logic
- `notFound()` from `next/navigation` — already used in category page, verify use in supplement page

### Established Patterns
- Locale-aware routing via `src/i18n/navigation.ts` (established in Phase 2) — use for any new Link components
- Spanish names as primary display names (Phase 1 decision) — applies to category name display
- Targeted fixes only, no refactoring beyond the stated scope (Phase 2 pattern)

### Integration Points
- `app/[locale]/portal/category/[slug]/page.tsx`: fix back-link href, add benefit null-check
- `components/portal/GuidesCategories.tsx`: fix "view all" push destination
- `lib/knowledge-base.ts`: validate supplement slugs against SUPPLEMENTS_DATABASE (read-only validation, no data changes)

</code_context>

<deferred>
## Deferred Ideas

- Building a `/portal/categories` browse page — out of scope, would be its own phase
- Expanding knowledge-base with new categories or more supplements — requires clinical judgment, future milestone
- Automated link crawler for ongoing monitoring — out of scope for this phase

</deferred>

---

*Phase: 03-categories-links-audit*
*Context gathered: 2026-03-06*
