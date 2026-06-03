# Frontier Agent Manual AWS Wiring Runbook

## Goal

Wire the Frontier Agent Lambda handler for manual report-only AWS runs without enabling EventBridge, database writes, clinical runtime use, product/core flows, UI changes, affiliate flows, or production PubMed recall.

This runbook is intentionally manual. The repository has CloudFormation and deployment scripts for other AWS components, but there is not yet a clear isolated IaC pattern for this research-audit Lambda package. The next implementation PR should add IaC only after this manual wiring is reviewed and exercised.

## Scope

Allowed:

- One Lambda function for manual invocation.
- One S3 input prefix for aggregate event JSON/JSONL.
- One S3 output prefix for JSON, Markdown, and summary reports.
- Optional Secrets Manager access to the Kimi/Moonshot key only when provider calls are explicitly enabled.
- Optional PubMed/E-utilities verifier only when the manual event explicitly enables it.
- CloudWatch logs for the Lambda.

Not allowed:

- EventBridge schedule.
- DynamoDB, RDS, or any DB writes.
- Invocation from `/quiz`, `/recommend`, `enrich-v2`, UI, affiliate, product/core, smoke, or PubMed production recall flows.
- Automated issue creation, PR creation, or production content changes.
- Broad `s3:*`, `secretsmanager:*`, or runtime app permissions.

## Resource Names

Recommended names for the first manual wiring:

```text
Lambda:
  suplementai-research-audit-report-only

Input S3 prefix:
  s3://suplementai-research-audit-inputs/manual/

Output S3 prefix:
  s3://suplementai-research-audit-reports/report-only/

Secret:
  suplementia/research-audit/moonshot-api-key
```

The input and output prefixes may live in the same bucket if that matches the account's bucket policy model, but IAM should still scope reads and writes to separate prefixes.

## Lambda Environment

Safe defaults must be deployed exactly as disabled/report-only:

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

With these defaults:

- Provider calls must not run.
- Secrets Manager must not be read.
- PubMed/E-utilities must not be called.
- The handler may validate the input file and write report-only skipped rows to S3.

## Manual Lambda Event

Provider disabled, PubMed disabled:

```json
{
  "input": {
    "bucket": "suplementai-research-audit-inputs",
    "key": "manual/2026-06-03/mixed-aggregate-events.jsonl"
  },
  "output": {
    "bucket": "suplementai-research-audit-reports",
    "keyPrefix": "report-only/manual/2026-06-03"
  },
  "useProviderSecret": false,
  "allowPubMedVerifier": false,
  "region": "us-east-1"
}
```

Provider enabled for a manual smoke, PubMed still disabled:

```json
{
  "input": {
    "bucket": "suplementai-research-audit-inputs",
    "key": "manual/2026-06-03/mixed-aggregate-events.jsonl"
  },
  "output": {
    "bucket": "suplementai-research-audit-reports",
    "keyPrefix": "report-only/provider-smoke/2026-06-03"
  },
  "useProviderSecret": true,
  "secretId": "suplementia/research-audit/moonshot-api-key",
  "allowPubMedVerifier": false,
  "region": "us-east-1"
}
```

PubMed verifier may be enabled only for a separate explicit smoke:

```json
{
  "input": {
    "bucket": "suplementai-research-audit-inputs",
    "key": "manual/2026-06-03/mixed-aggregate-events.jsonl"
  },
  "output": {
    "bucket": "suplementai-research-audit-reports",
    "keyPrefix": "report-only/pubmed-smoke/2026-06-03"
  },
  "useProviderSecret": true,
  "secretId": "suplementia/research-audit/moonshot-api-key",
  "allowPubMedVerifier": true,
  "pmidVerifier": {
    "timeoutMs": 15000,
    "maxPmids": 20
  },
  "region": "us-east-1"
}
```

## Minimum IAM Policy

Use a dedicated execution role for the report-only Lambda. Scope bucket names and prefixes to the actual account resources.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyAggregateInputs",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::suplementai-research-audit-inputs/manual/*"
    },
    {
      "Sid": "WriteReportOnlyOutputs",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::suplementai-research-audit-reports/report-only/*"
    },
    {
      "Sid": "ReadMoonshotSecretOnly",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:643942183354:secret:suplementia/research-audit/moonshot-api-key-*"
    },
    {
      "Sid": "WriteOwnLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:643942183354:log-group:/aws/lambda/suplementai-research-audit-report-only:*"
    }
  ]
}
```

Do not attach permissions for DynamoDB, RDS, application Lambdas, API Gateway, EventBridge, CloudFront, SQS, SNS, product data buckets, affiliate resources, or broad Secrets Manager access.

## Packaging Notes

The Lambda entrypoint should use the merged handler:

```text
lib/research-audit/aws-lambda-handler.handler
```

The first manual wiring should package only what the handler needs to run the report-only path. If the existing production Lambda packaging scripts are reused, confirm the artifact does not add application route handlers or clinical runtime code as invocation targets.

Recommended runtime settings:

```text
Runtime: nodejs22.x or current project-supported Node runtime
Architecture: arm64
Memory: 512 MB
Timeout: 120 seconds
Reserved concurrency: 1
```

Reserved concurrency keeps a manual smoke from running multiple provider batches at once.

## Input Safety Checklist

Before uploading an input file:

- Use aggregate events only.
- Use `pagePath`, not full URLs.
- Remove query params and fragments.
- Remove emails, user IDs, session IDs, IPs, phone numbers, user agents, request IDs, and raw medical narratives.
- Keep `country`, `channel`, `eventName`, `clicks`, `impressions`, `ctr`, `averagePosition`, `statusCounts`, `fallbackCounts`, and deterministic PubMed profile counts only when aggregate.
- Reject anything that cannot pass the `lib/research-audit/events.ts` schema.

## Output Review Checklist

Each manual run should write:

- `provider-audit-*.json`
- `provider-audit-*.md`
- `summary-*.json`

Before taking action from any finding:

- Confirm `reportOnly=true`.
- Confirm `dryRun=true`.
- Confirm no DB writes occurred.
- Confirm `blockedFromProduction=true` and `requiresHumanReview=true` for findings.
- Confirm `validatedPmids` came only from deterministic E-utilities when PubMed verifier was explicitly enabled.
- Confirm SEO findings do not use missing PubMed evidence as the primary SEO argument.
- Confirm any provider errors are sanitized and do not contain raw error bodies, keys, account IDs, org IDs, or billing metadata.

## Smoke Sequence

1. Upload 3-5 aggregate events to the input prefix.
2. Invoke the Lambda manually with provider disabled and PubMed disabled.
3. Confirm `externalCalls=0`, `enabled=false`, `dryRun=true`, and three S3 output objects.
4. Invoke with provider enabled only after confirming the Moonshot/Kimi budget and max spend cap.
5. Keep `allowPubMedVerifier=false` for the first provider smoke.
6. Run a separate PubMed verifier smoke only if candidate PMIDs are present and the reviewer needs deterministic existence/entity metadata.

## Go/No-Go For IaC PR

Proceed to an isolated IaC PR only if the manual wiring confirms:

- The package entrypoint works in Lambda.
- S3 input/output paths are correct.
- IAM denies unrelated writes and broad secrets access.
- Provider-disabled run makes zero external calls.
- Provider-enabled smoke respects cost caps.
- Reports are reviewable without leaking sensitive provider or user data.

If any of those fail, keep Frontier parked in manual/local report-only mode and do not add EventBridge.
