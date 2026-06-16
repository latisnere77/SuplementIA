# Change manifest: content enricher source reconstruction

## Summary

Created `services/content-enricher/` as the governed TypeScript source reconstruction for the live `production-content-enricher` artifact. The reconstruction is based on the vendored live dist under `eval/fixtures/enricher-live-dist/`, with `.d.ts` files used as the public contract anchor.

## Modules reconstructed

- `index`
- `bedrock`
- `bedrockConverse`
- `prompts`
- `prompts-examine-style`
- `toolSchema`
- `config`
- `cache`
- `job-store`
- `studySummarizer`
- `synergies`
- `types`
- `retry`

No module is marked BLOCKED in this pass. The reconstruction is mechanical and intentionally conservative.

## Functional changes

- Fixed `validateEnrichedContent` so malformed `data`, `dosage`, or `safety` shapes return validation errors instead of throwing from the `in` operator.
- Added normalization for `dosage` and `safety` when they are JSON strings.
- Preserved model, max tokens, and temperature as env-driven config. No default model change was made.

## Fidelity checks

- `buildEnrichmentPrompt` output is compared against the live dist fixture for every `eval/golden` supplement.
- `ENRICHED_CONTENT_TOOL_CONFIG` is compared against the live dist fixture.
- The Haiku-observed `dosage`/`safety` string shapes are covered by tests and no longer throw.
- The service build compiles to `dist/` via `npm --prefix services/content-enricher run build`.

## Production safety

No Lambda, AWS, Terraform, Bedrock, deploy, or production state was touched.

