# TASK_SPEC - Observations Addenda Cleanup

Generated: 2026-06-22

## Status

`APPROVED`

Human assigned this task directly after the queue was found idle, then approved execution.
This is not a product feature task and does not authorize deploy, AWS writes, migrations,
Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock, or
`production-content-enricher` changes.

## Objective

Normalize the uncommitted `OBSERVATIONS.md` audit addenda so the working tree does not
accidentally commit multiple stale, redundant dated snapshots. Keep the current actionable
findings while removing or consolidating stale duplicate addenda from the uncommitted diff.

## Current State Reconciliation

- `git fetch origin` completed with exit 0 before writing this spec.
- Current branch: `chore/autonomous-deploy-gate-protocol`
- `HEAD`: `8153a41`
- `origin/main`: `283316e`
- Local branch relation: `0 29` from `git rev-list --left-right --count origin/main...HEAD`
  (0 behind, 29 ahead of refreshed local `origin/main`).
- Working tree before this spec:
  - `OBSERVATIONS.md` modified with 356 inserted lines.
  - The diff contains three uncommitted addenda: 2026-06-18 Approved Follow-Up,
    2026-06-19, and 2026-06-21.
- The changed file is already on the open PR #181 branch. Because the task is to clean up
  that exact dirty local edit, the safest flush path is to update PR #181 on the current
  branch rather than switch away and risk losing or splitting the uncommitted observation
  history.

## In Scope

- `OBSERVATIONS.md`
  - Collapse the three uncommitted dated addenda into one current, concise addendum.
  - Preserve the accurate findings:
    - deploy/migration/runbook paths remain human-gated and need reconciliation;
    - `services/content-enricher/src/**` remains governed and broadly `@ts-nocheck`;
    - planning artifacts contain stale snapshots despite idle queue;
    - `npm run validate` is not a browser gate;
    - root type-check excludes some operational/test trees;
    - root README is absent.
  - Remove stale per-session `HEAD`/ahead-count snapshots except where needed to explain
    why stale snapshots are a risk.
- `.planning/observations-addenda-cleanup/TASK_SPEC.md`
- `.planning/observations-addenda-cleanup/CHANGE_MANIFEST.md`

## Out Of Scope

- Product code changes.
- `TASK_QUEUE.md`, unless a later approved queue-management task explicitly asks to promote
  this cleanup or follow-up work into the queue.
- `TASKS.md`, `MASTER_TASK_SPEC.md`, `PROJECT_CONTEXT.md`, or deploy/runbook docs.
- Removing local directories or generated artifacts.
- Running deploys, migrations, AWS reads/writes, Amplify jobs, Lambda invoke/update,
  Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation, or
  `production-content-enricher` code/config/invocation/deploy changes.
- Merge to `main` or enabling auto-merge.

## Planned Edits

1. Replace the three uncommitted `OBSERVATIONS.md` addenda with a single addendum dated
   2026-06-22.
2. Keep severity-tier structure (`Critical`, `High`, `Medium`, `Low`) and the existing
   `Risk` / `Containment` house style.
3. Write `CHANGE_MANIFEST.md` after edits and validation.
4. Commit with a docs-oriented Conventional Commit.
5. Push the current branch and update/open PR #181 as ready for review. If GitHub indicates
   a different PR is the correct target for this branch, update that PR instead of opening a
   duplicate.

## Validation Plan

Docs-only validation:

```bash
git diff --check
rg -n "Read-Only Audit Addendum - 2026-06-18 Approved Follow-Up|Read-Only Audit Addendum - 2026-06-19|Read-Only Audit Addendum - 2026-06-21" OBSERVATIONS.md
rg -n "Current Audit Addendum - 2026-06-22" OBSERVATIONS.md
git status --short --branch
```

Expected terminal state:

- `git diff --check` returns exit 0.
- The stale-addenda `rg` command returns exit 1 with no matches.
- The 2026-06-22 `rg` command returns exit 0.
- `git status --short --branch` shows only intended task files before commit, then clean
  after commit/push except for unrelated pre-existing files if any appear.

No `npm run lint`, `npm run type-check`, `npm test`, `npm run build`, or Playwright run is
planned because the task is Markdown-only and does not touch portal render, SEO code, cards,
internal links, runtime code, or tests.

## Risks And Controls

- Risk: accidentally committing stale 2026-06-18 / 2026-06-19 / 2026-06-21 blocks.
  Control: explicit `rg` validation requires those headings to be absent.
- Risk: losing accurate findings while deduplicating.
  Control: preserve the specific findings listed in In Scope.
- Risk: mixing this docs cleanup with product or deploy work.
  Control: do not edit outside the listed files and do not run gated commands.
- Risk: branch hygiene differs from the standard "new branch from origin/main" flow because
  the dirty edit already exists on PR #181's branch.
  Control: document the reconciliation here and update the existing PR branch rather than
  creating a duplicate branch with copied local changes.

## Approval Gate

Human approval received.
