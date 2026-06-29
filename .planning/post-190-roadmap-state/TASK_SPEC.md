# TASK_SPEC — post-190-roadmap-state

## Objective

Refresh roadmap and queue-idle state after the human-approved merge of PR #190, marking
Phase 8 as closed without creating product work or crossing any gated operation.

## Substitution Test

If this update is not made, `ROADMAP.md` still says Phase 8 is review-bound after its
certification PR is ready for review even though PR #190 has already merged.

## In Scope

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/post-190-roadmap-state/TASK_SPEC.md`
- `.planning/post-190-roadmap-state/CHANGE_MANIFEST.md`
- `.planning/post-190-roadmap-state/AUDIT_FANOUT.md`

## Out of Scope

- Product/runtime code changes.
- Real GitHub issue creation or update.
- Deploy, `.deploy-go`, AWS writes/reads, Lambda invoke/update, Terraform/EventBridge.
- Feature flags, Bedrock, LanceDB mutation, provider/PubMed calls, or
  `production-content-enricher`.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/post-190-roadmap-state/AUDIT_FANOUT.md`

## Stop Rules

- Stop if the roadmap update implies deploy, AWS, Lambda, Terraform/EventBridge, feature
  flags, Bedrock, LanceDB, provider/PubMed calls, real GitHub issue creation, or
  `production-content-enricher`.
- Stop if validation fails after three repeated attempts with the same error.

## Audit Fan-Out Plan

Record read-only evidence that PR #190 merged, Phase 8 is closed, no `PENDING` task exists,
and the remaining roadmap phases are human-gated.
