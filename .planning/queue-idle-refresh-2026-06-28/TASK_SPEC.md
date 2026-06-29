# TASK_SPEC — queue idle refresh 2026-06-28

## Work Order

Refresh the queue idle summary after reconstructing the current GSD state from
`origin/main`, open PRs, `TASK_QUEUE.md`, and `.planning`.

## Objective

Keep `.planning/queue-idle.md` aligned with the actual review-bound state so the next
GSD turn does not rely on stale PR references.

## In Scope

- `.planning/queue-idle.md`
- `.planning/queue-idle-refresh-2026-06-28/TASK_SPEC.md`
- `.planning/queue-idle-refresh-2026-06-28/CHANGE_MANIFEST.md`
- `.planning/queue-idle-refresh-2026-06-28/AUDIT_FANOUT.md`

## Out Of Scope

- Product code.
- `TASK_QUEUE.md` task status changes, because no active `PENDING` task exists.
- `.codex/**`, `.agents/**`, `scripts/gsd/**`, `docs/done-criteria.md`,
  `docs/invariants-baseline.md`.
- Merge, deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags,
  Bedrock, LanceDB mutation, and `production-content-enricher`.

## Substitution Test

If this refresh is not made, `.planning/queue-idle.md` continues to list stale PRs and
future GSD turns may reconstruct a wrong review-bound state.

## Validation

```bash
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
git diff --check
npm run gsd:done -- --audit-pass-file .planning/queue-idle-refresh-2026-06-28/AUDIT_FANOUT.md
```

Playwright is not applicable because this only updates planning documentation and does not
touch portal/category/SEO/render behavior.

## Stop Rules

- Stop before changing product behavior.
- Stop before modifying GSD policy or protected paths.
- Stop before any human-gated action.

## Human Gates

Human still owns merge to `main`, deploy/production GO, cloud writes, Lambda
invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and
`production-content-enricher`.
