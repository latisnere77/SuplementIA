# CHANGE_MANIFEST — script-gate-matrix

Date: 2026-07-01

## Summary

Created a script gate matrix for infrastructure and repo scripts that can deploy, write,
delete, mutate LanceDB/Bedrock, or cross production gates.

## Files Changed

- `.planning/script-gate-matrix/TASK_SPEC.md`
- `.planning/script-gate-matrix/SCRIPT_GATE_MATRIX.md`
- `.planning/script-gate-matrix/AUDIT_FANOUT.md`
- `.planning/script-gate-matrix/CHANGE_MANIFEST.md`
- `TASKS.md`
- `.refactor-session.md`

## Validation

- `npm run gsd:invariants` — PASS (`GSD_INVARIANTS: PASS`).

## Gates

- No deploy.
- No `.deploy-go`.
- No AWS reads/writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
- No checkout/live purchase.
- No real GitHub issues.
