# Asynchronous Research Audit Agent Plan

## Goal

Explore a low-cost LLM agent for SuplementAI as an offline audit and research assistant. The agent must not change clinical recommendations, `worksFor`, products, or user-facing claims directly.

The pilot should produce structured findings that help humans decide whether to improve aliases, canaries, PubMed recall, editorial copy, or curated evidence.

## Current Code Structure Read

The current portal already has useful safety boundaries:

- `app/api/portal/quiz/route.ts`: user entry point, local catalog fallback, async enrichment handoff, structured outcome logging, and critical supplement behavior.
- `app/api/portal/recommend/route.ts`: synchronous recommendation path that calls `enrich-v2`, validates real data, and preserves `insufficient_data` versus system failure.
- `app/api/portal/enrich-v2/route.ts`: studies-fetcher + human clinical filtering + content-enricher path. This is the most important clinical gate.
- `lib/services/pubmed-literature-profile.ts`: broad PubMed profile and classification into `human_clinical`, `review`, `preclinical`, `phytochemical`, and `other`.
- `lib/portal/structured-logger.ts`: emits `PORTAL_SUPPLEMENT_OUTCOME` and related events with bounded, non-PII fields.
- `app/api/portal/analytics/route.ts`: accepts client search analytics batches but currently only logs summaries; long-term storage is still TODO.
- `lib/services/discovery-queue.ts` and `infrastructure/discovery-queue-schema.ts`: existing DynamoDB-backed discovery queue shape for unknown or repeated searches.
- `docs/portal-observability.md`, `docs/portal-critical-supplement-smoke-matrix.md`, and `docs/portal-release-hardening-checklist.md`: operational rules and canaries that should become audit inputs.
- `app/api/portal/quiz/route.test.ts` and `app/api/portal/enrich-v2/route.test.ts`: deterministic safety tests for local catalog hits, async cases, botanicals, `insufficient_data`, and upstream failures.

## Non-Goals

- Do not add the LLM to the real-time `/quiz`, `/recommend`, `/results`, or `enrich-v2` decision path.
- Do not let the agent write directly to curated supplement data.
- Do not let the agent generate final `worksFor`, dosage, contraindication, or product recommendation copy.
- Do not auto-open PRs until the pilot produces stable, low-noise findings.
- Do not treat web search snippets as clinical evidence; PMIDs and deterministic PubMed classification remain the authority.
- Do not send raw user text, request bodies, IP addresses, user agents, session IDs, emails, or analytics payloads to an external LLM.
- Do not call product, affiliate, checkout, or recommendation rendering code from the audit worker.

## Concrete AWS Architecture

```text
CloudWatch Logs Insights + portal analytics + discovery queue + canary matrix
        |
        v
EventBridge scheduled rule
        |
        v
audit-collector Lambda
        |
        v
DynamoDB: research-audit-events
        |
        v
audit-preflight Lambda
        |
        v
PubMed E-utilities verification
        |
        v
audit-agent Lambda, disabled by default
        |
        v
JSON Schema validation
        |
        v
DynamoDB: research-audit-findings + S3 daily report
        |
        v
Manual review queue / issue / draft PR
```

The key design point is that the LLM suggests investigation targets and candidate evidence. Existing deterministic code decides whether anything is clinically usable.

Concrete AWS components:

- EventBridge schedule: nightly in staging first, then production dry-run after approval.
- `audit-collector` Lambda: reads bounded CloudWatch Logs Insights results, analytics summaries, and discovery queue items.
- `research-audit-events` DynamoDB table: stores redacted, aggregated audit events only.
- `audit-preflight` Lambda: runs deterministic PubMed/E-utilities checks before any LLM call.
- `audit-agent` Lambda: optional external LLM caller, default disabled and dry-run. It receives only redacted audit packets plus deterministic PubMed summaries.
- `research-audit-findings` DynamoDB table: stores validated findings, provider metadata, cost estimate, and validator status.
- S3 bucket/prefix: stores daily Markdown/JSONL reports for human review.
- CloudWatch metrics: records event counts, token estimates, cost estimates, validator rejections, and useful finding counts.
- Secrets Manager: stores external provider keys. No provider key should be available to app runtime Lambdas.

