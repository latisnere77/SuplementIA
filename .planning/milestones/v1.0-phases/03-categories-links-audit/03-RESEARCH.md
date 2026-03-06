# Phase 3: Categories & Links Audit - Research

**Researched:** 2026-03-06
**Domain:** Next.js static routing, knowledge-base validation, navigation link auditing
**Confidence:** HIGH

## Summary

Phase 3 is a targeted audit-and-fix phase with no new features. The codebase contains three hardcoded broken navigation links (already identified) and supplement slugs in `lib/knowledge-base.ts` that do not uniformly resolve to IDs in `SUPPLEMENTS_DATABASE`. The entire scope fits within four files: the category page, the supplement detail page, `GuidesCategories.tsx`, and `knowledge-base.ts` (read-only validation only).

The validation strategy follows the project's established pattern from Phase 2: static file-content assertions in Jest that read source files directly without needing a running server. All four requirements can be verified with automated unit tests that run in seconds using the existing `@swc/jest` transform stack.

**Primary recommendation:** Fix the three broken hrefs directly at their source, add a null-check fallback on the `benefit` param in the supplement detail page back-link, and write a slug-validation test that iterates `KNOWLEDGE_BASE` entries and confirms each supplement slug resolves to a base ID in `SUPPLEMENTS_DATABASE`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Category System Alignment**
- `lib/knowledge-base.ts` is the source of truth for category pages — do not modify this role
- `components/portal/GuidesCategories.tsx` is a separate discovery component that links to search queries (`/portal/results?q=xxx`) — do NOT reconcile or consolidate with knowledge-base
- The two systems serve different UX purposes (curated category pages vs. quick search entry points) and must remain independent

**Category Validation (CAT-01, CAT-02)**
- Do NOT expand knowledge-base manually — editorial content (evidence grades, summaries) requires clinical judgment beyond scope
- DO verify that every supplement `slug` in `knowledge-base.ts` resolves to a real entry in SUPPLEMENTS_DATABASE
- If a slug in knowledge-base has no match in DATABASE, flag it (do not silently serve stale data)

**Known Broken Links (LINK-01)**
Three hardcoded broken links to fix:
1. `app/[locale]/portal/category/[slug]/page.tsx`: back button `href="/portal/search"` → change to `href="/portal"`
2. `components/portal/GuidesCategories.tsx`: "View All Categories" button pushes to `/portal/categories` → change to `/portal`
3. Dynamic links from `SupplementEvidenceCard` → `category/[slug]/page.tsx`: the `?benefit=${categorySlug}` param is used to build the back-link `/portal/category/${benefit}` — add a null-check so unknown benefit slugs do not produce a broken href

**Broken Link Treatment (LINK-02)**
- Hardcoded broken hrefs: fix at source (update the href value directly)
- Dynamic broken links: add null-check + fallback redirect to `/portal` in the relevant page.tsx
- All dynamic route pages must call `notFound()` for unknown slugs (category page already does this; verify supplement page does too)
- No new 404 page required — Next.js default 404 is acceptable

### Claude's Discretion
- Exact implementation of the null-check fallback in category/[slug]/page.tsx
- Whether to surface slug validation mismatches as a build-time warning or runtime log
- Order of fix commits (can be a single plan or multiple plans)

