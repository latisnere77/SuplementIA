# Privacy-Safe Analytics Persistence Design

Date: 2026-07-01

## Decision

Persist only aggregate research-audit events after they pass the existing local schema and
redaction oracle. No raw analytics payload, request payload, user/session identifier, full URL,
user agent, IP address, email, phone, address-like value, account-like value, or first-person
medical narrative may be stored.

## Allowed Input Classes

| Source | Allowed Fields | Required Safety Boundary |
| --- | --- | --- |
| Portal aggregate | `query`, `normalizedQuery`, `statusCounts`, `fallbackCounts`, `occurrenceCount`, `firstSeen`, `lastSeen`, deterministic PubMed profile counts | Must be aggregated before persistence; query must pass `redactAuditQuery`. |
| Search Console aggregate | `query`, `normalizedQuery`, `pagePath`, `country`, `clicks`, `impressions`, `ctr`, `averagePosition`, `firstSeen`, `lastSeen` | `pagePath` must be path-only with no query params, fragments, or full URL. |
| GA4 aggregate | `query`, `normalizedQuery`, `pagePath`, `country`, `channel`, `eventName`, `eventCount`, `firstSeen`, `lastSeen` | Export must be pre-aggregated; no GA client ID, session ID, user ID, IP, user agent, or raw event params. |

## Disallowed Fields

- Raw request bodies or raw GA4/Search Console payloads.
- IP addresses, user agents, client IDs, user IDs, session IDs, request IDs, cookies, device IDs,
  emails, phone numbers, addresses, account IDs, medical narratives, full URLs, query params, and
  fragments.
- Any provider response body that has not been sanitized by the research-audit runner.

## Canonical Persisted Record

```json
{
  "schemaVersion": 1,
  "source": "search_console",
  "id": "seo-mx-centella-low-ctr",
  "queryFingerprint": "16_hex_chars",
  "redactedQuery": "gotu kola beneficios",
  "normalizedQuery": "Centella asiatica",
  "pagePath": "/es/portal/supplement/centella-asiatica",
  "country": "Mexico",
  "statusCounts": {
    "impressions": 620,
    "clicks": 5
  },
  "fallbackCounts": {},
  "seoAggregate": {
    "source": "search_console",
    "pagePath": "/es/portal/supplement/centella-asiatica",
    "country": "Mexico",
    "clicks": 5,
    "impressions": 620,
    "ctr": 0.81,
    "averagePosition": 11.4,
    "firstSeen": "2026-05-01T00:00:00.000Z",
    "lastSeen": "2026-05-31T00:00:00.000Z"
  },
  "retentionUntil": "2026-08-29T00:00:00.000Z"
}
```

The persisted record should be derived from `buildAuditPacketFromEvent`; it must not preserve
fields rejected by `aggregatedAuditEventSchema` or `redactAuditQuery`.

## Aggregation

- Aggregate before upload/persistence at the lowest useful grain: `source + normalizedQuery +
  pagePath + country + channel + eventName + week`.
- Use weekly buckets for persisted analytics. Daily data can be used locally only if rolled up
  before storage.
- Keep counts and rates only when they are aggregate metrics.
- Minimum recommended aggregation threshold: do not persist a record with `occurrenceCount < 3`
  unless it is Search Console impression/click data that is already aggregate by export.

## Retention

- Default retention: 60 days for aggregate input events.
- Report artifacts may be retained for 180 days if they contain only sanitized aggregate packets,
  validation status, and human-reviewable findings.
- Delete or overwrite rejected/raw staging files immediately after local validation; do not upload
  rejected raw files to S3.

## S3 Boundary For A Future Write

No write is authorized by this design. If a future GO permits AWS writes, use only:

- Input prefix: `s3://suplementai-research-audit-inputs/manual/`
- Output prefix: `s3://suplementai-research-audit-reports/report-only/`

Writes must be scoped to report-only inputs/outputs, with no product data bucket access and no
database permissions.

## IAM Boundary

Future report-only persistence requires a dedicated role with:

- `s3:GetObject` on the aggregate input prefix.
- `s3:PutObject` on the report-only output prefix.
- Optional `secretsmanager:GetSecretValue` only for the configured provider key and only when
  provider calls are explicitly enabled.
- Own-log CloudWatch permissions only.

It must not include DynamoDB, RDS, app Lambda invoke, API Gateway mutation, EventBridge schedule,
product buckets, broad `s3:*`, broad `secretsmanager:*`, Bedrock, or LanceDB access.

## Rollback

- For local design/docs: revert this planning directory and `TASKS.md`.
- For a future S3 write: delete the exact batch prefix from `manual/<date>/` or
  `report-only/<date>/`; never run broad bucket cleanup.
- For a future Lambda/IAM change: disable provider flags, set reserved concurrency to 0, then
  remove the dedicated role/policy and function only after reports are exported for audit.

## Cost Boundary

- This design has no cloud cost because it performs no AWS reads/writes.
- Future provider-enabled runs must keep `AUDIT_AGENT_MAX_SPEND_USD_PER_RUN=0.25`, max 50 events,
  max one retry per event, and skip events once the budget is exhausted.

## Verification

The current executable oracle remains:

```bash
npm test -- --runInBand --runTestsByPath lib/research-audit/events.test.ts lib/research-audit/redaction.test.ts
```

This verifies that aggregate event parsing and query redaction reject unsafe data before provider
packets are built.
