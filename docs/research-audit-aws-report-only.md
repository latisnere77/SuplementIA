# Frontier Agent AWS Report-Only Plan

## Goal

Move the Frontier Agent from local manual smokes to a minimal AWS report-only workflow for aggregated audit events.

This phase must not change clinical runtime behavior, write findings to a database, open automated PRs, or feed `/quiz`, `/recommend`, `enrich-v2`, UI, affiliates, PubMed production recall, smoke, product, or core flows.

The only output is a human-reviewable JSON/Markdown report.

## Recommended Minimal Architecture

Use EventBridge, Lambda, Secrets Manager, and S3.

```text
Manual trigger or EventBridge weekly schedule
        |
        v
research-audit-report-only Lambda
        |
        v
Read aggregate JSON/JSONL input from S3
        |
        v
Redaction + schema validation + packet building
        |
        v
Optional Kimi provider call, guarded by flags and cost caps
        |
        v
Optional deterministic PubMed verifier, guarded by explicit flag
        |
        v
Write JSON/Markdown report to S3
        |
        v
Human review
```

Step Functions are not required for the first AWS phase. Use them later only if the workflow needs separate retry boundaries for collection, provider calls, PubMed verification, report publishing, and issue creation.

## Input Location

Input should be aggregate-only JSON or JSONL in S3:

```text
s3://suplementai-research-audit-inputs/
  manual/
    2026-06-02/
      mixed-aggregate-events.jsonl
```

Allowed event categories:

- Supplement/search aggregate events from sanitized portal telemetry.
- SEO aggregate events from Search Console exports.
- SEO aggregate events from GA4 exports.
- Country/source/device/page context when it is aggregate-only.

Do not use raw request bodies, raw GA4 payloads, raw Search Console exports with unsafe URLs, user IDs, session IDs, IP addresses, user agents, emails, or free-text medical narratives.

## Expected Event Shape

Supplement/search aggregate event:

```json
{
  "id": "garcinia-insufficient-data-recall-gap",
  "query": "Garcinia cambogia",
  "normalizedQuery": "Garcinia cambogia",
  "statusCounts": {
    "insufficient_data": 12,
    "completed": 3
  },
  "fallbackCounts": {
    "pubmed_profile": 10,
    "research_brief": 5
  },
  "deterministicPubMedProfile": {
    "totalCount": 18,
    "categories": {
      "human_clinical": 2,
      "review": 1,
      "preclinical": 5,
      "phytochemical": 4,
      "other": 6
    }
  },
  "occurrenceCount": 15,
  "firstSeen": "2026-05-01T00:00:00.000Z",
  "lastSeen": "2026-05-31T00:00:00.000Z"
}
```

Search Console aggregate event:

```json
{
  "id": "seo-mx-centella-low-ctr",
  "source": "search_console",
  "query": "gotu kola beneficios",
  "normalizedQuery": "Centella asiatica",
  "pagePath": "/es/portal/supplement/centella-asiatica",
  "country": "Mexico",
  "clicks": 5,
  "impressions": 620,
  "ctr": 0.81,
  "averagePosition": 11.4,
  "firstSeen": "2026-05-01T00:00:00.000Z",
  "lastSeen": "2026-05-31T00:00:00.000Z"
}
```

GA4 aggregate event:

```json
{
  "id": "ga4-us-magnesium-outbound-clicks",
  "source": "ga4",
  "query": "Magnesium",
  "normalizedQuery": "Magnesium",
  "pagePath": "/en/portal/supplement/magnesium",
  "country": "United States",
  "channel": "organic",
  "eventName": "outbound_click",
  "eventCount": 12,
  "firstSeen": "2026-05-01T00:00:00.000Z",
  "lastSeen": "2026-05-31T00:00:00.000Z"
}
```

For SEO aggregate events, `pagePath` must be a path only. Full URLs, query params, fragments, emails, or user/session identifiers must be rejected before provider calls.

## Output Location

Write report-only artifacts to S3:

```text
s3://suplementai-research-audit-reports/
  report-only/
    2026-06-02/
      provider-audit-2026-06-02T21-54-19-520Z.json
      provider-audit-2026-06-02T21-54-19-520Z.md
      summary.json
```

The JSON report should preserve machine-readable validation details. The Markdown report should be short enough for manual review and should not include raw provider responses or secrets.

## Safe Defaults

The AWS runner must remain disabled and dry-run by default:

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

Required behavior:

- With `AUDIT_AGENT_ENABLED=false`, the Lambda may validate input and write skipped report rows, but it must make zero provider calls.
- With `AUDIT_AGENT_DRY_RUN=true`, all outputs remain reports only.
- `AUDIT_AGENT_WRITE_DB` must stay false and is reserved as a hard guard. This phase must not create DB writes.
- PubMed/E-utilities must not run unless `AUDIT_AGENT_ALLOW_PUBMED_VERIFIER=true` or an equivalent explicit manual flag is present.

## Secrets Manager

