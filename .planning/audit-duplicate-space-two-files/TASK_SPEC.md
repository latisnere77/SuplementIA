# TASK_SPEC - Audit Duplicate Files With Space-Two Suffix

Generated: 2026-06-17

## Objective

Audit tracked files with a ` 2` suffix, prove whether they are unused duplicates, and remove only verified dead duplicates.

## Reconciliation Against `origin/main`

`git ls-files` shows tracked suffixed TypeScript paths:

- `app/api/supplements/route 2.ts`
- `app/api/test-env/route 2.ts`
- `components/portal/VariantSelectorModal 2.tsx`
- `lib/cache/simple-cache 2.ts`
- `lib/portal/variant-detector 2.ts`
- `types/supplement-variants 2.ts`
- `app/api/supplements/__tests__ 2/auto-embedding.property.test.ts`
- `app/api/supplements/__tests__ 2/cache-invalidation.property.test.ts`
- `app/api/supplements/__tests__ 2/insert-to-search-latency.property.test.ts`
- `app/api/supplements/__tests__ 2/scalability.property.test.ts`

Each has a canonical sibling path without ` 2`. Nine duplicates are byte-for-byte identical to canonical siblings. The remaining `scalability.property.test.ts` duplicate differs only by trailing whitespace.

No imports or references to the suffixed file names were found outside audit documentation.

## IN SCOPE

- The six verified duplicate files listed above
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/audit-duplicate-space-two-files/**`

## OUT OF SCOPE

- Canonical sibling files
- Runtime behavior changes
- Refactors or import rewrites
- Dependency changes
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Delete only the verified duplicate suffixed paths.
2. Update `OBSERVATIONS.md` to record resolution.
3. Mark the task complete in `TASKS.md`.
4. Run validation focused on absence of suffixed files and TypeScript/lint health.

## Validation Harness

```bash
rg --files | rg ' 2($|/|\.)'; test $? -eq 1
npm run type-check
npm run lint
```

## Risks

- Risk: a framework could have discovered these files accidentally.
- Mitigation: canonical siblings remain in place; suffixed paths are unintended duplicates and have no references.
