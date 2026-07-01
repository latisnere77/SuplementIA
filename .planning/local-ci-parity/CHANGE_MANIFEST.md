# CHANGE_MANIFEST — local-ci-parity

Date: 2026-07-01

## Summary

Documented local CI parity and differences from GitHub Actions after the TASKS harness passed.

## Files Changed

- `.planning/local-ci-parity/TASK_SPEC.md`
- `.planning/local-ci-parity/CI_PARITY.md`
- `.planning/local-ci-parity/AUDIT_FANOUT.md`
- `.planning/local-ci-parity/CHANGE_MANIFEST.md`
- `TASKS.md`
- `.refactor-session.md`

## Validation

- `npm run gsd:invariants && npm run lint && npm run type-check && npm run build && npm test -- --runInBand && npm run test:e2e` — PASS.

## Gates

- No CI workflow change.
- No product code change.
- No deploy.
- No `.deploy-go`.
- No AWS reads/writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flags.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
- No checkout/live purchase.
- No real GitHub issues.
