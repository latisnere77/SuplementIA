# TASK_SPEC - gsd-oracle-script-coverage

Date: 2026-07-01

## Objective

Add executable coverage for `scripts/gsd/invariant-ratchet.mjs` and
`scripts/gsd/done-oracle.mjs`, the current closure oracle for local autonomous tasks.

## Scope

In scope:

- `scripts/gsd/__tests__/invariant-ratchet.test.js`
- `scripts/gsd/__tests__/done-oracle.test.js`
- `.planning/gsd-oracle-script-coverage/**`
- `PROJECT_CONTEXT.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

Out of scope:

- Product runtime code.
- Portal render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.
- Changing oracle behavior unless tests reveal a real failing contract.

## Harness

```bash
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/invariant-ratchet.test.js scripts/gsd/__tests__/done-oracle.test.js
```

## Substitution Test

If these tests are absent, future changes to the GSD closure oracle can weaken required files,
required invariant tokens, `.deploy-go` blocking, or audit fan-out validation without focused
Jest coverage.

## Branch Reconciliation

This task is stacked on the local `codex/autonomous-edo-task-loop` branch, which already contains
earlier Phase 2 EDO audit commits against `origin/main`. Review this task's active scope using the
current working-tree diff, not the full accumulated `origin/main...HEAD` branch diff. Prior commits
that touched product/runtime files are not edited by this task.

## Fan-Out Plan

After the harness exits 0, run read-only verification against the created tests and changed
files, then record `AUDIT_FANOUT.md` with reviewer/verifier/smoke-tester PASS tokens and
`WRITER_SELF_APPROVAL: NO`.
