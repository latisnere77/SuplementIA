# TASK_SPEC - Reconcile Queue State With Open PRs

Generated: 2026-06-17

## Objective

Reconcile stale local `TASK_QUEUE.md` states with physical GitHub PR state and `origin/main`.

## Reconciliation Against `origin/main`

- `git fetch origin` completed before planning.
- `origin/main` is at merge commit `283316e`, which includes PR #179.
- GitHub PR state confirms:
  - PR #155 merged: discovery queue.
  - PR #169 merged: integrated the 13 SEO category clusters.
  - PRs #156-#168 are closed, not merged, because the cluster work was consolidated through PR #169.
  - PRs #171 and #172 remain open and are unrelated to the stale T2-T14 queue entries.

## IN SCOPE

- `TASK_QUEUE.md`
- `.planning/reconcile-queue-state/TASK_SPEC.md`
- `.planning/reconcile-queue-state/CHANGE_MANIFEST.md`
- `.planning/reconcile-queue-state/HANDOFF.md`
- `TASKS.md` only for task state tracking
- `MASTER_TASK_SPEC.md` only as the approved batch plan artifact

## OUT OF SCOPE

- Product source changes
- SEO content edits
- PR #171/#172 implementation or closure
- Merge to `main`
- Deploys
- AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Mark T2-T14 in `TASK_QUEUE.md` as `DONE (PR #169)`.
2. Add a reconciliation note explaining that #156-#168 were closed after integration.
3. Record task evidence and handoff files.
4. Run documentation-safe validation.
5. Commit, push, and open a ready-for-review PR.

## Validation Harness

This is documentation/queue state only. Required validation:

```bash
git diff --check
rg -n "SEO cluster: .*PENDING|IN_PROGRESS" TASK_QUEUE.md
```

Full app validation is out of scope because no runtime code, tests, package metadata, or product rendering changed.

## Risks

- Risk: stale individual PR numbers could be misread as pending work.
- Mitigation: record #169 as the integrated completion PR and preserve #156-#168 context in the reconciliation note.
