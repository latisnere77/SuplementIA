# Research Audit Event Runner

This runner lets the Frontier Agent audit aggregated search/event summaries from a local JSON or JSONL file.

It is dry-run/report-only and disabled by default. It does not connect to AWS, write a database, or feed `/quiz`, `/recommend`, `enrich-v2`, UI, affiliate, PubMed production recall, smoke, product, or core runtime paths.

It can also audit aggregated SEO signals exported manually from Search Console or GA4. These inputs must be aggregate rows only; do not include IP addresses, user agents, emails, session IDs, full URLs with query params, or raw Analytics payloads.

## Input

Use either a JSON array:

```json
[
  {
    "id": "magnesium-completed",
    "query": "Magnesium",
    "normalizedQuery": "Magnesium",
    "statusCounts": { "completed": 12 },
    "fallbackCounts": { "local_catalog": 12 },
    "deterministicPubMedProfile": {
      "totalCount": 42,
      "categories": {
        "human_clinical": 8,
        "review": 4,
        "preclinical": 10,
        "phytochemical": 0,
        "other": 20
      }
    }
  }
]
```

Or JSONL with one event object per line.

The runner redacts every `query` before packet creation. Events containing emails, URLs, phone-like values, address-like text, or long personal medical narratives are rejected before any provider call.

SEO aggregate events use the same file shape with `source: "search_console"` or `source: "ga4"`:

```json
[
  {
    "source": "search_console",
    "id": "bacopa-gsc-es",
    "query": "bacopa monnieri",
    "pagePath": "/es/portal/supplement/bacopa-monnieri",
    "country": "Mexico",
    "clicks": 0,
    "impressions": 42,
    "ctr": 0,
    "averagePosition": 58.3,
    "firstSeen": "2026-05-01T00:00:00.000Z",
    "lastSeen": "2026-05-31T00:00:00.000Z"
  },
  {
    "source": "ga4",
    "id": "magnesium-outbound-clicks",
    "query": "magnesium",
    "pagePath": "/es/portal/results",
    "country": "Colombia",
    "channel": "organic",
    "eventName": "outbound_click",
    "eventCount": 3,
    "firstSeen": "2026-05-01T00:00:00.000Z",
    "lastSeen": "2026-05-31T00:00:00.000Z"
  }
]
```

For SEO aggregate events, `pagePath` must be a path without query params or fragments, such as `/es/portal/supplement/bacopa-monnieri`. Full URLs and paths like `/es/portal/results?q=magnesium` are rejected. Provider findings for these packets are forced to `taskType: "seo_opportunity"`, `clinicalRisk: "none"`, and `blockedFromProduction: true`.

## Convert Search Console or GA4 CSV Exports

Use the local importer to convert manually downloaded Google CSV exports into the JSON or JSONL shape accepted by the event runner. This is still offline/report-only: it does not connect to Google APIs, does not store credentials, and does not write production data.

Search Console exports can include columns such as:

- `Query`, `Page`, `Country`
- `Clicks`, `Impressions`, `CTR`, `Position`

GA4 exports can include columns such as:

- `Event name`, `Event count`
- `Session default channel group`
- `Page path`
- `Query`, `Country`

The importer accepts full URLs only when they have no query params or fragments, and converts them to paths. URLs or paths containing `?` or `#` are rejected. Exports must not include IP addresses, user agents, emails, session IDs, or raw Analytics payloads.

```sh
npx tsx scripts/research-audit/import-seo-export.ts \
  --input ./gsc-queries.csv \
  --source search_console \
  --format jsonl \
  --output ./seo-events.jsonl \
  --id-prefix gsc-7d \
  --first-seen 2026-05-26 \
  --last-seen 2026-06-02
```

```sh
npx tsx scripts/research-audit/import-seo-export.ts \
  --input ./ga4-events.csv \
  --source ga4 \
  --format jsonl \
  --output ./seo-events.jsonl \
  --id-prefix ga4-events-7d
```

Then run the existing Frontier Agent event runner:

```sh
npx tsx scripts/research-audit/run-event-audit.ts \
  --input ./seo-events.jsonl \
  --format markdown \
  --limit 10
```

## Local Run

```sh
npx tsx scripts/research-audit/run-event-audit.ts --input ./events.json --format json
npx tsx scripts/research-audit/run-event-audit.ts --input ./events.jsonl --format markdown --limit 10
```

Reports are written to `.research-audit-reports/`, which is ignored by git.

## Optional Moonshot Key From Secrets Manager

The runner only reads AWS Secrets Manager when explicitly requested for a manual provider smoke. It first uses local `MOONSHOT_API_KEY` or `KIMI_API_KEY`; if neither is set and `--use-aws-secret` is passed, it reads this default secret:

```sh
suplementia/research-audit/moonshot-api-key
```

Manual smoke command shape:

```sh
AUDIT_AGENT_ENABLED=true \
AUDIT_AGENT_DRY_RUN=true \
AUDIT_AGENT_PROVIDER=kimi \
AUDIT_AGENT_MODEL=kimi-k2.6 \
npx tsx scripts/research-audit/run-event-audit.ts \
  --input ./events.json \
  --format json \
  --skip-pmid-verifier \
  --use-aws-secret
```

Use `--aws-secret-id` or `--aws-region` only when testing a non-default secret location. The runner never prints the secret value.

## Optional PubMed Verification Smoke

The event runner does not call PubMed/E-utilities by default. Provider-only smokes should keep using:

```sh
--skip-pmid-verifier
```

To run a separate manual PMID verification smoke, explicitly opt in:

```sh
AUDIT_AGENT_ENABLED=true \
AUDIT_AGENT_DRY_RUN=true \
npx tsx scripts/research-audit/run-event-audit.ts \
  --input ./events.json \
  --format json \
  --use-aws-secret \
  --allow-pubmed-verifier \
  --pmid-verifier-max-pmids 20 \
  --pmid-verifier-timeout-ms 5000
```

Use `--pmid-verifier-endpoint` only for local mock servers or controlled E-utilities smoke testing. The verifier is deterministic: it only copies PMIDs into `validatedPmids` when PubMed ESummary returns an article summary for the numeric candidate PMID.

The local JSON report also includes reviewer-only PMID context when verification runs:

- `articleSummaries`: PMID, title, journal, year, and title terms that matched the audited entity.
- `matchedPmids`: PMIDs whose ESummary title contains the supplement name, original query, or suggested alias.
- `pmidEntityMatchStatus`: a deterministic title-match summary for reviewer triage.
- `reviewWarnings`: local warnings such as PubMed-existing PMIDs whose titles do not match the audited entity.

These fields do not change production behavior and do not prove clinical relevance. They are only a local review aid before human review.

## Defaults

```sh
AUDIT_AGENT_ENABLED=false
AUDIT_AGENT_DRY_RUN=true
```

With defaults, provider packets are skipped with `externalCalls: 0`. Provider calls require an explicit manual opt-in and still remain report-only.
