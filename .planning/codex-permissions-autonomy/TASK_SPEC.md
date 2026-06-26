# TASK_SPEC — codex permissions autonomy

## Work Order

Plan the Hands layer for Codex permissions and autonomy controls after the Heart, Brain,
and Nervous system layers are review-bound with evidence.

## Objective

Define the smallest safe repo-local follow-up needed to make Codex autonomy predictable
without granting broad permissions or weakening GSD enforcement.

## Current Layer Evidence

- Heart: PR #184, `Harden GSD SDLC gates`, open, ready for review, `Validate` success.
- Brain: PR #185, `Add roadmap autonomy driver`, open, ready for review, `Validate` success.
- Nervous system: PR #186, `Fix GSD stop hook JSON output`, open, ready for review, `Validate` success.

## In Scope

- This planning file.
- `.planning/codex-permissions-autonomy/CHANGE_MANIFEST.md`
- `.planning/codex-permissions-autonomy/AUDIT_FANOUT.md`
- Future implementation candidates, only after this planning PR is reviewed:
  - `.codex/**`
  - `.agents/**`
  - `scripts/gsd/**`
  - docs describing GSD permissions/autonomy

## Out Of Scope

- Product code.
- Broad command allowlists or destructive command approvals.
- Weakening `.agents/skills/suplementai-gsd/`, `.codex/`, `scripts/gsd/`,
  `docs/done-criteria.md`, or `docs/invariants-baseline.md`.
- Merge, deploy, production action, cloud write, Lambda invoke/update,
  Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation, and
  `production-content-enricher`.

## Substitution Test

If this planning PR is not created, the Hands layer remains ambiguous after the first
three anatomy layers are review-bound, and future autonomy work may over-grant permissions
or modify GSD policy without a narrow scope.

## Minimal Follow-up Scope

The next implementation PR should be discovery-first and may only propose changes that:

- make current repo-local permission expectations explicit;
- reduce false positives in GSD hooks without weakening hard gates;
- document approved command classes narrowly enough for future sessions;
- preserve human gates for merge, deploy, production, cloud writes, feature flags, Bedrock,
  LanceDB mutation, and `production-content-enricher`.

## Validation

```bash
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
git diff --check
npm run gsd:done -- --audit-pass-file .planning/codex-permissions-autonomy/AUDIT_FANOUT.md
```

## Stop Rules

- Stop before any permission change that would enable destructive commands broadly.
- Stop before editing product runtime files.
- Stop before weakening any GSD policy, hook, done criteria, or invariant.
- Stop if validation evidence is not independently auditable.

## Human Gates

Human still owns merge to `main`, deploy/production GO, `.deploy-go`, cloud writes,
Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags,
and `production-content-enricher`.
