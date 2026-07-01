# TASK_SPEC — phase5-documental-closure

Date: 2026-07-01

## Objective

Close Phase 5 `portal-production-verification` documentally after explicit human GO,
using only public/read-only evidence already merged to `main`.

## Scope

In scope:

- `ROADMAP.md`
- `STATE.md`
- `.planning/phase5-documental-closure/**`

Out of scope:

- Product code, portal render behavior, API behavior, tests, package dependencies, deploy
  machinery, production configuration, AWS, Lambda, Terraform/EventBridge, feature flags,
  Bedrock, LanceDB, checkout/live purchase, real GitHub issues, and
  `production-content-enricher`.

## Evidence Inputs

- PR #193 merged: scoped 504 hardening landed on `main`.
- PR #194 merged: post-merge public/read-only smoke evidence landed on `main`.
- PR #195 merged: Oracle-first GSD v2 landed on `main`.
- `.planning/phase5-post-merge-public-verification/PRODUCTION_SMOKE_POST_MERGE.md`
  records passing smoke on `https://suplementai.com`,
  `https://www.suplementai.com`, and
  `https://main.d2yn3faih4ykom.amplifyapp.com`.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/phase5-documental-closure/AUDIT_FANOUT.md`

Playwright is not applicable because this task is documentation/state only and does not
touch portal render, SEO, category, or API behavior.

## Stop Rules

- Stop without marking Phase 5 `HECHO` if any required PR is not merged.
- Stop without marking Phase 5 `HECHO` if post-merge public smoke evidence is missing.
- Stop without marking Phase 5 `HECHO` if `.deploy-go` exists or the repo is dirty before
  scoped edits.
- Stop if closure would require deploy, AWS reads/writes, Lambda, Terraform/EventBridge,
  feature flags, Bedrock, LanceDB, checkout/live purchase, real GitHub issue creation, or
  `production-content-enricher`.

## Audit Fan-Out Plan

- Reviewer: confirm this is documentation-only closure with explicit human GO.
- Verifier: confirm PR #193, #194, and #195 are merged and evidence files are present.
- Smoke tester: confirm no new smoke is required; cite already merged post-merge smoke
  evidence.
