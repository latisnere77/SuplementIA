# Research Audit Event Runner

This runner lets the Frontier Agent audit aggregated search/event summaries from a local JSON or JSONL file.

It is dry-run/report-only and disabled by default. It does not connect to AWS, write a database, or feed `/quiz`, `/recommend`, `enrich-v2`, UI, affiliate, PubMed production recall, smoke, product, or core runtime paths.

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
