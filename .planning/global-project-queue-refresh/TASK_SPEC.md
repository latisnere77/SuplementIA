# TASK_SPEC - Global Project Queue Refresh

Generated: 2026-06-19

## Task

Refresh the autonomous execution queue after the previous queue reached idle. Build a small,
Codex-friendly backlog from the current repository objective, architecture, tests, and existing
audit observations, then continue with the first non-gated task.

## Product Objective Reconciliation

SuplementAI is a bilingual Next.js supplement portal that helps users search for supplements,
conditions, and evidence-backed recommendations. The system combines localized consumer pages,
curated SEO/category content, local deterministic search fallbacks, optional LanceDB/Lambda search,
async enrichment, Stripe subscription flows, and governed AWS/Bedrock infrastructure.

The current autonomous priority is to improve reliability and operability without crossing human
gates. Work should favor portal UX stability, log hygiene, local validation isolation, and stale
runbook cleanup. AWS writes, deploys, migrations, Lambda invoke/update, Bedrock paths, and
`production-content-enricher` remain gated.

## IN SCOPE

- Read-only audit of:
  - `AGENTS.md`
  - `TASK_QUEUE.md`
  - `TASKS.md`
  - `PROJECT_CONTEXT.md`
  - `OBSERVATIONS.md`
  - `package.json`
  - `app/[locale]/portal/**`
  - `app/api/portal/**`
  - `lib/portal/**`
  - `lib/search-service.ts`
  - `docs/portal-api-logging-classification.md`
  - `docs/search-backend-contracts.md`
  - `e2e/portal.spec.ts`
- Queue/spec edits:
  - `TASK_QUEUE.md`
  - `.planning/global-project-queue-refresh/TASK_SPEC.md`
  - `.planning/global-project-queue-refresh/CHANGE_MANIFEST.md`

## OUT OF SCOPE

- Product code edits for this discovery task.
- Merge to `main`.
- Deploys, AWS writes, AWS reads, Lambda invoke/update, Terraform/EventBridge, migrations,
  feature flags, Bedrock, LanceDB mutation, or `production-content-enricher`.
- Dependency upgrades.
- Broad refactors or utility extraction.
- Editing pre-existing uncommitted changes in `OBSERVATIONS.md`.

## Queue Output Rules

- Add only tasks that are independently actionable from local code context.
- Each task must name exact IN SCOPE and OUT OF SCOPE files/areas.
- Each task must define validation with expected exit 0.
- Tasks touching `app/[locale]/portal/**`, SEO/category render, cards, or internal links must
  require local Playwright per `AGENTS.md` section 4.
- Tasks that would require AWS writes, deploy, migration, Bedrock, or `production-content-enricher`
  must either be excluded or explicitly marked human-gated/BLOCKED.

## Validation

Discovery/queue-only validation:

```bash
git fetch origin
git status --short --branch
rg -n "PENDING|DONE|BLOCKED|IN_PROGRESS" TASK_QUEUE.md
```

Expected terminal state:

- Commands return exit 0.
- `TASK_QUEUE.md` contains a new ordered backlog with the discovery task marked `DONE` after
  PR creation, and at least one subsequent `PENDING` task that can run without a human gate.

## Risks

- Current branch contains governance commits ahead of `origin/main`; physical state and open PRs
  must remain authoritative over stale dated audit snapshots.
- `OBSERVATIONS.md` is modified before this task. This task must not stage or overwrite it.
- Product tasks derived from debug logging can become broad quickly; split client portal logs,
  results page logs, API logs, and debug routes into separate tasks.