## Input Events

Start with existing signals before adding new tracking:

- `PORTAL_SUPPLEMENT_OUTCOME` from structured logs.
- `STUDIES_FETCHER_FAILURE` from enrichment and quiz routes.
- Analytics batches from `/api/portal/analytics`.
- Discovery queue items with high `searchCount` or old `pending` age.
- Critical canary results from `app/api/portal/quiz/route.test.ts` and `e2e/portal-real-search.spec.ts`.

Recommended event fields for the pilot:

```ts
export interface AuditInputEvent {
  source: 'portal_outcome' | 'analytics' | 'discovery_queue' | 'canary' | 'manual';
  query: string;
  normalizedQuery?: string;
  supplementName?: string;
  endpoint?: string;
  status?: 'completed' | 'processing' | 'failed' | 'insufficient_data' | 'upstream_unavailable';
  fallback?: string;
  finalStatusCode?: number;
  errorCode?: string;
  upstreamStatus?: number;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  sampleRequestIds?: string[];
}
```

SEO aggregate rows can be fed manually from Search Console or GA4 exports through the local event runner. These rows must stay aggregate-only:

```ts
export interface SeoAggregateAuditEvent {
  source: 'search_console' | 'ga4';
  query: string;
  pagePath: string; // path only, no query params or full URLs
  country?: string; // aggregate country label or ISO-3166 alpha-2
  clicks?: number;
  impressions?: number;
  ctr?: number;
  averagePosition?: number;
  channel?: string;
  eventName?: string;
  eventCount?: number;
  firstSeen?: string;
  lastSeen?: string;
}
```

Manual CSV exports should be converted with `scripts/research-audit/import-seo-export.ts` before they are passed to `scripts/research-audit/run-event-audit.ts`. This keeps Google API access outside the Frontier Agent runtime and gives reviewers an inspectable JSON/JSONL handoff.

SEO packets are advisory only. They may produce `seo_opportunity` findings for human review, but they must not write to production, alter SEO copy automatically, change clinical runtime, or open PRs automatically.

## Privacy And Redaction

The audit pipeline must transform raw events before any external model call. The LLM input should be an `AuditLLMPacket`, not the original event.

Redaction rules:

- Keep only supplement-like query text after normalization and validation.
- Drop IP address, user agent, referer, email, auth/session identifiers, free-text notes, full request bodies, and URLs.
- For Search Console/GA4 exports, keep page paths only. Drop full URLs, query params, session IDs, user IDs, raw payloads, and any user-level analytics fields.
- Replace request IDs with irreversible hashes or omit them from LLM input.
- Aggregate repeated queries before LLM calls; send counts and status distribution instead of individual user events.
- Truncate query fields to 120 characters and reject multiline text.
- Reject queries matching obvious PII patterns: email, phone number, street address, account number, government ID, URL with query params, or medical narrative longer than a supplement query.
- Redact demographic fields. The audit does not need age, gender, location, or sensitivities.
- Store raw logs only where they already exist; do not duplicate raw user payloads into the audit tables.

Recommended LLM packet:

```ts
export interface AuditLLMPacket {
  packetId: string;
  queryFingerprint: string;
  redactedQuery: string;
  normalizedQuery?: string;
  supplementName?: string;
  statusCounts: Record<string, number>;
  fallbackCounts: Record<string, number>;
  firstSeenDate: string;
  lastSeenDate: string;
  deterministicPubMedProfile?: DeterministicPubMedProfile;
  canaryContext?: string[];
}
```

Blocked examples:

- `"I am Juan, my email is ... and I take ..."`: reject before LLM.
- `"https://example.com?email=..."`: reject before LLM.
- `"dolor, tengo 63 anos, vivo en ..."`: reject before LLM; this is not a supplement audit query.

## Cases To Detect

Priority 1:

