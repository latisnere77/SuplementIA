# Task spec: corrected absolute medical gate for enricher A/B

## Objective

Re-score the saved paid A/B outputs in `eval/results/paid-ab-2026-06-15T23-05-13-395Z/` without invoking Bedrock, replacing the prior relative-to-Sonnet medical gate with an absolute medical gate.

## In scope

- `eval/run.ts`
- `eval/results/paid-ab-2026-06-15T23-05-13-395Z/VERDICT-CORRECTED.md`
- `eval/results/paid-ab-2026-06-15T23-05-13-395Z/summary-corrected.json`
- `eval/results/paid-ab-2026-06-15T23-05-13-395Z/pubmed-cache.json`
- `.planning/enricher-absolute-medical-gate/TASK_SPEC.md`
- `.planning/enricher-absolute-medical-gate/CHANGE_MANIFEST.md`

## Out of scope

- No Bedrock inference.
- No Lambda, AWS infra, Terraform, deploy, or production changes.
- No changes to the `runLive` guard that would unblock live paid inference.
- No product/core, portal, SEO, checkout, auth, or Frontier changes.

## Validation

- `npm test`
- `npm run type-check`
- `npm run lint`
- `npm audit`

Portal e2e is not required because this task does not touch portal rendering.

