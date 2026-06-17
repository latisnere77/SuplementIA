# TASK_SPEC - Add .DS_Store Hygiene Rule

Generated: 2026-06-17

## Objective

Prevent `.DS_Store` status noise and remove the current local untracked `.DS_Store` file.

## Reconciliation Against `origin/main`

- `.gitignore` does not include `.DS_Store`.
- `git ls-files` confirms no `.DS_Store` file is tracked.
- `find . -name .DS_Store` found one local untracked file at repo root.

## IN SCOPE

- `.gitignore`
- local untracked `.DS_Store` removal
- `TASKS.md`
- `.planning/ds-store-hygiene-rule/**`

## OUT OF SCOPE

- Product source
- Runtime behavior
- Broad ignore-file cleanup
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Add `.DS_Store` to `.gitignore`.
2. Remove the local untracked `.DS_Store` file.
3. Validate no tracked or visible untracked `.DS_Store` remains.

## Validation Harness

```bash
git diff --check
git ls-files | rg '(^|/)\\.DS_Store$'; test $? -eq 1
find . -name .DS_Store -print
git status --short --ignored | rg '\\.DS_Store'
```

Expected result: no tracked `.DS_Store`; `find` returns no files after local removal; `git status --ignored` may show ignored `.DS_Store` only if a new local copy appears.

## Risks

- Low risk: repository hygiene only.
