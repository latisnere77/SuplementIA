# CHANGE_MANIFEST - gsd-debounce-hook

Date: 2026-07-01

## Summary

Implemented a physical DebounceHook for repeated command detection. The hook enforces a
hard max of two identical normalized commands per session; environment configuration can
only make the threshold stricter.

## Files Changed

- `.planning/gsd-debounce-hook/TASK_SPEC.md`
- `.planning/gsd-debounce-hook/CHANGE_MANIFEST.md`
- `.planning/gsd-debounce-hook/AUDIT_FANOUT.md`
- `scripts/gsd/tool-budget-policy.mjs`
- `scripts/gsd/__tests__/tool-budget-policy.test.js`
- `.codex/hooks.json`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

## Validation

- `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:invariants` - PASS (1 suite, 7 tests; `GSD_INVARIANTS: PASS`).
- Read-only fan-out - PASS after hard-max remediation.

## Gates

- No merge.
- No deploy.
- No `.deploy-go`.
- No AWS.
- No Lambda/Terraform/EventBridge.
- No Bedrock/LanceDB.
- No checkout/live purchase.
- No `production-content-enricher`.
- No real GitHub issues.
