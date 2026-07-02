# CHANGE_MANIFEST - gsd-offline-certify-benchmark

Date: 2026-07-01

## Summary

Integrated the oracle benchmark into `offline-certify --quick` and added direct regression
coverage for quick-mode ordering: invariants, then oracle benchmark, then quick PASS.

## Files Changed

- `scripts/gsd/offline-certify.mjs`
- `scripts/gsd/__tests__/offline-certify.test.js`
- `scripts/gsd/__tests__/invariant-ratchet.test.js`
- `.planning/gsd-offline-certify-benchmark/TASK_SPEC.md`
- `.planning/gsd-offline-certify-benchmark/CHANGE_MANIFEST.md`
- `.planning/gsd-offline-certify-benchmark/AUDIT_FANOUT.md`
- `TASKS.md`

## Validation

- `npm run gsd:offline-certify -- --quick && node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json` - PASS.
- `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/offline-certify.test.js` - PASS (1 suite, 1 test).
- Read-only verifier - PASS.
- Read-only smoke tester - PASS.
- Read-only reviewer - PASS after direct regression coverage and scope remediation.

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
