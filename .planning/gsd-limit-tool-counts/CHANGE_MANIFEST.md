# CHANGE_MANIFEST - gsd-limit-tool-counts

Date: 2026-07-01

## Summary

Implemented physical per-session `LimitToolCounts` enforcement in the existing GSD tool
budget hook. The hook now enforces hard maxima for `exec`, `git`, and `apply_patch`, with
environment configuration allowed only to make limits stricter.

## Files Changed

- `scripts/gsd/tool-budget-policy.mjs`
- `scripts/gsd/__tests__/tool-budget-policy.test.js`
- `.codex/hooks.json`
- `.planning/gsd-limit-tool-counts/TASK_SPEC.md`
- `.planning/gsd-limit-tool-counts/CHANGE_MANIFEST.md`
- `.planning/gsd-limit-tool-counts/AUDIT_FANOUT.md`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

## Validation

- `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:done -- --check-config-only` - PASS (1 suite, 12 tests; `GSD_INVARIANTS: PASS`; `GSD_DONE: PASS config-only`).
- Read-only verifier - PASS.
- Read-only smoke tester - PASS.
- Read-only reviewer - PASS after manifest/scope/test remediation.

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