- Frequent `insufficient_data` queries with meaningful PubMed total counts.
- Queries with `processing` that stay unresolved or repeat often.
- Repeated `upstream_unavailable` for common supplements.
- Potential alias gaps, for example a common name not mapped to a scientific name.
- Regression candidates where a canary changed from `completed` to `insufficient_data`, or vice versa.

Priority 2:

- Editorial risk: unsupported percentages, overconfident wording, or treatment-style language.
- Product risk: products shown when clinical evidence is insufficient.
- Entity mix: one supplement being confused with another variant or ingredient.
- High-demand clusters for SEO/content planning, still separate from clinical claims.

## Agent Output Contract

The agent output must be JSON and must be validated before storage. A non-runtime JSON Schema lives at `docs/research-audit-finding.schema.json`; runtime code can later mirror it with Zod if the pilot proceeds.

```ts
export interface ResearchAuditFinding {
  findingId: string;
  createdAt: string;
  provider: 'kimi-k2.6' | 'kimi-k2.5' | 'gpt-5.4-nano' | 'gpt-5.4-mini' | 'gemini-flash-lite' | 'claude-haiku-4.5';
  taskType: 'alias_gap' | 'recall_gap' | 'clinical_claim_risk' | 'pipeline_failure' | 'seo_opportunity';
  severity: 'low' | 'medium' | 'high';
  supplementName: string;
  originalQueries: string[];
  problemDetected: string;
  evidenceBoundary: 'human_clinical_required' | 'preclinical_only' | 'editorial_only' | 'operational_only';
  suggestedAliases: string[];
  candidatePmids: string[];
  proposedClassification: 'needs_human_review' | 'likely_insufficient_data' | 'possible_recall_gap' | 'operational_bug';
  clinicalRisk: 'none' | 'low' | 'medium' | 'high';
  recommendedAction: string;
  blockedFromProduction: true;
  confidence: number;
}
```

Hard validator rules:

- `blockedFromProduction` must be `true`.
- `candidatePmids` must be PubMed IDs only.
- `proposedClassification` cannot be `works_for` or any equivalent final claim.
- `recommendedAction` cannot include direct clinical copy for users.
- Findings with `clinicalRisk !== 'none'` always require human review.
- `validatedPmids` must be a subset of `candidatePmids` that passed E-utilities verification.
- Unknown top-level JSON keys are rejected.
- Output larger than 16 KB is rejected.
- Any output containing product URLs, affiliate URLs, checkout references, or direct recommendation copy is rejected.

## Deterministic PMID Verification

PMIDs proposed by the agent are advisory until verified through PubMed/E-utilities.

Verification steps:

1. Extract numeric `candidatePmids` from validated JSON only.
2. Call E-utilities `esummary` or `efetch` for those PMIDs with the existing `PUBMED_TOOL_NAME` and `PUBMED_TOOL_EMAIL` conventions.
3. Reject IDs that do not resolve, are retracted-only notices without source articles, or are not PubMed records.
4. Fetch title, abstract when available, publication types, MeSH headings, year, journal, and DOI if present.
5. Re-run deterministic classification using the same category concepts as `lib/services/pubmed-literature-profile.ts`.
6. Attach `validatedPmids` and `pmidVerificationStatus` to the stored finding.
7. Mark findings as `needs_human_review` when any proposed PMID is missing, not human clinical, or mismatched to the supplement entity.

The LLM cannot promote a PMID to clinical evidence. It can only suggest candidates for deterministic verification and human review.

## Provider Shortlist

Prices checked on May 26, 2026 from official provider docs/pages:

