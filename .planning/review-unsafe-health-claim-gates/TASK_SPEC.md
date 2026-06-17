# TASK_SPEC - Review Unsafe Health Claim Gates

Generated: 2026-06-17

## Objective

Review unsafe health-claim test gates and patch focused test patterns where they do not cover the wording banned by `AGENTS.md`.

## Reconciliation Against `origin/main`

- `AGENTS.md` bans clinical claims such as `cura`, `trata`, `garantiza`, `clinically proven`, `treats`, and `cures`.
- Category SEO tests already include stricter cluster-specific patterns, but the shared `unsafePattern` is narrower.
- Supplement SEO and global SEO tests do not include Spanish `cura`, `trata`, `garantiza`, or `clinically proven`.
- `buildCategorySeoContent('gut-health')` remains the negative control and must not be changed.

## IN SCOPE

- `app/[locale]/portal/category/[slug]/seo.test.ts`
- `app/[locale]/portal/supplement/[slug]/seo.test.ts`
- `lib/seo.test.ts`
- `TASKS.md`
- `.planning/review-unsafe-health-claim-gates/**`

## OUT OF SCOPE

- SEO copy/content changes
- Negative-control behavior changes
- Runtime code
- Portal rendering
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Broaden unsafe claim regexes in focused SEO tests.
2. Keep existing `gut-health` negative control untouched.
3. Run focused Jest tests.

## Validation Harness

```bash
npm test -- --runInBand 'app/[locale]/portal/category/[slug]/seo.test.ts' 'app/[locale]/portal/supplement/[slug]/seo.test.ts' lib/seo.test.ts
git diff --check
rg -n "clinically proven|garantiza|\\\\bcura\\\\b|\\\\btrata\\\\b" 'app/[locale]/portal/category/[slug]/seo.test.ts' 'app/[locale]/portal/supplement/[slug]/seo.test.ts' lib/seo.test.ts
```

## Risks

- Risk: broad regex catches benign educational wording.
- Mitigation: target banned verb forms and keep existing allowed phrases such as professional-treatment disclaimers outside the new pattern.
