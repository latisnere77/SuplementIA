# TASK_SPEC - Define Fully Autonomous Deploy Gate Protocol

Generated: 2026-06-18

## Status

Spec written. Implementation is blocked until the human replies with exact approval:

`APPROVED`

## Queue Selection

- `TASK_QUEUE.md` was read first. It contains no actionable `PENDING` tasks; T1-T14 are `DONE`.
- `TASKS.md` contains the first remaining actionable item:
  - `Define Fully Autonomous Deploy Gate Protocol`
  - current status: `IN_PROGRESS`
- This task does not require performing deploys, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flag flips, Bedrock actions, or changes to `production-content-enricher`.

## Branch And Origin Reconciliation

- `git fetch origin` was attempted before planning, per `AGENTS.md`.
- The first sandboxed fetch failed with `cannot open '.git/FETCH_HEAD': Operation not permitted`.
- The command was rerun with approved escalation and completed with exit 0.
- Current branch observed during spec: `codex/reconcile-queue-pr-state`.
- `origin/main` observed during spec: `283316e`.
- Existing uncommitted local changes before this spec:
  - `MASTER_TASK_SPEC.md`
  - `TASKS.md`
- This spec is an additive planning artifact and must not revert or rewrite those existing local changes.

## Objective

Define the governance, command allowlist, execution harness, rollback criteria, audit records, and human-stop conditions required before agents can deploy staging or production autonomously without weakening existing review controls.

The deliverable is a protocol and documentation update. It is not a staging deploy, production deploy, AWS write, infrastructure mutation, or content-enricher change.

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

Exact files that may be read, but not edited unless the approved implementation requires a focused command-map correction:

- `package.json`
- `amplify.yml`
- `.github/workflows/quality-gates.yml`
- deploy, smoke, rollback, and verification scripts under `infrastructure/**`
- deploy, smoke, rollback, and verification scripts under `scripts/**`

## Out Of Scope

- Merge to `main`
- Enabling auto-merge
- Deploying staging or production
- Running `npm run deploy`
- Running `npm run migrate`
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

## Planned Implementation

1. Inventory current release and deploy paths from existing docs, scripts, package commands, Amplify config, and CI workflows.
2. Classify commands into local validation, read-only inspection, staging/preview deploy, production deploy, rollback, smoke, and prohibited actions.
3. Define preflight gates for each deploy-capable command:
   - fresh `origin/main`
   - clean/intentional git state
   - green CI for the target SHA
   - AWS account identity check for account `643942183354` with profile `suplementai-admin`
   - rollback command exists before forward deploy
   - smoke command exists and has an unambiguous exit-0 success signal
4. Define stop conditions:
   - AWS account mismatch
   - missing rollback path
   - missing smoke path
   - ambiguous terminal output
   - repeated validation failure after three attempts
   - any path touching `production-content-enricher` or Bedrock without explicit human GO
5. Update governance docs with the smallest diff that makes the autonomous deploy gate protocol explicit.
6. Record stale, missing, or unsafe deploy paths in `OBSERVATIONS.md` instead of repairing them opportunistically.
7. Write `CHANGE_MANIFEST.md` and, if needed, `OBSERVATIONS.md` under this planning directory.
8. Mark the task `DONE` or `BLOCKED` in `TASKS.md`, commit, push a feature branch, and open/update a ready-for-review PR only after validation passes.

## Validation Plan

Validation commands to run after approval and implementation:

```bash
npm run validate
```

Expected terminal success: exit 0.

Because this task is planned as protocol/docs work and does not touch portal render, `app/[locale]/portal/**`, `seo.ts`, cards, or internal links, Playwright is not required by `AGENTS.md` section 4.

If the approved implementation unexpectedly edits portal render, SEO content, Playwright config, or consumer-facing portal copy, add:

```bash
npm run test:e2e
```

Expected terminal success: exit 0.

Before any AWS read during implementation, run:

```bash
AWS_PROFILE=suplementai-admin aws sts get-caller-identity --query Account --output text
```

Expected output: `643942183354`. Any mismatch blocks the task. No AWS write command is allowed in this task.

## Risks

- Existing deploy docs include commands that may be stale or may imply AWS writes. Those must be classified, not executed.
- The repo already has uncommitted local changes in `MASTER_TASK_SPEC.md` and `TASKS.md`; implementation must preserve and reconcile them rather than overwrite them.
- A protocol that appears to loosen human gates without concrete preflight, smoke, rollback, and audit requirements would weaken current governance and must be avoided.
- Missing deploy/rollback/smoke scripts are blockers for autonomous execution, not permission to invent broad new automation in this task.
