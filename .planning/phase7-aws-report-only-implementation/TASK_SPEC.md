# TASK_SPEC — phase7-aws-report-only-implementation

Date: 2026-07-01

## Objective

Create the executable specification for Phase 7 `research-audit-aws-report-only` before
any AWS write. This task does not wire AWS resources. It defines the minimum safe
implementation contract for a later session that can confirm AWS identity.

## Scope

In scope:

- `.planning/phase7-aws-report-only-implementation/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- AWS writes, AWS reads beyond the blocked STS harness, Lambda invoke/update, IAM/S3
  mutation, Terraform/EventBridge, portal deploy, `.deploy-go`, Bedrock, LanceDB mutation,
  `production-content-enricher`, checkout/live purchase, real GitHub issues, product
  behavior changes, and shared abstractions.

## Substitution Test

If this specification is absent, Phase 7 can drift into unsafe AWS writes without a
versioned rollback, cost, PII, IAM, S3, and Lambda contract. Therefore this documentation
is required before any future implementation attempt.

## Required Precondition For Any Future AWS Write

Run:

```bash
aws sts get-caller-identity --profile suplementai-admin --output json
```

The command must exit 0 and return `Account` exactly `643942183354`. If it does not run
or the account differs, no AWS write, Lambda invoke/update, IAM/S3/EventBridge action, or
manual smoke may occur.

## Minimal AWS Design Contract

Lambda:

- Name: `suplementai-research-audit-report-only`.
- Entrypoint: `lib/research-audit/aws-lambda-handler.handler`.
- Invocation mode: manual only.
- Runtime target: Node runtime supported by the deployment account.
- Reserved concurrency: `1`.
- Timeout: maximum `120` seconds unless a future SPEC justifies a lower value.

S3:

- Input prefix: aggregate-only JSON/JSONL under
  `s3://suplementai-research-audit-inputs/manual/`.
- Output prefix: report-only artifacts under
  `s3://suplementai-research-audit-reports/report-only/`.
- Required outputs: `provider-audit-*.json`, `provider-audit-*.md`, `summary-*.json`.

IAM:

- Allow `s3:GetObject` only on the approved input prefix.
- Allow `s3:PutObject` only on the approved report-only output prefix.
- Allow `secretsmanager:GetSecretValue` only for
  `suplementia/research-audit/moonshot-api-key` and only when provider calls are
  explicitly enabled.
- Allow own CloudWatch log stream writes.
- Deny by omission: DynamoDB, RDS, application Lambda invocation, product buckets,
  broad `s3:*`, broad `secretsmanager:*`, EventBridge, Bedrock, LanceDB, checkout, and
  production-content-enricher permissions.

PII:

- Inputs must be aggregate-only.
- Reject raw request payloads, emails, IPs, user agents, session IDs, user IDs, phone
  numbers, full URLs, query params, fragments, account-like strings, and first-person
  medical narratives.
- Provider packets may contain only redacted query text, normalized entity, aggregate
  counts, fallback/status distributions, deterministic PubMed profile counts, and safe
  SEO aggregate fields.

Costs:

- Default provider-enabled max spend per run: `$0.25`.
- Max events per run: `50`.
- Max output tokens per event: `1000`.
- Max provider retries: `1`.
- Provider disabled by default.

Rollback:

- Disable future invocation by setting `AUDIT_AGENT_ENABLED=false`.
- Remove or detach any manual invoke permission if one is added later.
- Delete only the dedicated Lambda and dedicated report-only IAM role if rollback is
  required.
- Preserve S3 report artifacts for audit unless they contain sensitive data.
- Do not delete unrelated S3 buckets, application Lambdas, Amplify app config, product
  data, checkout resources, or production-content-enricher resources.

Safe defaults:

```text
AUDIT_AGENT_ENABLED=false
AUDIT_AGENT_DRY_RUN=true
AUDIT_AGENT_REPORT_ONLY=true
AUDIT_AGENT_WRITE_DB=false
AUDIT_AGENT_PROVIDER=kimi
AUDIT_AGENT_MODEL=kimi-k2.6
AUDIT_AGENT_MAX_EVENTS_PER_RUN=50
AUDIT_AGENT_MAX_OUTPUT_TOKENS_PER_EVENT=1000
AUDIT_AGENT_REQUEST_TIMEOUT_MS=90000
AUDIT_AGENT_MAX_SPEND_USD_PER_RUN=0.25
AUDIT_AGENT_ALLOW_PUBMED_VERIFIER=false
```

## Stop Rules

- Stop if STS cannot confirm account `643942183354`.
- Stop if `.deploy-go` exists or would be created.
- Stop if EventBridge/scheduling is required.
- Stop if any write would touch portal deploy, app runtime routes, product data,
  checkout, Bedrock, LanceDB, or production-content-enricher.
- Stop if rollback cannot be expressed as a bounded resource list.
- Stop if PII rejection is not covered by tests.

## Harness

```bash
npm run gsd:done -- --audit-pass-file .planning/phase7-aws-report-only-implementation/AUDIT_FANOUT.md
```