- Kimi K2.6: $0.95 input cache miss, $0.16 input cache hit, $4.00 output per 1M tokens; 256k context; supports tool calls, JSON mode, caching, and web search.
- Kimi K2.5: $0.60 input, $0.10 cache hit, $3.00 output per 1M tokens from Kimi homepage pricing.
- OpenAI `gpt-5.4-nano`: $0.20 input, $0.02 cached input, $1.25 output per 1M tokens. Batch/Flex halves that to $0.10 input and $0.625 output.
- OpenAI `gpt-5.4-mini`: $0.75 input, $0.075 cached input, $4.50 output per 1M tokens. Batch/Flex halves that to $0.375 input and $2.25 output.
- Gemini Flash-Lite tier shown in Google pricing: $0.10 input and $0.40 output per 1M tokens for listed Flash-Lite entries. Gemini 3 Flash Preview is higher at $0.50 input and $3.00 output.
- Claude Haiku 4.5: $1.00 input and $5.00 output per 1M tokens; batch is $0.50 input and $2.50 output.

Recommendation for the pilot:

1. Use `gpt-5.4-nano` Batch/Flex or Gemini Flash-Lite for cheap classification/extraction.
2. Use Kimi K2.6 only for deeper long-context agent investigations where tool use and large context matter.
3. Keep Claude Haiku 4.5 as a quality baseline, not the cheapest default.

## Cost Model

Assumption per audited search/event:

- Lean classification: 2,000 input tokens + 500 output tokens.
- Deep investigation: 8,000 input tokens + 1,500 output tokens.

Approximate standard-mode cost per 1,000 audited searches:

| Provider | Lean / 1k | Deep / 1k |
| --- | ---: | ---: |
| GPT-5.4 nano | $1.03 | $3.48 |
| Gemini Flash-Lite | $0.40 | $1.40 |
| Kimi K2.5 | $2.70 | $9.30 |
| Kimi K2.6 | $3.90 | $13.60 |
| GPT-5.4 mini | $3.75 | $12.75 |
| Claude Haiku 4.5 | $4.50 | $15.50 |

At 100 searches, divide by 10. At 10,000 searches, multiply by 10. Web search/tool costs are excluded and should be disabled for the first pilot unless the task explicitly requires external corroboration.

Hard cost and volume limits:

- Default mode: `AUDIT_AGENT_ENABLED=false` and `AUDIT_AGENT_DRY_RUN=true`.
- Staging pilot: maximum 50 LLM packets/day.
- Production dry-run: maximum 100 LLM packets/day until reviewed.
- Per-packet input cap: 8,000 tokens.
- Per-packet output cap: 1,500 tokens.
- Daily token cap: 1,000,000 input tokens and 200,000 output tokens.
- Daily spend cap: $5 in staging, $10 in production dry-run.
- Web search/tool calls: disabled by default; max 0 calls/day unless explicitly enabled for a controlled experiment.
- Stop condition: disable the job automatically if schema-valid output rate drops below 95%, validator rejection exceeds 25%, or estimated spend exceeds 80% of the daily cap.

Cost accounting should happen before and after each provider call. If the pre-call estimate would exceed the cap, skip the call and store a `budget_skipped` audit event.

## Pilot Success Metrics

The pilot should be evaluated on signal, safety, and cost:

- Schema-valid output rate: target >= 98%.
- PMID verification pass rate for suggested PMIDs: target >= 80% for recall-gap findings.
- False-positive rate after human review: target <= 25%.
- Useful finding rate: target >= 10 actionable findings per 100 LLM packets.
- Safety violation rate: target 0 findings that attempt direct clinical claims, products, affiliates, or production changes.
- Cost per useful finding: target <= $1 during pilot.
- Duplicate finding rate: target <= 20% after aggregation.
- Time to human review: daily report available within 30 minutes of scheduled run.
- Regression detection: catches seeded canary fixture failures in provider comparison.

Provider comparison uses `docs/research-audit-provider-fixtures.json` and scores each provider on valid JSON, correct classification, useful action, verified PMID discipline, and refusal to create claims.

## Implementation Plan

Phase 0: documentation and safety contract

- Add this plan.
- Define the `ResearchAuditFinding` schema in a new non-runtime JSON Schema document.
- Add provider comparison fixtures for known cases: Garcinia, Piper auritum, Fadogia, Centella, Psyllium, Ashwagandha.

Phase 1: collect audit inputs without LLM

