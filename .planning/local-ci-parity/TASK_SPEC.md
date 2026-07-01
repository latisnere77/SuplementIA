# TASK_SPEC — local-ci-parity

Date: 2026-07-01

## Objective

Confirm the local CI-equivalent harness and document gaps against `.github/workflows/quality-gates.yml`,
including `npm audit` and the `RUN_REAL_SEARCHES=1` browser matrix.

## Scope

In scope:

- `.planning/local-ci-parity/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- CI workflow edits.
- Dependency updates.
- Product code changes.
- Running live production smokes.
- Deploy, `.deploy-go`, AWS reads/writes, Lambda invoke/update, Terraform/EventBridge, feature
  flags, Bedrock, LanceDB mutation, production-content-enricher, checkout/live purchase, and real
  GitHub issues.

## Harness

```bash
npm run gsd:invariants && npm run lint && npm run type-check && npm run build && npm test -- --runInBand && npm run test:e2e
```

## Stop Rules

- Stop on first non-zero exit from the harness.
- Do not change CI in this task.
- Do not run the real-search matrix unless it is separately selected or included in an explicit
  harness.
