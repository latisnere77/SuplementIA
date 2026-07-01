# TASK_SPEC — phase5-post-merge-public-verification

Date: 2026-06-29

## Objective

Run public/read-only post-merge verification for Phase 5 after PR #193 landed on `main`,
using only public portal smoke scripts and local checklist evidence.

## Approved Scope

The user explicitly approved public/read-only post-merge verification without deploy or
AWS access. This task may document evidence and open a ready-for-review PR if evidence
changed.

## Files In Scope

- `.planning/phase5-post-merge-public-verification/**`
- `ROADMAP.md`

## Out Of Scope

- Product code changes.
- Marking Phase 5 `HECHO`.
- Deploys or `.deploy-go`.
- AWS reads or writes, Lambda invoke/update, Terraform/EventBridge, feature flags,
  Bedrock, LanceDB mutation, checkout/live purchase, real GitHub issues, or
  `production-content-enricher`.

## Commands

Public/read-only smoke only:

```bash
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

Certification:

```bash
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
git diff --check
npm run gsd:done -- --audit-pass-file .planning/phase5-post-merge-public-verification/AUDIT_FANOUT.md
```

## Stop Rules

- If any smoke fails, do not mark Phase 5 complete; prepare a scoped diagnosis/fix.
- If smoke requires AWS, deploy, hidden production configuration, mutation, or checkout,
  stop and report the exact blocker.
- Do not create `.deploy-go` or mark production acceptance.

## Audit Fan-Out Plan

- Reviewer: scope/gate check.
- Verifier: command evidence check.
- Smoke tester: public read-only smoke result check.
