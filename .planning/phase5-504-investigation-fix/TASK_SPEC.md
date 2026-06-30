# TASK_SPEC — phase5-504-investigation-fix

Date: 2026-06-29

## Objective

Diagnose and prepare the smallest safe local fix for the Phase 5 public smoke HTTP 504
failures:

- `Cannabis sativa` returns 504 on `https://suplementai.com`,
  `https://www.suplementai.com`, and the Amplify public branch URL.
- `Centella asiatica` and `gotu kola` return 504 on the custom domains but pass on the
  Amplify public branch URL.

## Approved Scope

This task is explicitly approved by the user as a local/public read-only investigation and
fix-preparation task. It may create a ready-for-review PR if the root cause is fixable in
repo code or public configuration committed to the repo.

## Files In Scope

- `.planning/phase5-504-investigation-fix/**`
- `scripts/portal-production-smoke.mjs`
- `app/api/portal/quiz/route.ts`
- `app/api/portal/quiz/route.test.ts`
- `app/api/portal/recommend/route.ts`
- `app/api/portal/recommend/route.test.ts`
- `app/api/portal/enrich-v2/route.ts`
- `app/api/portal/enrich-v2/route.test.ts`
- `lib/portal/**`
- `docs/portal-release-hardening-checklist.md`
- `ROADMAP.md`

If diagnosis proves a narrower file set is sufficient, keep edits to that smaller set.

## Out Of Scope

- Deploys or `.deploy-go`.
- AWS reads or writes, including logs, Amplify APIs, CloudWatch, S3, DynamoDB, Secrets
  Manager, Lambda, or any AWS CLI/API command.
- Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation,
  checkout/live purchase, real GitHub issues, or `production-content-enricher`.
- Broad portal refactors, new product features, or research/provider behavior changes.

## Substitution Test

If this task does not identify why the three canaries time out, Phase 5 remains blocked
and the production smoke cannot be accepted. If the root cause is local timeout handling,
alias resolution, or deterministic fallback behavior, a minimal code/test fix is in scope.

## Validation Plan

- Reproduce with public read-only HTTP smoke where useful:
  - `npm run smoke:production:portal`
  - `PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal`
  - `PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal`
- Run focused tests for touched API/helper files.
- Run `npm run gsd:invariants`.
- Run `npm run gsd:offline-certify -- --quick`.
- Run Playwright if portal render behavior changes.
- Run `git diff --check`.
- Record independent read-only audit evidence in
  `.planning/phase5-504-investigation-fix/AUDIT_FANOUT.md`.
- Run `npm run gsd:done -- --audit-pass-file .planning/phase5-504-investigation-fix/AUDIT_FANOUT.md`.

## Stop Rules

- Stop and report `blocked` if root-cause confirmation requires AWS logs/config, deploy,
  Lambda invocation, production mutation, hidden env vars, or external provider mutation.
- Stop after three repeated failures of the same validation gate.
- Do not mark Phase 5 `HECHO`; this task can only prepare a fix PR or document the exact
  blocker.

## Audit Fan-Out Plan

- Reviewer: verify the diff stays inside approved scope and preserves gates.
- Verifier: confirm focused tests and GSD commands passed.
- Smoke-tester: confirm local/public read-only smoke evidence and whether 504 behavior is
  fixed or still production-gated.