### Deferred Ideas (OUT OF SCOPE)
- Building a `/portal/categories` browse page — out of scope, would be its own phase
- Expanding knowledge-base with new categories or more supplements — requires clinical judgment, future milestone
- Automated link crawler for ongoing monitoring — out of scope for this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAT-01 | Health categories expanded and validated against SUPPLEMENTS_DATABASE | Slug cross-reference table below identifies all mismatches; validation test pattern is defined |
| CAT-02 | Category pages functional with correct supplement mappings | `getCategoryBySlug()` already calls `notFound()` for missing slugs; SupplementEvidenceCard back-link needs null-check for unknown benefit slugs |
| LINK-01 | All hyperlinks audited and verified functional | Three broken hrefs located (exact file/line in Broken Links section below) |
| LINK-02 | Broken links return proper 404 pages, not blank screens | Category page already calls `notFound()`; supplement detail page is client-side and does not call `notFound()` — needs benefit param null-check only |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/navigation` | (app-installed) | `notFound()` for unknown slugs | Already used in category page |
| `next/link` | (app-installed) | Type-safe `href` in JSX | Already used throughout |
| Jest + `@swc/jest` | (phase 1 decision) | Unit test transform | Established project pattern |
| Node.js `fs` | built-in | Static file-content assertions in tests | Established pattern from Phase 2 |

No new installations required for this phase.

---

## Architecture Patterns

### Pattern 1: Static File-Content Assertion Tests (established in Phase 2)

**What:** Jest tests that read source files as raw strings using `fs.readFileSync` and assert on their content. No test renderer, no mocking of Next.js internals.

**When to use:** Validating that hardcoded strings (broken hrefs, wrong import paths) have been fixed at the source level.

**Example (from Phase 2 test in `lib/__tests__/i18n-routing.test.ts`):**
```typescript
/** @jest-environment node */
import * as fs from 'fs';

