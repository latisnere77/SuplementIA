# Research Audit Provider Adapter

This is the phase 2 dry-run/report-only adapter for the asynchronous Frontier Agent.

It is isolated to `lib/research-audit/` and `scripts/research-audit/`. It must not be imported by `/quiz`, `/recommend`, `enrich-v2`, UI, affiliate code, PubMed production recall, or product/core flows.

## Defaults

The provider runner is disabled by default:

```sh
AUDIT_AGENT_ENABLED=false
AUDIT_AGENT_DRY_RUN=true
AUDIT_AGENT_PROVIDER=kimi
AUDIT_AGENT_MODEL=kimi-k2.6
AUDIT_AGENT_MAX_EVENTS_PER_RUN=50
AUDIT_AGENT_MAX_INPUT_TOKENS_PER_EVENT=8000
AUDIT_AGENT_MAX_OUTPUT_TOKENS_PER_EVENT=1500
AUDIT_AGENT_MAX_SPEND_USD_PER_RUN=5
```

With defaults, the runner produces local skipped findings and makes zero external calls.

## Local Dry Run Without Provider Calls

```sh
npx tsx scripts/research-audit/run-provider-audit.ts --format json --limit 3
npx tsx scripts/research-audit/run-provider-audit.ts --format markdown --limit 3
```

Reports are written to `.research-audit-reports/`, which is ignored by git.

## Optional Kimi Provider Smoke Test

Only run this manually when explicitly testing provider connectivity:

```sh
AUDIT_AGENT_ENABLED=true \
AUDIT_AGENT_DRY_RUN=true \
AUDIT_AGENT_PROVIDER=kimi \
AUDIT_AGENT_MODEL=kimi-k2.6 \
MOONSHOT_API_KEY=... \
npx tsx scripts/research-audit/run-provider-audit.ts --format json --limit 1
```

The adapter uses Kimi's OpenAI-compatible Chat Completions endpoint at `https://api.moonshot.ai/v1/chat/completions`.

Even when enabled, this remains report-only:

- It writes local JSON/Markdown reports only.
- It never writes findings to DB.
- It never changes clinical runtime data.
- Providers may only propose `candidatePmids`.
- The manual runner verifies candidate PMIDs deterministically with PubMed E-utilities only when `--allow-pubmed-verifier` is explicitly passed.
- Without that flag, `validatedPmids` remains `[]` and `pmidVerificationStatus` remains `"not_checked"`.
- If PubMed verification fails, `validatedPmids` remains `[]` and `pmidVerificationStatus` becomes `"verification_failed"`.

## Safety Contract

The adapter builds a redacted audit packet before any provider call. The packet contains a query fingerprint, redacted query, aggregate status counts, and deterministic PubMed profile counts. It does not include raw request bodies, emails, IP addresses, user agents, sessions, or personal medical narratives.

Every provider response is normalized back into the `ResearchAuditFinding` Zod schema with report-only guards:

- `blockedFromProduction: true`
- `requiresHumanReview: true`
- `redactionApplied: true`
- provider-supplied `validatedPmids` are discarded before deterministic verification

Budget checks run before the provider call. If the estimated cost exceeds `AUDIT_AGENT_MAX_SPEND_USD_PER_RUN`, the packet is skipped before any external request.
