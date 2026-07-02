# TASK_SPEC — duplicate-suffix-cleanup

Date: 2026-07-01

## Objective

Remove duplicate files with suffix ` 2` after comparing them against their canonical
counterparts.

## Scope

In scope:

- `app/api/supplements/route 2.ts`
- `app/api/test-env/route 2.ts`
- `components/portal/VariantSelectorModal 2.tsx`
- `lib/cache/simple-cache 2.ts`
- `lib/portal/variant-detector 2.ts`
- `app/api/supplements/__tests__ 2/**`
- `.planning/duplicate-suffix-cleanup/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Canonical source files.
- Behavior changes.
- Dependency changes.
- Route protection/removal.
- AWS, deploy, `.deploy-go`, Lambda, Terraform/EventBridge, Bedrock, LanceDB mutation,
  production-content-enricher, checkout/live purchase, and real GitHub issues.

## Comparison Evidence

- Five top-level duplicate files matched canonical files with `cmp=0`.
- Three duplicate tests matched canonical tests with `cmp=0`.
- `app/api/supplements/__tests__ 2/scalability.property.test.ts` differed only by
  whitespace from `app/api/supplements/__tests__/scalability.property.test.ts`.

## Harness

```bash
npm run validate
```
