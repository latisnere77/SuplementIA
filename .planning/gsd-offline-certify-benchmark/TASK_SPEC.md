# TASK_SPEC - gsd-offline-certify-benchmark

Date: 2026-07-01

## Objective

Integrate the GSD oracle benchmark into `offline-certify --quick` so quick certification
checks the executable DONE oracle corpus by default.

## Scope

In scope:

- `scripts/gsd/offline-certify.mjs`
- `scripts/gsd/__tests__/offline-certify.test.js`
- `scripts/gsd/__tests__/invariant-ratchet.test.js`
- `.planning/gsd-offline-certify-benchmark/**`
- `TASKS.md`

Out of scope:

- Product runtime code.
- Portal/render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Harness

```bash
npm run gsd:offline-certify -- --quick && node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json
```

## Substitution Test

If `offline-certify --quick` does not run the oracle benchmark, quick certification can pass
while the DONE oracle benchmark is broken.

## Design

- Keep existing invariants first.
- In `--quick` mode, run `node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json`
  before printing `GSD_OFFLINE_CERTIFY: PASS quick`.
- Update invariant fixture coverage for the new required script if needed.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out for quick-mode behavior, local-only
execution, no product/runtime impact, and no production gate crossing.
