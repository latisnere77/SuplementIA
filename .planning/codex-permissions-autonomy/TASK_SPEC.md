# TASK_SPEC — codex permissions autonomy

## Work Order

Replace stale PR #187 with current ROADMAP-aware Hands planning after PRs #184, #186,
and #185 were merged by explicit human GO.

## Objective

Keep the autonomy roadmap and planning state coherent before the Hands layer proceeds.
This is planning-only: it does not grant new permissions, weaken gates, or change
runtime product behavior.

## Current Layer Evidence

- Heart: PR #184, `Harden GSD SDLC gates`, merged to `main`.
- Nervous system: PR #186, `Fix GSD stop hook JSON output`, merged to `main`.
- Brain: PR #185, `Add roadmap autonomy driver`, merged to `main`.
- Prior Hands PR #187 is stopped because it became semantically stale after `ROADMAP.md`
  landed in `main`.

## In Scope

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/codex-permissions-autonomy/TASK_SPEC.md`
- `.planning/codex-permissions-autonomy/CHANGE_MANIFEST.md`
- `.planning/codex-permissions-autonomy/AUDIT_FANOUT.md`

## Out Of Scope

- Product code.
- `.codex/**`, `.agents/**`, and `scripts/gsd/**` behavior changes.
- Broad permission grants or destructive command approvals.
- Merge beyond the explicitly approved PR sequence.
- Deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags,
  Bedrock, LanceDB mutation, and `production-content-enricher`.

## Substitution Test

If this replacement PR is not created, the roadmap continues to say earlier anatomy
layers are open even though #184, #186, and #185 are merged, while #187 remains dirty
and stale.

## Validation

```bash
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
git diff --check
npm run gsd:done -- --audit-pass-file .planning/codex-permissions-autonomy/AUDIT_FANOUT.md
```

Playwright is not applicable because this does not touch portal/category/SEO/render
behavior.

## Stop Rules

- Stop before modifying permission policy or hook behavior.
- Stop before product code edits.
- Stop before any production or cloud-write action.
- Stop if PR #187 is still considered the merge path; this replacement intentionally
  supersedes it.

## Human Gates

Human still owns merge to `main`, deploy/production GO, cloud writes, Lambda
invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and
`production-content-enricher`.
