# Incremental Coverage Ratchet Proposal

Date: 2026-07-01

## Current Measured Baseline

Command executed:

```bash
npm test -- --runInBand --coverage
```

Result:

- Exit code: 0.
- Test suites: 111 passed, 2 skipped, 113 total.
- Tests: 834 passed, 15 skipped, 849 total.
- Global coverage: 65.94% statements, 55.03% branches, 70.94% functions, 67.04% lines.

Current `jest.config.js` global threshold remains:

```text
statements=1, branches=1, functions=1, lines=1
```

No threshold was lowered and `jest.config.js` was not edited.

## Ratchet Rule

Raise coverage by area only after that area has a stable focused harness and at least one
successful `npm test -- --runInBand --coverage` measurement on `main`.

Rules:

- Never lower the existing global threshold.
- Do not use global threshold jumps to force unrelated product work.
- Prefer per-path thresholds for stable, high-signal modules.
- Exclude generated fixture output only in a separate cleanup/spec if source map warnings are
  confirmed to distort coverage reporting.
- Each ratchet PR must include the coverage command output and the exact files covered.

## Proposed First Ratchets

| Area | Candidate Threshold | Reason | Harness |
| --- | --- | --- | --- |
| `lib/research-audit/**` | statements 80, branches 65, functions 80, lines 80 | Measured package coverage is already high and has many focused tests. | `npm test -- --runInBand --coverage` plus focused research-audit suites when changed. |
| `lib/portal/iherb-affiliate.ts` | statements 90, branches 85, functions 90, lines 90 | Pure function, stable offline monetization oracle, measured above 90% on key dimensions. | `npm test -- --runInBand --runTestsByPath lib/portal/iherb-affiliate.test.ts`. |
| `app/[locale]/portal/category/[slug]/seo.ts` | statements 80, branches 40, functions 90, lines 80 | SEO logic is user-facing and already near this threshold; branch ratchet should stay conservative. | focused SEO Jest tests plus Playwright if render behavior changes. |

## Areas Not Ready For Ratchet

| Area | Reason |
| --- | --- |
| `app/[locale]/portal/results/page.tsx` | Large UI surface with many uncovered branches; ratchet needs focused component tests first. |
| `components/portal/RankingAnalysisPanel.tsx` and `IntelligentRankingSection.tsx` | Very low measured coverage; adding thresholds now would block unrelated work. |
| `lib/services/pubmed-search.ts` and `vector-search.ts` | Low coverage and likely external/dependency-heavy behavior; needs mockable focused tests first. |
| `infrastructure/**` | Mixed legacy scripts/config; should be handled by script-specific gates rather than Jest thresholds first. |

## Source Map Observation

Coverage emitted SWC warnings for missing source maps:

```text
eval/fixtures/enricher-live-dist/prompts.js.map
eval/fixtures/enricher-live-dist/toolSchema.js.map
```

This did not fail the harness. Treat cleanup as a separate debt item because changing fixtures or
coverage ignore patterns is outside this task.

## Next Safe Step

Open a separate implementation task to add per-path thresholds for `lib/research-audit/**` only
after confirming the same coverage baseline on updated `origin/main`. Keep this proposal
documental until that implementation task is explicitly selected.
