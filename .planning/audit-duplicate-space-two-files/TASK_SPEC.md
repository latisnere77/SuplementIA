# TASK_SPEC - Audit Duplicate Files With Space-Two Suffix

Generated: 2026-06-17

## Objective

Audit tracked files with a ` 2` suffix, prove whether they are unused duplicates, and remove only verified dead duplicates.

## Reconciliation Against `origin/main`

`git ls-files` shows six tracked suffixed TypeScript files:

- `app/api/supplements/route 2.ts`
- `app/api/test-env/route 2.ts`
- `components/portal/VariantSelectorModal 2.tsx`
- `lib/cache/simple-cache 2.ts`
- `lib/portal/variant-detector 2.ts`
- `types/supplement-variants 2.ts`

Each has a canonical sibling path without ` 2`, and each duplicate is byte-for-byte identical to its canonical sibling.

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

1. Delete only the six byte-identical suffixed files.
2. Update `OBSERVATIONS.md` to record resolution.
3. Mark the task complete in `TASKS.md`.
4. Run validation focused on absence of suffixed files and TypeScript/lint health.

## Validation Harness

```bash
rg --files | rg ' 2\.(ts|tsx)$'; test $? -eq 1
npm run type-check
npm run lint
```

## Risks

- Risk: a framework could have discovered these files accidentally.
- Mitigation: canonical siblings are identical and remain in place; suffixed files are invalid/unintended module names and have no references.
