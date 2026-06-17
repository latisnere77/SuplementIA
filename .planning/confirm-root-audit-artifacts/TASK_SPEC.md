# TASK_SPEC - Confirm Root Audit Artifacts Ownership

Generated: 2026-06-17

## Objective

Make the root audit artifacts reviewable and clarify their authority so future agents do not depend on untracked local-only files.

## Reconciliation Against `origin/main`

- `origin/main` tracks `AGENTS.md`, `TASK_QUEUE.md`, and prior `.planning/**` task folders.
- `PROJECT_CONTEXT.md`, `OBSERVATIONS.md`, `TASKS.md`, `.planning/queue-idle.md`, and `.planning/seo-clusters-integration/CHANGE_MANIFEST.md` were present locally but untracked.
- PR #180 already introduces `TASKS.md` and `MASTER_TASK_SPEC.md` as part of the approved execution batch.

## IN SCOPE

- `PROJECT_CONTEXT.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/queue-idle.md`
- `.planning/seo-clusters-integration/CHANGE_MANIFEST.md`
- `.planning/confirm-root-audit-artifacts/**`

## OUT OF SCOPE

- Runtime code
- Product behavior
- `AGENTS.md` governance changes
- `.DS_Store` hygiene
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Add ownership notes to `PROJECT_CONTEXT.md`.
2. Update `OBSERVATIONS.md` so root artifacts are no longer described as unresolved untracked files.
3. Refresh `.planning/queue-idle.md` with current PR state after queue reconciliation.
4. Track the historical SEO integration handoff artifact under `.planning/**`.
5. Record change manifest and handoff.

## Validation Harness

```bash
git diff --check
rg -n "Root Audit Artifact Ownership|Root Audit Files Are Untracked|Open PRs Waiting For Review" PROJECT_CONTEXT.md OBSERVATIONS.md .planning/queue-idle.md
```

Full app validation is out of scope because this task changes only documentation and planning artifacts.

## Risks

- Risk: treating descriptive docs as executable authority.
- Mitigation: state that `AGENTS.md`, `TASK_QUEUE.md`, CI, and physical PR/git state remain authoritative.