Store the Kimi/Moonshot key in Secrets Manager:

```text
suplementia/research-audit/moonshot-api-key
```

The Lambda should read this secret only when provider calls are explicitly enabled. It must not print:

- Secret values.
- Authorization headers.
- Raw provider error bodies.
- Account IDs, organization IDs, billing metadata, or project metadata.
- Full request/response payloads containing audit packets.

Local environment fallback keys such as `MOONSHOT_API_KEY` or `KIMI_API_KEY` are acceptable for manual local smoke tests only, not for deployed AWS configuration.

## Conceptual IAM

The report-only Lambda needs minimal permissions:

- `s3:GetObject` on the approved input prefix.
- `s3:PutObject` on the approved report prefix.
- `secretsmanager:GetSecretValue` for `suplementia/research-audit/moonshot-api-key`.
- `logs:CreateLogStream` and `logs:PutLogEvents` for its own CloudWatch log group.

It should not have permissions for:

- DynamoDB writes.
- RDS or production database access.
- App runtime Lambda invoke permissions.
- Product, affiliate, checkout, or recommendation resources.
- Broad `s3:*` access.
- Broad `secretsmanager:*` access.

## Cost Cap

Use a hard per-run budget before provider calls:

```text
AUDIT_AGENT_MAX_SPEND_USD_PER_RUN=0.25
```

Recommended first AWS limits:

- Maximum events per run: 50.
- Maximum provider retries: 1 per event.
- Maximum output tokens per event: 1000.
- Timeout per event: 90 seconds.
- Stop scheduling provider-enabled runs if rejection/noise is high for two consecutive weeks.

Report both estimated cost and provider call count. If an event would exceed the remaining budget, skip it and record a rejection reason instead of calling the provider.

## Recommended Frequency

Phase 1:

- Manual trigger only.
- Use S3 input from manually curated aggregate batches.
- Run at most weekly until reviewer quality is stable.

Phase 2:

- Weekly EventBridge schedule.
- Keep provider enabled only if the previous manual runs show useful, low-noise findings.

Do not run daily until the agent consistently produces actionable findings at acceptable cost and low noise.

## Privacy And PII Checklist

Before provider calls:

- Aggregate repeated events before input.
- Reject emails, phone-like values, address-like values, and account-like strings.
- Reject full URLs, query params, and fragments.
- Reject user IDs, session IDs, IP addresses, user agents, and raw request IDs.
- Reject first-person medical narratives and long free-text medical descriptions.
- Keep `pagePath` only, never full URL.
- Keep country/source/device/page context only when aggregate and non-identifying.
- Redact or reject any field that looks like PII, even if it came from a trusted export.

The provider packet should contain only redacted query text, normalized entity, aggregate counts, fallback/status distributions, optional deterministic PubMed profile counts, and safe SEO aggregate fields.

## Metrics To Report

Each report should include:

- Input path and output path.
- Total events.
- Skipped events.
- Redaction/schema rejections.
- Provider calls.
- PubMed verifier calls.
- Valid findings.
- Rejected findings.
- Findings by `taskType`.
- Findings by `severity`.
- SEO valid/rejected counts.
- PubMed mentions in SEO `problemDetected` or `recommendedAction`.
- Candidate PMIDs, validated PMIDs, matched PMIDs, and review warnings.
- Timeout count.
- Provider error count by sanitized error type.
- Estimated cost by run.
- Top actionable findings.
- Top noisy or rejected findings.

## Manual Review Process

A valid finding is not an approved action.

Reviewer workflow:

1. Read the Markdown summary.
2. Inspect the JSON for each high or medium severity finding.
3. Label each finding as `actionable`, `noisy`, `needs_more_data`, or `reject`.
4. For SEO findings, verify page path, market, query intent, and Search Console/GA4 source before assigning work.
5. For supplement/search findings, verify aliases, status counts, fallbacks, and PubMed summaries before assigning work.
6. Create manual issues or PRs only after review.

The Frontier Agent must not auto-write findings to production, auto-change content, auto-update aliases, auto-open PRs, or auto-create clinical claims in this phase.

## Criteria For The Next Implementation PR

The next PR may implement an AWS report-only runner only if these are accepted:

- It reads aggregate JSON/JSONL from a specified S3 object.
- It writes JSON/Markdown reports to a specified S3 prefix.
- It preserves `AUDIT_AGENT_ENABLED=false` and `AUDIT_AGENT_DRY_RUN=true` defaults.
- It has no DB permissions and no DB writes.
- It has no imports from clinical runtime, UI, affiliate, product/core, or PubMed production recall paths.
- It reads Kimi credentials only from Secrets Manager when provider calls are explicitly enabled.
- It applies redaction and Zod validation before any provider call.
- It enforces max events, token, timeout, retry, and spend limits.
- It has tests with mocked S3, Secrets Manager, provider, and PubMed verifier clients.
- It includes a manual runbook for one report-only smoke before enabling any schedule.

