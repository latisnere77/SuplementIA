# T1 TASK_SPEC — SEO Cluster Discovery

## Objective

Enumerate portal category slugs that render the supplement card grid and currently have no curated `buildCategorySeoContent` entry, excluding negative controls such as `gut-health`. Add one pending SEO cluster task per candidate to `TASK_QUEUE.md`.

## Base Reconciliation

- Base: `origin/main`.
- Branch: `codex/seo-cluster-discovery-queue`.
- Discovery must use real code paths:
  - `getAllCategories()` from `lib/knowledge-base.ts`.
  - `buildCategorySeoContent(slug, locale)` from `app/[locale]/portal/category/[slug]/seo.ts`.
  - The category page grid hook `data-testid="category-supplement-results"` in `page.tsx`.

## In Scope

- Read:
  - `lib/knowledge-base.ts`
  - `app/[locale]/portal/category/[slug]/seo.ts`
  - `app/[locale]/portal/category/[slug]/page.tsx`
  - `app/[locale]/portal/category/[slug]/seo.test.ts`
  - `e2e/portal.spec.ts`
- Edit:
  - `TASK_QUEUE.md`
  - `.planning/t1-seo-discovery/TASK_SPEC.md`
  - `.planning/t1-seo-discovery/CHANGE_MANIFEST.md`

## Out Of Scope

- Product code changes.
- SEO content implementation.
- `page.tsx`, sitemap, robots, canonical, hreflang.
- Enricher, AWS, Lambda, Bedrock, Terraform.
- Checkout, Stripe, auth, referrals.
- `.DS_Store`, `.claude/`.

## Discovery Result

All categories from `getAllCategories()` render through the category page containing `data-testid="category-supplement-results"`. Existing curated content is present for:

- `sleep`
- `energy`
- `heart-health`
- `cholesterol-triglycerides`
- `common-deficiencies`

Excluded negative control:

- `gut-health`

Candidates added to the queue:

- `anxiety`
- `muscle-gain`
- `cognitive-function`
- `joint-bone-health`
- `skin-hair-health`
- `immunity`
- `mens-health`
- `womens-health`
- `blood-sugar`
- `inflammation`
- `sports-performance`
- `hormonal-health`
- `migraine-headache`

## Validation

- `npx tsx -e ...` module probe completed successfully and listed category/content state.
- `git diff --name-status origin/main...HEAD` must contain only queue/planning artifacts for this discovery task.

No e2e is required for T1 because it does not alter portal render or SEO runtime behavior.
