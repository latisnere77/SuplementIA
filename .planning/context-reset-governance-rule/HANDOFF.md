# HANDOFF - Add Context Reset Governance Rule

## Physical State

- Branch: `codex/reconcile-queue-pr-state`
- PR: #180 https://github.com/latisnere77/SuplementIA/pull/180
- Base: `main`
- Status: ready for review

## Changes

- Added `AGENTS.md` section 7 requiring context reconstruction after each FLUSH.
- `TASKS.md` marks this task as `DONE (PR #180)`.

## Validation

Passed:

```bash
git diff --check
rg -n "RESET DE CONTEXTO ENTRE TAREAS|reconstruye el contexto" AGENTS.md
```

## Gates

- No runtime source changed.
- No merge performed.
- No deploy performed.
- No AWS, Lambda, Terraform, EventBridge, Bedrock, or feature flag changes.

## Next Safe Action

Continue with `Audit Duplicate Files With Space-Two Suffix`.
