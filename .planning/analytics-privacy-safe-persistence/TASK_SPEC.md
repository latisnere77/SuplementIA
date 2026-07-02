# TASK_SPEC — analytics-privacy-safe-persistence

Date: 2026-07-01

## Objective

Define privacy-safe persistence for research-audit analytics before any AWS/S3/Lambda write.
The design must keep only aggregate events, apply existing redaction/schema gates, and avoid
raw payloads or identifying telemetry.

## Scope

In scope:

- `.planning/analytics-privacy-safe-persistence/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Runtime code changes.
- AWS reads/writes, S3 writes, Lambda invoke/update, Terraform/EventBridge, deploy, `.deploy-go`,
  Bedrock, LanceDB mutation, production-content-enricher, checkout/live purchase, and real GitHub
  issues.
- Persisting real analytics data.

## Existing Oracle

- `lib/research-audit/events.ts` accepts aggregate-only portal, Search Console, and GA4 event
  shapes and rejects full URLs, query params, fragments, and PII-like SEO fields.
- `lib/research-audit/redaction.ts` rejects emails, URLs, phone-like values, account/address
  language, unsafe markup, multiline input, long input, and first-person medical narratives.
- `lib/research-audit/events.test.ts` and `lib/research-audit/redaction.test.ts` are the harness
  for this task.

## Harness

```bash
npm test -- --runInBand --runTestsByPath lib/research-audit/events.test.ts lib/research-audit/redaction.test.ts
```

## Stop Rules

- Stop before any data write unless the design names the schema, retention, redaction, cost,
  rollback, and IAM boundary.
- Stop if implementation requires raw payloads, IPs, user agents, session IDs, emails, URLs with
  query strings, request IDs, or medical narratives.
- Stop if the harness fails and the fix would require modifying tests just to pass.
