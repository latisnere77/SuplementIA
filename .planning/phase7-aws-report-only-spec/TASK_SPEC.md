# TASK_SPEC — phase7-aws-report-only-spec

Date: 2026-07-01

## Objective

Prepare Phase 7 `research-audit-aws-report-only` under SPEC -> PLAN -> TASKS ->
IMPLEMENT -> VERIFY, and determine whether AWS report-only wiring can proceed safely in
this session.

## Decision

Do not perform AWS writes or wire cloud resources in this PR.

Reason: the required AWS identity check could not be executed from this Codex session.
The command `aws sts get-caller-identity --profile suplementai-admin --output json` was
blocked by the local execution policy before reaching AWS. Because the task requires
confirmed account `643942183354` before AWS reads/writes, Phase 7 remains gated.

## Scope

In scope:

- `ROADMAP.md`
- `.planning/phase7-aws-report-only-spec/**`
- Read-only inspection of existing research-audit docs and local code.

Out of scope:

- AWS writes.
- Lambda create/update/invoke.
- IAM/S3/EventBridge/Terraform changes.
- Portal deploy or `.deploy-go`.
- Bedrock, LanceDB mutation, `production-content-enricher`, checkout/live purchase, and
  real GitHub issues.
- Product code behavior changes.

## Evidence Inputs

- `docs/research-audit-aws-report-only.md` defines the target AWS report-only workflow,
  safe defaults, privacy checks, IAM boundaries, cost caps, and implementation criteria.
- `docs/research-audit-manual-infra-runbook.md` defines manual Lambda/S3/IAM wiring and
  explicitly avoids EventBridge for the first run.
- `lib/research-audit/aws-report-runner.ts` reads aggregate S3 input and writes JSON,
  Markdown, and summary report-only artifacts through an injected object store.
- `lib/research-audit/aws-lambda-handler.ts` provides a manual Lambda handler with S3 and
  Secrets Manager adapters.
- Existing tests cover mocked report-only runner and Lambda behavior.

## Stop Rules

- Stop before AWS writes if account identity cannot be confirmed as `643942183354`.
- Stop before AWS writes if rollback and cost limits are not explicit.
- Stop before scheduling if EventBridge would be enabled.
- Stop before any provider-enabled run if secrets, spend cap, timeout, and redaction
  boundaries are not verified.
- Stop if any input could contain PII, raw request payloads, user/session identifiers,
  IPs, user agents, full URLs, query params, or medical narratives.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/phase7-aws-report-only-spec/AUDIT_FANOUT.md`

Playwright is not applicable because this task is documentation/planning only and does
not touch portal render, category, SEO, or API behavior.

## Audit Fan-Out Plan

- Reviewer: confirm no cloud resources are modified and Phase 7 remains gated.
- Verifier: confirm the AWS identity check blocker and existing local AWS report-only
  code/docs.
- Smoke tester: confirm no smoke or Lambda invoke was performed; identify the next manual
  smoke prerequisites.