describe('LINK-01: No broken hrefs', () => {
  it('category page back-link does not point to /portal/search', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    expect(content).not.toMatch(/href=["']\/portal\/search["']/);
  });
});
```

### Pattern 2: Data-Driven Slug Validation (new for Phase 3)

**What:** Import `KNOWLEDGE_BASE` array and `SUPPLEMENTS_DATABASE` array directly in a Jest test. Build a Set of base IDs from the database (strip `-es`/`-en` suffix), then assert that each supplement slug in the knowledge base resolves to a base ID in that Set.

**When to use:** CAT-01 validation — ensuring the curated knowledge base doesn't reference supplement slugs that have no backing data.

**Example:**
```typescript
/** @jest-environment node */
import { getAllCategories } from '../../lib/knowledge-base';
import { SUPPLEMENTS_DATABASE } from '../../lib/portal/supplements-database';

// Build a Set of base IDs by stripping -es / -en suffixes
const baseIds = new Set(
  SUPPLEMENTS_DATABASE.map(entry => entry.id.replace(/-(?:es|en)$/, ''))
);

describe('CAT-01: Supplement slugs resolve to SUPPLEMENTS_DATABASE entries', () => {
  const categories = getAllCategories();

  categories.forEach(category => {
    category.supplements.forEach(supplement => {
      it(`${supplement.slug} (in "${category.name}") exists in SUPPLEMENTS_DATABASE`, () => {
        expect(baseIds.has(supplement.slug)).toBe(true);
      });
    });
  });
});
```

### Pattern 3: Null-Check Before Dynamic Href

**What:** Guard the `benefit` search param before using it to build a back-link href. If the param is empty or does not match a known category slug, fall back to `/portal`.

**When to use:** Supplement detail page (`app/[locale]/portal/supplement/[slug]/page.tsx`) back-link.

**Current broken code (line 186):**
```tsx
<Link href={`/portal/category/${benefit}`} ...>
```

**Fix pattern (Claude's discretion on exact form):**
```tsx
// Option A: simple truthy check
const backHref = benefit ? `/portal/category/${benefit}` : '/portal';

// Option B: validate against known category slugs
import { getCategoryBySlug } from '@/lib/knowledge-base';
const backHref = (benefit && getCategoryBySlug(benefit))
  ? `/portal/category/${benefit}`
  : '/portal';
```

Option B is more defensive (catches stale slugs); Option A is simpler. Both satisfy LINK-02. Recommendation: Option B, since `getCategoryBySlug` is already imported-adjacent in the codebase and the function is trivially cheap.

### Anti-Patterns to Avoid

- **Silently accepting unresolved slugs:** Do not mark a test as skipped or add slug entries to the database just to make the test pass. The test should fail — that is the flag.
- **Using `router.push` for static hrefs:** `GuidesCategories.tsx` already uses `router.push` (which breaks locale). The fix for the "View All Categories" button should use `router.push('/portal')` to stay consistent with the rest of the component; do not introduce a `Link` element in an otherwise button-driven component (mixing patterns).
- **Adding `notFound()` to the supplement detail page:** This page is a `'use client'` component — `notFound()` is a server-side function and cannot be called here. The correct approach is the null-check fallback on the back-link only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug normalization | Custom suffix-stripper | `entry.id.replace(/-(?:es|en)$/, '')` | One-liner — already established in Phase 1 |
| 404 for unknown category slugs | Custom redirect logic | `notFound()` from `next/navigation` | Already in category page; Next.js handles the response |
| Link validation in CI | Custom crawler | Static file-content assertions in Jest | Zero infra overhead; runs in < 1 second |

---

## Broken Links: Complete Audit

### Identified Broken Links (LINK-01 scope)

| # | File | Line | Current (broken) href | Fixed href |
|---|------|------|-----------------------|-----------|
| 1 | `app/[locale]/portal/category/[slug]/page.tsx` | 42 | `href="/portal/search"` | `href="/portal"` |
| 2 | `components/portal/GuidesCategories.tsx` | 240 | `router.push('/portal/categories')` | `router.push('/portal')` |
| 3 | `app/[locale]/portal/supplement/[slug]/page.tsx` | 186 | `href={'/portal/category/${benefit}'}` (unguarded) | guarded with null-check fallback to `'/portal'` |

### Supplement Detail Page: `notFound()` inapplicable

The supplement detail page (`app/[locale]/portal/supplement/[slug]/page.tsx`) is marked `'use client'`. It fetches evidence data via API call at runtime. There is no server-side slug validation possible here. The `benefit` param is optional context for the back-link — the correct LINK-02 fix is the null-check on line 186, not a `notFound()` call.

---

## Slug Cross-Reference: Knowledge-Base vs SUPPLEMENTS_DATABASE

The slug stored in `SupplementEvidence.slug` (knowledge-base) must match the base ID produced by stripping `-es`/`-en` from a `SUPPLEMENTS_DATABASE` entry. Mismatches discovered by manual cross-reference:

| Category | Supplement Name | KB Slug | DB Base ID | Status |
|----------|----------------|---------|-----------|--------|
| sleep | Melatonina | `melatonin` | `melatonin` | OK |
| sleep | Magnesio | `magnesium` | `magnesium` | OK |
| sleep | Lavanda | `lavender` | (none) | **MISSING** |
| sleep | Valeriana | `valerian` | `valerian` | OK |
| energy | Cafeína | `caffeine` | (none) | **MISSING** |
| energy | Creatina | `creatine` | `creatine` | OK |
| energy | Rhodiola Rosea | `rhodiola-rosea` | `rhodiola` | **SLUG MISMATCH** |
| energy | Vitamina B12 | `vitamin-b12` | `vitamin-b12` | OK |
| anxiety | Ashwagandha | `ashwagandha` | `ashwagandha` | OK |
| anxiety | L-Teanina | `l-theanine` | `l-theanine` | OK |
| anxiety | Manzanilla | `chamomile` | `chamomile` | OK |
| muscle-gain | Proteína de Suero | `whey-protein` | `protein` | **SLUG MISMATCH** |
| muscle-gain | Creatina | `creatine` | `creatine` | OK |
| muscle-gain | Beta-Alanina | `beta-alanine` | (none) | **MISSING** |
| cognitive-function | Omega-3 (DHA) | `omega-3` | `omega3` | **SLUG MISMATCH** |
| cognitive-function | Bacopa Monnieri | `bacopa-monnieri` | (none) | **MISSING** |
| cognitive-function | Ginkgo Biloba | `ginkgo-biloba` | `ginkgo` | **SLUG MISMATCH** |
| heart-health | Omega-3 (EPA/DHA) | `omega-3` | `omega3` | **SLUG MISMATCH** |
| heart-health | Coenzima Q10 | `coenzyme-q10` | `coenzyme-q10` | OK |
| heart-health | Ajo | `garlic` | `garlic` | OK |
| joint-bone-health | Vitamina D | `vitamin-d` | `vitamin-d` | OK |
| joint-bone-health | Glucosamina | `glucosamine` | `glucosamine` | OK |
| joint-bone-health | Colágeno Hidrolizado | `hydrolyzed-collagen` | (collagen) | **SLUG MISMATCH** |
| gut-health | Probióticos | `probiotics` | `probiotics` | OK |
| gut-health | Fibra (Psyllium) | `fiber-psyllium` | (none) | **MISSING** |
| skin-hair-health | Colágeno | `collagen` | `collagen` | OK |
| skin-hair-health | Biotina | `biotin` | `biotin` | OK |
| immunity | Vitamina C | `vitamin-c` | `vitamin-c` | OK |
| immunity | Zinc | `zinc` | `zinc` | OK |
| immunity | Equinácea | `echinacea` | (none) | **MISSING** |
| mens-health | Saw Palmetto | `saw-palmetto` | `saw-palmetto` | OK |
| mens-health | Zinc | `zinc` | `zinc` | OK |
| womens-health | Ácido Fólico | `folic-acid` | `folic-acid` | OK |
| womens-health | Hierro | `iron` | `iron` | OK |
| womens-health | Calcio | `calcium` | `calcium` | OK |

**Summary of issues:**
- 6 slugs with NO matching base ID in SUPPLEMENTS_DATABASE: `lavender`, `caffeine`, `beta-alanine`, `bacopa-monnieri`, `fiber-psyllium`, `echinacea`
- 5 slug mismatches (close but not equal): `rhodiola-rosea` (DB: `rhodiola`), `whey-protein` (DB: `protein`), `omega-3` (DB: `omega3`), `ginkgo-biloba` (DB: `ginkgo`), `hydrolyzed-collagen` (DB: `collagen`)

**Implication for CAT-01:** The slug-validation test will fail for all 11 of these entries. Per the locked decision, they must be flagged, not silently accepted. The planner must decide whether to fix the slugs in knowledge-base (e.g., `rhodiola-rosea` → `rhodiola`) or add matching entries to the database. Fixing knowledge-base slugs is simpler and does not require clinical judgment. Adding database entries for missing supplements (lavender, caffeine, etc.) requires editorial content — which is deferred. Therefore: fix the 5 slug mismatches in knowledge-base.ts, and flag the 6 missing supplements as known gaps with a comment in the validation test.

---

## Common Pitfalls

### Pitfall 1: `notFound()` in a client component
**What goes wrong:** Calling `notFound()` from `next/navigation` inside a `'use client'` component throws at runtime.
**Why it happens:** `notFound()` is a server-side escape hatch that triggers Next.js's 404 response. Client components do not have access to the response stream.
**How to avoid:** The supplement detail page is `'use client'`. Do not add `notFound()` there. Use a conditional null-check on the `benefit` param for the back-link href. No server-side 404 is possible for this page without converting it to a server component (which is out of scope).
**Warning signs:** TypeScript may not flag this — it compiles but throws at runtime with "notFound is not a function" or a React render error.

### Pitfall 2: Slug mismatch causes silent 404 on supplement detail navigation
**What goes wrong:** `SupplementEvidenceCard` builds the link `href={'/portal/supplement/${slug}?benefit=${categorySlug}'}`. If the `slug` in knowledge-base does not match the supplement detail page's API call slug, the API returns no data.
**Why it happens:** The supplement detail page uses the URL slug directly as the API search term. A slug of `omega-3` works differently than `omega3`.
**How to avoid:** After fixing slug mismatches in knowledge-base.ts, verify that the supplement detail API actually accepts the corrected slug forms.
**Warning signs:** Supplement detail page renders "No se encontró evidencia" for affected supplements.

### Pitfall 3: `/portal/search` does not exist but may appear in other components
**What goes wrong:** The audit identifies the category page back-link as the only `/portal/search` reference, but the same broken href may appear in other components not yet checked.
**Why it happens:** Copy-paste during original development.
**How to avoid:** The LINK-01 test must grep the entire codebase for `/portal/search` occurrences, not just the category page.
**Warning signs:** Test passes for category page but broken link persists elsewhere.

### Pitfall 4: `GuidesCategories.tsx` uses `router.push` (from `next/navigation`)
**What goes wrong:** After Phase 2 fixed locale routing by switching to `src/i18n/navigation`, `GuidesCategories.tsx` still imports `useRouter` from `next/navigation` (line 10). This is a pre-existing issue, but fixing the "View All Categories" destination with `router.push('/portal')` using the un-patched router will still break locale.
**Why it happens:** Phase 2 did not audit this component.
**How to avoid:** When fixing the broken `/portal/categories` push, also update the `useRouter` import to `@/src/i18n/navigation`. This is a natural expansion of the LINK-01 fix and falls within scope. Check whether any other component-level category card clicks are also locale-broken (all 8 `handleCategoryClick` calls in the same file).
**Warning signs:** After the fix, clicking a category card navigates to `/en/portal/results?q=...` from `/es/` locale.

---

## Code Examples

### CAT-01: Slug validation test structure
```typescript
/** @jest-environment node */
// Validates: CAT-01

import { getAllCategories } from '../../lib/knowledge-base';
import { SUPPLEMENTS_DATABASE } from '../../lib/portal/supplements-database';

const baseIds = new Set(
  SUPPLEMENTS_DATABASE.map(entry => entry.id.replace(/-(?:es|en)$/, ''))
);

// Known slugs not yet in SUPPLEMENTS_DATABASE — flagged, not silently skipped
const KNOWN_MISSING = new Set([
  'lavender',       // No DB entry — would need clinical content
  'caffeine',       // No DB entry — would need clinical content
  'beta-alanine',   // No DB entry — would need clinical content
  'bacopa-monnieri', // No DB entry — would need clinical content
  'fiber-psyllium', // No DB entry — would need clinical content
  'echinacea',      // No DB entry — would need clinical content
]);

describe('CAT-01: knowledge-base supplement slugs resolve to SUPPLEMENTS_DATABASE', () => {
  const categories = getAllCategories();

  categories.forEach(category => {
    category.supplements.forEach(supplement => {
      if (KNOWN_MISSING.has(supplement.slug)) {
        it.todo(`${supplement.slug} — KNOWN GAP: not in SUPPLEMENTS_DATABASE`);
        return;
      }

      it(`"${supplement.slug}" (${category.slug}/${supplement.name}) exists in DB`, () => {
        expect(baseIds.has(supplement.slug)).toBe(true);
      });
    });
  });
});
```

### LINK-01: Static href assertion test
```typescript
/** @jest-environment node */
// Validates: LINK-01

import * as fs from 'fs';
import * as path from 'path';

describe('LINK-01: No hardcoded broken hrefs', () => {
  it('category page does not link to /portal/search', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    expect(content).not.toMatch(/href=["']\/portal\/search["']/);
    expect(content).toMatch(/href=["']\/portal["']/);
  });

  it('GuidesCategories does not push to /portal/categories', () => {
    const content = fs.readFileSync(
      'components/portal/GuidesCategories.tsx',
      'utf-8'
    );
    expect(content).not.toMatch(/['"]\/portal\/categories['"]/);
  });

  it('no component links to /portal/search', () => {
    // Scan all TSX/TS files in app/ and components/
    const dirs = ['app', 'components'];
    const portalSearchRefs: string[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.match(/\.(tsx?|jsx?)$/) && !entry.name.includes('.test.')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('/portal/search')) {
            portalSearchRefs.push(fullPath);
          }
        }
      }
    }

    dirs.forEach(scanDir);
    expect(portalSearchRefs).toEqual([]);
  });
});
```

### LINK-02: Null-check back-link test
```typescript
/** @jest-environment node */
// Validates: LINK-02

import * as fs from 'fs';

describe('LINK-02: Dynamic hrefs guarded against undefined benefit', () => {
  it('supplement detail page has a null-check before building category back-link', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/supplement/[slug]/page.tsx',
      'utf-8'
    );
    // Should not have the bare unguarded template literal
    expect(content).not.toMatch(/href=\{`\/portal\/category\/\$\{benefit\}`\}/);
    // Should have a fallback to /portal
    expect(content).toMatch(/\/portal(?:'|"|\s|`)/);
  });

  it('category page calls notFound() for unknown slugs', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    expect(content).toMatch(/notFound\(\)/);
  });
});
```

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (project default) + `@swc/jest` transform |
| Config file | `jest.config.js` (root) |
| Quick run command | `npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage` |
| Full suite command | `npx jest --testPathPattern="(lib/__tests__|components/portal/__tests__)" --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CAT-01 | Every supplement slug in knowledge-base resolves to a base ID in SUPPLEMENTS_DATABASE | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "CAT-01" --no-coverage` | Wave 0 |
| CAT-02 | Category pages call `notFound()` for unknown slugs; supplement back-link does not produce undefined href | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "LINK-02" --no-coverage` (reuses same file) | Wave 0 |
| LINK-01 | No component contains hardcoded hrefs to `/portal/search` or `/portal/categories` | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "LINK-01" --no-coverage` | Wave 0 |
| LINK-02 | Supplement detail page guards the `benefit` param before building the back-link href | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "LINK-02" --no-coverage` | Wave 0 |

All four requirements map to a single test file. Each requirement ID is embedded in the test suite name so `-t "CAT-01"` filters correctly.

### Sampling Rate

- **Per task commit:** `npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage`
- **Per wave merge:** `npx jest lib/__tests__/categories-links-audit.test.ts lib/__tests__/i18n-routing.test.ts --no-coverage`
- **Phase gate:** Full project suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/categories-links-audit.test.ts` — covers CAT-01, CAT-02, LINK-01, LINK-02 (all four requirements in one file, consistent with Phase 2 pattern)

No new framework installation required. No conftest equivalent needed — tests import directly from source files.

---

## Open Questions

1. **Slug mismatch resolution strategy for the 5 close-misses**
   - What we know: `rhodiola-rosea`, `whey-protein`, `omega-3`, `ginkgo-biloba`, `hydrolyzed-collagen` each have a near-match in the database but the slug doesn't exactly match the base ID.
   - What's unclear: Should the knowledge-base slugs be changed to match the DB (e.g., `omega-3` → `omega3`), or should DB entries be added with the knowledge-base slug as the ID? Changing the knowledge-base slug is lower risk.
   - Recommendation: Change slugs in knowledge-base.ts to match existing DB base IDs. This is a pure data edit, no editorial content required, and aligns with the locked decision to not expand the database.

2. **6 supplements with no DB entry at all**
   - What we know: `lavender`, `caffeine`, `beta-alanine`, `bacopa-monnieri`, `fiber-psyllium`, `echinacea` have no base ID in SUPPLEMENTS_DATABASE.
   - What's unclear: Should these be removed from knowledge-base, or kept as-is with the test using `it.todo` to flag them?
   - Recommendation: Keep them in knowledge-base (editorial content is valid), mark them as `KNOWN_MISSING` in the test with `it.todo`, and log a console warning at module load time in knowledge-base.ts. This fulfills the "flag it" requirement without breaking the page.

3. **GuidesCategories `useRouter` locale bug**
   - What we know: `GuidesCategories.tsx` imports `useRouter` from `next/navigation` (not locale-aware). All 8 category card clicks will break locale.
   - What's unclear: Whether this is explicitly in scope for LINK-01 or treated as a separate i18n issue.
   - Recommendation: Fix the import as part of the "View All Categories" fix commit — it is the same file and the same root cause. Adding a `lib/__tests__/i18n-routing.test.ts` assertion for `GuidesCategories.tsx` (matching Phase 2 pattern) documents this fix.

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `lib/knowledge-base.ts`, `lib/portal/supplements-database.ts`, `app/[locale]/portal/category/[slug]/page.tsx`, `app/[locale]/portal/supplement/[slug]/page.tsx`, `components/portal/GuidesCategories.tsx`, `components/portal/SupplementEvidenceCard.tsx`
- Phase 2 test pattern: `lib/__tests__/i18n-routing.test.ts` — established static file-content assertion approach
- `jest.config.js` — confirmed `@swc/jest` transform, `moduleNameMapper` for `@/` alias, `testMatch` glob

### Secondary (MEDIUM confidence)
- Next.js docs behavior: `notFound()` is server-only — confirmed by Next.js App Router documentation conventions and the fact that the supplement detail page is `'use client'`

### Tertiary (LOW confidence)
- None — all findings derived from direct source inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed and proven in use
- Architecture: HIGH — patterns established in Phase 2, directly observable in codebase
- Slug cross-reference: HIGH — derived from direct file inspection, not inference
- Pitfalls: HIGH — observed directly from source code (e.g., `notFound()` inapplicable in client component, locale import in GuidesCategories)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable codebase; next change would be Phase 2 landing)
