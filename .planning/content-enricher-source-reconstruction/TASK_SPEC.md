# Task spec: content enricher source reconstruction

## Objective

Reconstruct governed TypeScript source for `production-content-enricher` from the vendored live dist artifact under `eval/fixtures/enricher-live-dist/`, without touching AWS, Lambda, Terraform, production, or deploy state.

## In scope

- `services/content-enricher/**`
- `eval/fixtures/enricher-live-dist/**` input already present on the source-recovery branch
- `.planning/content-enricher-source-reconstruction/**`

## Out of scope

- Lambda deployment or environment changes.
- AWS writes, Lambda invoke/update, Terraform/EventBridge.
- Product/core, portal, SEO, checkout, auth, Frontier.
- Any change that unblocks `eval/run.ts --live`.

## Module plan

- `index`: reconstruct handler/orchestration from dist.
- `bedrock`, `bedrockConverse`: reconstruct Bedrock request paths faithfully; no live invocation during tests.
- `prompts`, `prompts-examine-style`: reconstruct prompt builders and validators; apply only the explicit `in` guard fix.
- `toolSchema`: reconstruct schema constant.
- `config`: preserve env-driven model/maxTokens/temperature; do not change defaults.
- `cache`, `job-store`, `studySummarizer`, `synergies`, `retry`, `types`: reconstruct from dist and `.d.ts`.

## Validation

- Service build: `npm --prefix services/content-enricher run build`
- Focused fidelity tests: `npm test -- --runTestsByPath services/content-enricher/__tests__/reconstruction.test.ts --runInBand`
- Repo validation: `npm run build`, `npm test`, `npm run type-check`, `npm run lint`, `npm audit`

