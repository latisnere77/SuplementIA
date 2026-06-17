# TASK_SPEC - Add Context Reset Governance Rule

Generated: 2026-06-17

## Objective

Add an explicit context-reset rule to `AGENTS.md` so agents rebuild state from current repo and PR facts after each FLUSH.

## Reconciliation Against `origin/main`

- `origin/main:AGENTS.md` ends at section 6 and does not include the reset rule.
- Local `PROJECT_CONTEXT.md` identified this as an approved governance gap.
- The current human-approved `MASTER_TASK_SPEC.md` includes this task in the active batch.

## IN SCOPE

- `AGENTS.md`
- `TASKS.md`
- `.planning/context-reset-governance-rule/**`

## OUT OF SCOPE

- Runtime code
- Product behavior
- Validation script changes
- Queue status changes unrelated to this task
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Add section 7 to `AGENTS.md`.
2. Require context reconstruction from `TASK_QUEUE.md`, physical git/PR state, relevant `.planning/<task>/`, and current source files.
3. Mark the task complete in `TASKS.md`.
4. Record manifest and handoff.

## Validation Harness

```bash
git diff --check
rg -n "RESET DE CONTEXTO ENTRE TAREAS|reconstruye el contexto" AGENTS.md
```

Full app validation is out of scope because this is governance documentation only.

## Risks

- Risk: future agents may over-trust stale planning docs.
- Mitigation: the rule explicitly prioritizes current queue, git/PR state, planning files, and source files.
