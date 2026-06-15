# Model evaluation instrument

This directory is a decision instrument for a future `production-content-enricher`
model migration. It does not choose a model and it does not run paid inference by
default.

## Verified in this turn

- Bedrock account metadata for candidate model availability in `us-east-1` using
  `aws bedrock get-foundation-model`.
- Official AWS model-card URLs for output-token limits, API support, and model
  identity where AWS publishes them.
- Official AWS Pricing API rows for Bedrock `On-demand Inference` SKUs where
  a matching `us-east-1` SKU was found.
- A golden set of 30 existing completed production outputs from
  `suplementai-async-jobs`. No model was invoked to build the golden set.
- A fixture-only local harness in `eval/run.ts`.

## Blocked or unverified

- Faithful live A/B is blocked because the real TypeScript prompt and tool
  schema for `production-content-enricher` are not in this repo.
- Claude Haiku 4.5 and Claude Sonnet 4.5 pricing is marked `NOT CONFIRMED` in
  `pricing.md` because a matching `us-east-1` Bedrock Pricing API
  `On-demand Inference` SKU was not found in this run.
- Any capability value that is not published in a model card or returned by
  `get-foundation-model` is marked `UNVERIFIED`.

## Preconditions for live A/B

1. Recovered enricher TypeScript source, including the exact production prompt
   template and tool schema.
2. Explicit budget approval for paid Bedrock inference.

## Run fixture evaluation

```bash
npx tsx eval/run.ts --fixtures eval/fixtures --pricing eval/pricing.json
```

Expected behavior: the command scores committed fixtures and prints projected
costs for candidates with confirmed pricing. It must not call Bedrock.

## Run dry A/B request construction

```bash
npx tsx eval/run.ts --dry-run-ab --golden eval/golden --pricing eval/pricing.json
```

Expected behavior:

- Imports the real vendored `buildEnrichmentPrompt` and `ENRICHMENT_PROMPT_TEMPLATE`
  from `eval/fixtures/enricher-live-dist/prompts.js`.
- Imports the real vendored `ENRICHED_CONTENT_TOOL_CONFIG` from
  `eval/fixtures/enricher-live-dist/toolSchema.js`.
- Builds one dry Converse request per golden item and candidate model.
- Prints deterministic local input-token estimates from the real prompt + tool
  schema payload.
- Does not call Bedrock, CountTokens, or any paid inference endpoint.

Default dry-run candidates:

- Baseline: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, `maxTokens=16000`,
  `temperature=0.3`, `USE_TOOL_API=true`.
- Candidate: `us.anthropic.claude-haiku-4-5-20251001-v1:0`, `maxTokens=16000`,
  `temperature=0.3`, `USE_TOOL_API=true`.
- Candidate: `amazon.nova-lite-v1:0`, `maxTokens=5000`, `temperature=0.3`,
  `USE_TOOL_API=true`.
- Candidate: `amazon.nova-2-lite-v1:0`, `maxTokens=16000`, `temperature=0.3`,
  `USE_TOOL_API=true`.

Use `--model-id <candidate-id-or-model-id>` and `--max-tokens <n>` to construct
a focused dry run for one model or a different token cap. Live mode remains
blocked separately.

## Live mode guard

`--live` is intentionally blocked unless all explicit approvals and source files
are provided:

```bash
npx tsx eval/run.ts \
  --live \
  --budget-approved \
  --i-understand-paid-inference \
  --model-id <bedrock-model-or-inference-profile-id> \
  --prompt-file <recovered-prompt-template> \
  --schema-file <recovered-tool-schema-json> \
  --supplement magnesium
```

Do not run live mode until the source-provenance gate is green.

READY: evaluation instrument built. LIVE A/B BLOCKED pending (1) recovered
enricher TS source for a faithful prompt, and (2) explicit budget approval for
paid inference.
