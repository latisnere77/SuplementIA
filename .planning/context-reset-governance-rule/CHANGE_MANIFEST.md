# CHANGE_MANIFEST - Add Context Reset Governance Rule

## Status

Done in PR #180: https://github.com/latisnere77/SuplementIA/pull/180

## Files Changed

- `AGENTS.md`
- `TASKS.md`
- `.planning/context-reset-governance-rule/TASK_SPEC.md`
- `.planning/context-reset-governance-rule/CHANGE_MANIFEST.md`
- `.planning/context-reset-governance-rule/HANDOFF.md`

## Validation

- `git diff --check`
- `rg -n "RESET DE CONTEXTO ENTRE TAREAS|reconstruye el contexto" AGENTS.md`

## Notes

- The rule is governance-only and does not alter runtime behavior.
