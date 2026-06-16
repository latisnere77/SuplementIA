# Change manifest: corrected absolute medical gate for enricher A/B

## Summary

- Replaced the relative-to-golden medical gate with an absolute gate:
  - PMIDs are failures only when NCBI PubMed E-utilities confirms they do not exist.
  - Dose failures are limited to internally inconsistent ranges or clearly dangerous/impossible values.
  - Safety/interactions are checked by absolute non-trivial presence.
- Added offline re-scoring mode for saved paid A/B outputs without invoking Bedrock.
- Added `sonnet-baseline` scoring from the existing golden outputs.
- Wrote corrected results under `eval/results/paid-ab-2026-06-15T23-05-13-395Z/`.

## Result

The corrected verdict remains: no candidate matches or exceeds the Sonnet baseline on absolute quality. Haiku clears the medical gate but scores below baseline. Nova Lite has one missing-safety-interactions failure and scores below baseline.

## Validation

- `npm test`: pass
- `npm run type-check`: pass
- `npm run lint`: pass
- `npm audit`: pass, 0 vulnerabilities

