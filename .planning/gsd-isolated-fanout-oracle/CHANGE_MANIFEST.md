# CHANGE_MANIFEST - gsd-isolated-fanout-oracle

Date: 2026-07-01

## Summary

Strengthened the GSD DONE oracle to require explicit isolated fan-out evidence for reviewer,
verifier, and smoke tester. Updated tests, DONE criteria, and the oracle benchmark fixtures so
code, docs, and benchmark share the same closure contract.

## Files Changed

- `scripts/gsd/done-oracle.mjs`
- `scripts/gsd/__tests__/done-oracle.test.js`
- `scripts/gsd/oracle-benchmark.mjs`
- `docs/oracle-benchmark-fixtures.json`
- `docs/done-criteria.md`
- `.planning/gsd-isolated-fanout-oracle/TASK_SPEC.md`
- `.planning/gsd-isolated-fanout-oracle/CHANGE_MANIFEST.md`
- `.planning/gsd-isolated-fanout-oracle/AUDIT_FANOUT.md`
- `TASKS.md`
- `.refactor-session.md`

## Validation

- TDD red checkpoint - PASS: before implementation, `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/done-oracle.test.js` failed because audits with PASS tokens but no isolation tokens still exited 0 (`Expected: 1`, `Received: 0`).
- `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/done-oracle.test.js && npm run gsd:invariants` - PASS (1 suite, 5 tests; `GSD_INVARIANTS: PASS`).
- `node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json` - PASS (`ORACLE_BENCHMARK: PASS 4 cases`).
- Read-only verifier - PASS for implementation evidence.
- Read-only smoke tester - PASS.
- Read-only reviewer - PASS for code/docs/benchmark parity after closure evidence remediation.

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
