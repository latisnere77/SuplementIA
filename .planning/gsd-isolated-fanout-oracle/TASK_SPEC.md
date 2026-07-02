# TASK_SPEC - gsd-isolated-fanout-oracle

Date: 2026-07-01

## Objective

Require independent fan-out evidence in the DONE oracle so audit PASS cannot be only writer-
authored tokens.

## Scope

In scope:

- `scripts/gsd/done-oracle.mjs`
- `scripts/gsd/__tests__/done-oracle.test.js`
- `scripts/gsd/oracle-benchmark.mjs`
- `docs/oracle-benchmark-fixtures.json`
- `docs/done-criteria.md`
- `.planning/gsd-isolated-fanout-oracle/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Product runtime code.
- Portal/render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Harness

```bash
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/done-oracle.test.js && npm run gsd:invariants
```

## TDD Red Checkpoint

Add failing tests first for missing isolated fan-out evidence. Expected failure before
implementation: an audit file with only PASS tokens still passes.

Observed red result before implementation:

```text
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/done-oracle.test.js
Expected: 1
Received: 0
fails when fan-out pass tokens lack isolation evidence
```

## Substitution Test

If isolated fan-out evidence is not required, a writer can stamp PASS tokens without any
machine-readable indication of independent review, so the task still fails.

## Design

- Keep existing PASS token requirements.
- Add explicit required tokens for reviewer/verifier/smoke isolation:
  - `REVIEWER_ISOLATED: YES`
  - `VERIFIER_ISOLATED: YES`
  - `SMOKE_TESTER_ISOLATED: YES`
- Update `docs/done-criteria.md` so the human-readable oracle matches code.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out for test adequacy, DONE oracle behavior,
docs/code parity, local-only behavior, and no production gate crossing.