- Persist `/api/portal/analytics` batches to DynamoDB or reuse the discovery queue with a separate `source`.
- Add a small collector script or Lambda that aggregates daily counts by normalized query and outcome.
- Emit a JSONL file or DynamoDB table of `AuditInputEvent`.
- No LLM call yet.
- Redact and aggregate events before storage in the audit event table.

Phase 2: deterministic preflight

- For each candidate query, run `searchPubMedLiteratureProfile` with bounded `maxArticles`.
- Attach category counts and sampled PMIDs.
- Filter out low-value noise before calling any LLM.
- Verify all agent-suggested PMIDs after the call using E-utilities before storing them as `validatedPmids`.

Phase 3: LLM audit worker

- Add provider abstraction with strict JSON output and retry.
- Start with one provider behind env flags:
  - `AUDIT_AGENT_ENABLED=false`
  - `AUDIT_AGENT_PROVIDER=openai`
  - `AUDIT_AGENT_MODEL=gpt-5.4-nano`
  - `AUDIT_AGENT_DRY_RUN=true`
- Add budget flags:
  - `AUDIT_AGENT_MAX_EVENTS_PER_RUN=50`
  - `AUDIT_AGENT_MAX_INPUT_TOKENS_PER_EVENT=8000`
  - `AUDIT_AGENT_MAX_OUTPUT_TOKENS_PER_EVENT=1500`
  - `AUDIT_AGENT_DAILY_SPEND_LIMIT_USD=5`
- Store findings in a new `research-audit-findings` table or JSONL output during pilot.

Phase 4: validator and review queue

- Validate every finding with Zod.
- Reject findings with malformed PMIDs, production-copy suggestions, or final clinical claims.
- Produce a daily Markdown report grouped by severity and task type.
- Optional: create GitHub issues only for high-confidence operational bugs or alias gaps.
- Keep GitHub issue creation disabled until dry-run metrics meet pilot thresholds for two consecutive weeks.

Phase 5: human-reviewed improvements

- For alias gaps, propose changes to `lib/services/abbreviation-expander.ts` or `lib/services/pubmed-literature-profile.ts`.
- For canary gaps, propose additions to `app/api/portal/quiz/route.test.ts`.
- For editorial risks, propose copy changes with tests in `messages/clinical-copy.test.ts`.
- For SEO, write separate content briefs. Do not merge into clinical evidence logic.

## Test Plan

Unit tests:

- Schema rejects production-changing output.
- Schema rejects non-PMID candidate IDs.
- Schema rejects unknown keys, affiliate URLs, product URLs, and direct clinical recommendation copy.
- Redaction removes PII and rejects long medical narratives.
- Cost estimator matches fixed examples.
- Collector groups repeated outcomes correctly.
- PMID verifier rejects nonexistent PMIDs and mismatched entities.

Integration tests:

- A Garcinia fixture returns `possible_recall_gap` or `likely_insufficient_data`, never `worksFor`.
- A Piper auritum fixture stays `likely_insufficient_data` when only preclinical/phytochemical categories exist.
- A Centella fixture can suggest alias/recall improvements but cannot upgrade evidence grade directly.
- A Psyllium upstream failure fixture is classified as `pipeline_failure`, not clinical no-data.

Operational checks:

- Dry-run job writes findings but cannot touch supplement data.
- Production flags default to disabled.
- Logs include provider, model, token estimate, cost estimate, and finding count.
- Budget caps skip work before making provider calls.
- Provider fixture comparison produces a scorecard without changing application data.

## Rollout

1. Run locally on fixtures.
2. Run daily in staging with `AUDIT_AGENT_DRY_RUN=true`.
3. Compare provider quality on the same 50 events.
4. Pick default provider based on valid JSON rate, useful findings per dollar, and false-positive rate.
5. Enable production dry-run against logs only.
6. Add manual issue creation after two weeks of acceptable signal.

## Final Recommendation

Implement the pilot as an offline audit system. Use the cheap model for triage and reserve Kimi K2.6 for deeper investigations with larger context. Keep all clinical authority in deterministic PubMed filtering, existing canaries, and human review.
