# TASK_SPEC — post-188-roadmap-state

## Objective

Refresh roadmap and queue-idle state after the human-approved merge of PR #188 and the
authorized closure of stale PR #187, without changing product code or crossing any
production/AWS gates.

## Substitution Test

If this update is not made, `ROADMAP.md` still reports Phase 4 as waiting on a replacement
PR even though PR #188 is merged, and `.planning/queue-idle.md` still reports PR #187 as
open. That blocks the autonomous driver from identifying the next real offline phase.

## In Scope

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/post-188-roadmap-state/TASK_SPEC.md`
- `.planning/post-188-roadmap-state/CHANGE_MANIFEST.md`
- `.planning/post-188-roadmap-state/AUDIT_FANOUT.md`

## Out of Scope

- Product code changes.
- Deploy, `.deploy-go`, AWS writes, Lambda invoke/update, Terraform/EventBridge.
- Feature flags, Bedrock, LanceDB mutation, or `production-content-enricher`.
- Running production smoke tests.
- Merging the follow-up PR.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/post-188-roadmap-state/AUDIT_FANOUT.md`

## Risks

- Incorrectly classifying a production/AWS phase as autonomously open. Phase 5 and Phase 7
  must remain gated.
- Starting product cleanup prematurely. Product work remains paused unless the roadmap
  explicitly classifies a non-production, non-AWS phase as `ABIERTA_REAL`.

## Stop Rules

- Stop if validation fails after three repeated attempts with the same error.
- Stop if updating the roadmap requires changing product behavior.
- Stop if any required next action implies deploy, AWS write, Lambda, Terraform/EventBridge,
  feature flags, Bedrock, LanceDB mutation, or `production-content-enricher`.

## Audit Fan-Out Plan

Record read-only checks for:

- GitHub state: PR #188 merged, PR #187 closed, no open PRs.
- Roadmap classification: Phase 4 closed, production/AWS phases still gated.
- Queue state: no `PENDING` tasks in `TASK_QUEUE.md`.
