# TASK_SPEC - gsd-pre-tool-policy-coverage

Date: 2026-07-01

## Objective

Add executable coverage for `scripts/gsd/pre-tool-policy.mjs`, proving it allows safe local
commands and blocks merge, deploy, `.deploy-go`, AWS write, Terraform write, Bedrock/enricher,
LanceDB mutation, and destructive `rm -rf` paths.

## Scope

In scope:

- `scripts/gsd/__tests__/pre-tool-policy.test.js`
- `.planning/gsd-pre-tool-policy-coverage/**`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

Out of scope:

- Product runtime code.
- Policy behavior changes unless tests reveal a real fail-open/fail-closed issue.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Harness

```bash
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/pre-tool-policy.test.js
```

## Substitution Test

If these tests are absent, the pre-tool policy can silently stop blocking high-risk commands or
start blocking safe local/read-only commands without focused Jest coverage.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out review for scope, policy coverage, and local-only
execution before marking DONE.
