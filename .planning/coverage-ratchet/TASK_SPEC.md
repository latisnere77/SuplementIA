# TASK_SPEC — coverage-ratchet

Date: 2026-07-01

## Objective

Create an incremental coverage ratchet proposal by area without lowering coverage and without
editing `jest.config.js` unless required.

## Scope

In scope:

- `.planning/coverage-ratchet/**`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Product code changes.
- `jest.config.js` changes.
- Coverage threshold changes.
- Generated `coverage/` artifacts.
- Deploy, `.deploy-go`, AWS reads/writes, Lambda invoke/update, Terraform/EventBridge, feature
  flags, Bedrock, LanceDB mutation, production-content-enricher, checkout/live purchase, and real
  GitHub issues.

## Harness

```bash
npm test -- --runInBand --coverage
```

## Stop Rules

- Stop if the ratchet requires lowering any threshold.
- Stop if coverage changes require product-code edits.
- Stop if generated coverage output would need to be committed.
