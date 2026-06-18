# MASTER_TASK_SPEC - Fully Autonomous Deploy Gate Protocol

Generated: 2026-06-18

## Checkpoint Status

`TASKS.md` contained one task in `ESTADO: TODO`:

- `Define Fully Autonomous Deploy Gate Protocol`

The coordinator has claimed it by moving the task to `ESTADO: IN_PROGRESS`.

No delegation, implementation edits beyond this planning artifact, branch creation, commit, push, PR update, staging deploy, production deploy, AWS write, Lambda invoke/update, Terraform/EventBridge action, feature flag change, Bedrock action, or `production-content-enricher` change will start until the human checkpoint word `APPROVED` is received after this plan.

## Mission

Define the governance and execution protocol that must exist before agents can deploy staging or production autonomously while preserving the current review, audit, rollback, and safety controls.

The deliverable is a protocol and command map, not an immediate production deployment. Any later execution loop must be based on commands that have explicit preflight checks, execution harnesses, smoke tests, rollback paths, and audit records.

## Governance Reconciliation

- `AGENTS.md` remains the highest local protocol unless explicitly amended by an approved governance task.
- Current `AGENTS.md` gates deploys, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock, and `production-content-enricher`.
- The current task is allowed to propose and document a future autonomous deploy protocol.
- The current task is not allowed to perform production deploys or AWS writes as part of planning.
- `TASKS.md` is an assigned governance backlog for this run because the human explicitly asked to claim the task.
- `TASK_QUEUE.md` remains the product execution queue and is out of scope except for read-only consistency checks.

## Implementation Plan

1. Inventory current deploy and release paths.
   - Read `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/aws-production-alignment-runbook.md`, `docs/portal-release-hardening-checklist.md`, `amplify.yml`, `.github/workflows/quality-gates.yml`, `package.json`, and relevant infrastructure docs/scripts.
   - Confirm which commands are live production release paths versus stale or blocked infra paths.

2. Define command allowlist tiers.
   - Tier 0: local validation and browser tests.
   - Tier 1: read-only AWS/GitHub inspection.
   - Tier 2: staging or preview deploy actions.
   - Tier 3: production deploy, rollback, and env mutation actions.
   - Tier 4: prohibited actions that still require human gates, especially destructive operations, Bedrock/content-enricher mutations, and irreversible infra changes.

3. Define preflight gates for every deploy-capable command.
   - Git state checks against fresh `origin/main`.
   - CI status checks for the target SHA.
   - AWS identity check pinned to account `643942183354` and profile `suplementai-admin`.
   - Environment variable and endpoint checks.
   - Confirmation that rollback commands exist and are executable before forward deploy.

4. Define execution harnesses.
   - Local harness: lint, type-check, build, Jest, Playwright.
   - Preview/staging harness: exact deploy command, smoke command, expected exit-0 signal, and failure log location.
   - Production harness: exact deploy/redeploy command, production smoke command, monitoring window, rollback trigger thresholds, and audit log path.

5. Define rollback and stop conditions.
   - Maximum three retries per repeated failure.
   - Immediate stop on account mismatch, unknown deploy target, missing rollback, missing smoke, unsafe health claim, production-content-enricher/Bedrock path, or ambiguous terminal output.
   - Required handoff and observation records for blocked states.

6. Update governance docs with the smallest possible diff.
   - Add the autonomous deploy protocol without rewriting existing governance wholesale.
   - Preserve the current no-merge rule unless explicitly superseded by the final approved protocol.
   - Keep existing human-review controls visible.

7. Validate documentation and protocol consistency.
   - Run validation commands that do not perform deploys or AWS writes.
   - If any command mapping references missing scripts/templates, record that as debt in `OBSERVATIONS.md` and keep the related deploy path blocked until repaired.

8. Flush the task after approval and implementation.
   - Write `.planning/define-autonomous-deploy-gate-protocol/CHANGE_MANIFEST.md`.
   - Write `.planning/define-autonomous-deploy-gate-protocol/HANDOFF.md`.
   - Mark the task `DONE` or `BLOCKED` in `TASKS.md`.
   - Commit and prepare a PR only after validation passes.

## Global IN SCOPE

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
- `package.json` for script mapping
- `amplify.yml` for Amplify build mapping
- `.github/workflows/quality-gates.yml` for CI gate mapping
- deploy, smoke, rollback, and verification scripts under `infrastructure/**` and `scripts/**` for read-only mapping unless the approved implementation spec explicitly authorizes focused edits

## Global OUT OF SCOPE

