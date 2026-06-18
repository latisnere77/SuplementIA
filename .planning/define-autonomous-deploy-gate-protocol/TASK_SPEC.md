# TASK_SPEC - Define Fully Autonomous Deploy Gate Protocol

Generated: 2026-06-18
Updated: 2026-06-18

## Status

Blocked during approved harness loop.

The human approved this spec on 2026-06-18. Local `npm run validate` returned exit 0, but
`npm run test:e2e` returned exit 1 with 41 failures in `e2e/portal.spec.ts`. The failure
pattern is a portal runtime `JSON.parse` error on `/[locale]/portal/**` routes and missing
portal UI elements. Fixing those portal routes is outside this deploy-gate governance task.

## Queue Selection

- `AGENTS.md` was read.
- `TASKS.md` was read as the active backlog for this turn.
- The first task that is not `HECHO`, `DONE`, `ESPERA MI GO`, or `ESPERA GATE HUMANO` is:
  - `Define Fully Autonomous Deploy Gate Protocol`
  - status before this refresh: `IN_PROGRESS`
  - status after this refresh: `EN CURSO`
- This task is actionable only as governance/documentation work. It must not execute or
  authorize a deploy, AWS write, Lambda invoke/update, Terraform/EventBridge action, feature
  flag flip, Bedrock action, or `production-content-enricher` change.

## Branch And Origin Reconciliation

- `git fetch origin` completed with exit 0.
- Current branch: `chore/autonomous-deploy-gate-protocol`.
- `HEAD`: `12573a8`.
- `origin/main`: `283316e`.
- Branch relation to `origin/main`: 0 behind, 16 ahead.
- Existing uncommitted local change before this Spec-Gate refresh:
  - `OBSERVATIONS.md`
- This refresh must preserve that existing `OBSERVATIONS.md` change and must not treat it as
  newly authored work for this Spec-Gate.
- Existing planning artifacts indicate the governance implementation was previously completed
  and validated, with the next safe action recorded as PR handoff. The current human instruction
  supersedes that flow for this turn: stop after Spec-Gate and wait for `APPROVED`.

## Objective

Define the governance, command allowlist, execution harness, rollback criteria, audit records,
and human-stop conditions required before agents can deploy staging or production autonomously
without weakening existing review controls.

The deliverable is a protocol/documentation update and local handoff. It is not a deploy,
infrastructure mutation, AWS write, or production operation.

## In Scope

Exact files that may be edited after approval:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `TASKS.md`
- `OBSERVATIONS.md`
- `MASTER_TASK_SPEC.md`
- `.planning/define-autonomous-deploy-gate-protocol/**`
- `docs/aws-production-alignment-runbook.md`
- `docs/portal-release-hardening-checklist.md`
- `infrastructure/DEPLOYMENT-SCRIPTS-README.md`
- `infrastructure/DEPLOYMENT_GUIDE.md`
- `infrastructure/STAGING-DEPLOYMENT-GUIDE.md`
- `infrastructure/PRODUCTION-ROLLOUT-GUIDE.md`
- `infrastructure/ROLLBACK_PROCEDURES.md`

Exact files that may be read, but not edited unless the approved implementation requires a
focused command-map correction:

- `package.json`
- `amplify.yml`
- `.github/workflows/quality-gates.yml`
- deploy, smoke, rollback, and verification scripts under `infrastructure/**`
- deploy, smoke, rollback, and verification scripts under `scripts/**`

## Out Of Scope

- Merge to `main`
- Push to `main`
- Enabling auto-merge
- Opening production deploys or staging deploys without a task-specific human GO
- Running `npm run deploy`
- Running migrations
- Starting Amplify jobs
- AWS writes of any kind
- Lambda invoke/update
- Terraform/EventBridge changes
- Feature flag flips
- Bedrock calls or configuration changes
- Any `production-content-enricher` code, config, invocation, deployment, or cache changes
- Dependency upgrades
- Product feature changes
- Portal/category/SEO render changes
- Broad refactors, folder moves, shared utility extraction, or formatting churn

## Planned Harness Loop After APPROVED

1. Re-read `TASKS.md`, the current git state, and this spec.
2. Preserve unrelated local changes unless they are explicitly in scope and necessary.
3. If implementation already exists on this branch, verify it against this spec instead of
   duplicating work.
4. Run the validation commands below and require explicit exit 0.
5. Autocorrect only failures that are within scope, with a maximum of three retries for the
   same failing command/error.
6. Commit locally with a Conventional Commit message.
7. Update `TASKS.md` state according to the result.
8. Report the local commit and validation status.
9. Continue to the next actionable task only after this task is locally closed.

## Harness Result

- `npm run validate` -> exit 0.
  - type-check passed.
  - build passed.
  - Jest passed: 111 passed suites, 2 skipped; 831 passed tests, 15 skipped.
- `npm run test:e2e` -> exit 1.
  - 41 failed.
  - 78 skipped.
  - 3 passed.
  - Representative failure: `SyntaxError: Unexpected non-whitespace character after JSON at
    position 2061 (line 1 column 2062)` while rendering portal pages such as `/es/portal`,
    `/en/portal/results`, `/en/portal/category/sleep`, and
    `/en/portal/supplement/magnesium`.
- Result: task marked `BLOCKED` because the required e2e arnes did not return exit 0 and the
  failing surface is outside this task's approved scope.

## Validation Commands

Required after approval:

```bash
npm run validate
```

Expected result: exit 0.

Because this task is governance/documentation work and should not touch portal render,
`app/[locale]/portal/**`, `seo.ts`, cards, or internal links, Playwright is not required by
`AGENTS.md` section 4. If the approved work unexpectedly edits those surfaces, also run:

```bash
npm run test:e2e
```

Expected result: exit 0.

No AWS read is planned. If an approved implementation later requires AWS read-only inspection,
first verify identity:

```bash
AWS_PROFILE=suplementai-admin aws sts get-caller-identity --query Account --output text
```

Expected output: `643942183354`. Any mismatch blocks the task. No AWS write command is allowed.

## Risks

- Current branch already contains substantial prior governance commits; the post-approval loop
  should verify and finish them rather than duplicate protocol text.
- `TASKS.md` and planning artifacts previously diverged on whether this task was merely in
  progress or ready for PR handoff.
- `OBSERVATIONS.md` has a pre-existing uncommitted modification that must not be overwritten.
- Missing deploy, smoke, monitor, or rollback scripts are blockers for autonomous deployment,
  not permission to invent broad automation inside this task.