- Merge to `main`
- Enabling auto-merge
- Running `npm run deploy`
- Running `npm run migrate`
- Starting Amplify jobs
- Production deploys
- Staging deploys that create/update/delete AWS resources
- AWS writes of any kind during planning
- Lambda invoke/update
- Terraform/EventBridge changes
- Feature flag flips
- Bedrock calls or config changes
- `production-content-enricher` code, config, invocation, deployment, or cache changes
- Dependency upgrades
- Broad refactors, folder moves, shared utility extraction, or formatting churn
- Product feature changes
- SEO/content changes unrelated to the deploy protocol

## Delegation Strategy And Context Isolation

Delegation starts only after `APPROVED`.

The coordinator will keep the task serialized because it is governance-sensitive. Sub-agents may be used only for bounded read-only analysis or focused document edits, and each receives only the files needed for its slice.

| Workstream | Model routing | Isolated context bundle | Output |
| --- | --- | --- | --- |
| Governance coordination | Opus | `AGENTS.md`, `PROJECT_CONTEXT.md`, `TASKS.md`, this `MASTER_TASK_SPEC.md` | Final protocol shape and stop conditions |
| File navigation and command inventory | Haiku | `package.json`, `amplify.yml`, `.github/workflows/quality-gates.yml`, `infrastructure/**` script/doc names, `scripts/**` script/doc names | Command map and missing-artifact list |
| Implementation edits | Sonnet | Only the specific docs selected by the coordinator after inventory | Minimal diffs to protocol docs |
| Final governance/code review | GPT-5.2 | Final diff, validation outputs, `OBSERVATIONS.md`, `CHANGE_MANIFEST.md` | Review findings before commit/PR |

No sub-agent may receive secrets, `.env.local`, AWS credentials, presigned URLs, or production logs containing private values.

## Validation Harness

### Pre-Implementation State

```bash
git fetch origin
git status --short --branch
git diff --name-only origin/main...HEAD
```

### Local Validation

For protocol-only documentation edits:

```bash
npm run validate
```

If edits touch portal render, release smoke scripts, Playwright config, `app/[locale]/portal/**`, `seo.ts`, or consumer-facing copy:

```bash
npm run test:e2e
```

### Preview Environment Harness

For this planning task, the only preview environment allowed before the protocol is approved is the local Playwright-managed Next.js server:

```bash
npm run test:e2e
```

The Playwright web server command is defined in `playwright.config.ts` and uses:

```bash
JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false npm run dev -- --hostname 127.0.0.1 --port 3100
```

Any AWS-backed staging deploy command remains blocked until the protocol defines its exact preflight, smoke, rollback, and audit harness.

### AWS Read-Only Identity Preflight

Before any AWS read in the implementation phase:

```bash
AWS_PROFILE=suplementai-admin aws sts get-caller-identity --query Account --output text | grep -q '^643942183354$'
```

This command must return exit 0. Account mismatch is an immediate stop condition.

### Production Harness To Document, Not Execute During Planning

Candidate production alignment commands to document and gate:

```bash
gh run list --branch main --limit 5 --json databaseId,workflowName,status,conclusion,createdAt,headSha
gh run watch <run-id> --exit-status
AWS_PROFILE=suplementai-admin aws amplify get-branch --app-id d2yn3faih4ykom --branch-name main --region us-east-1
AWS_PROFILE=suplementai-admin aws amplify start-job --app-id d2yn3faih4ykom --branch-name main --region us-east-1 --job-type RELEASE --job-reason "Redeploy latest green main"
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

The final protocol must classify which of these are read-only, deploy, smoke, or rollback-adjacent and define exactly when an autonomous agent may run them.

### Retry And Failure Policy

- Maximum three retries for the same repeated validation or deploy-harness failure.
- After the third repeated failure, mark the task `BLOCKED`, record logs in `.planning/define-autonomous-deploy-gate-protocol/OBSERVATIONS.md`, and stop this task.
- Ambiguous output is failure.
- Missing script/template for a documented deploy path is `BLOCKED_BY_MISSING_ARTIFACTS` unless the approved spec explicitly includes repairing it.

## Expected Deliverables After Approval

- Updated governance docs with a concrete autonomous deploy gate protocol.
- Updated `OBSERVATIONS.md` for any blocked or stale deploy paths discovered.
- `.planning/define-autonomous-deploy-gate-protocol/CHANGE_MANIFEST.md`
- `.planning/define-autonomous-deploy-gate-protocol/HANDOFF.md`
- `TASKS.md` marked `DONE` or `BLOCKED`.

## Approval Gate

Required exact word before implementation, delegation, validation beyond planning, or any deploy-protocol edits:

`APPROVED`
