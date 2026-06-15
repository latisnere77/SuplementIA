# Model migration evaluation rubric

The goal is to decide whether a lower-cost model can replace the current
production baseline without degrading structured Spanish health content.

## Inputs

- Recovered production prompt template.
- Recovered production tool schema.
- Golden set in `eval/golden`.
- Candidate model id.
- Pricing from `eval/pricing.json`.

## Gates

| Criterion | Measurement | Pass threshold | Failure action |
| --- | --- | --- | --- |
| JSON validity | Parse response or tool input as JSON. | 100% valid JSON. | Fail candidate. |
| Required fields | Required top-level fields and nested `dosage.forms` exist and are non-empty. | 100% of test cases pass. | Fail candidate. |
| Medical factual accuracy | Human/secondary-source review for `dosage`, `maxSafeDose`, `safety.interactions`, PMIDs in `keyStudies`, `worksFor`, `limitedEvidence`, and `doesntWorkFor`. | No unsafe dosage, contraindication, missing-interaction, unsupported PMID, or evidence-grade regression. | Fail or require prompt/schema revision. |
| Spanish quality | Heuristic check plus human review for Spanish fluency, tone, and no English leakage in user-facing fields. | >= 90% automated heuristic and no major human review issue. | Candidate remains blocked. |
| Output token count | Estimated output tokens from serialized response. | Median <= production baseline; target <= 5K for Nova-class candidates. | Candidate cannot be considered cost winner. |
| Hallucination risk | Compare claims and cited study objects against golden output and external review queue. | No new strong medical claim without support. | Fail candidate or downgrade to human review. |
| Product safety | No products in generated output unless explicitly required by current product contract. | `products` absent or empty for this enricher path. | Fail candidate. |

## Medical factual-accuracy review queue

The dry-run harness prints a `medicalFactualGate` block for every golden item so
reviewers can budget and plan the paid A/B before any inference runs. The block
does not replace human review. It flags the fields that must be checked when a
candidate response is available:

- `dosage` and `dosage.forms`: dose ranges, max safe dose, duration, timing, and
  form-specific guidance.
- `safety.interactions`: medication, pregnancy/lactation, condition, and
  contraindication interactions.
- `keyStudies[].pmid`: PMID presence and exact match to the cited claim.
- `worksFor`, `limitedEvidence`, and `doesntWorkFor`: evidence grade,
  magnitude, participant counts, and claim scope.

Any candidate that changes dose, interaction, PMID, or evidence-grade claims
without support remains blocked even if it is cheaper.

## Required fields

The current golden outputs contain these expected top-level fields:

- `whatIsIt`
- `primaryUses`
- `dosage`
- `mechanisms`
- `worksFor`
- `limitedEvidence`
- `doesntWorkFor`
- `safety`
- `buyingGuidance`
- `practicalRecommendations`
- `keyStudies`
- `totalStudies`

Additional fields such as `synergies` are allowed when the recovered schema
requires them. The evaluator also checks `dosage.forms` because form guidance is
a product-critical nested field.

## Scorecard

Each candidate run should produce:

- `modelId`
- `jsonValidRate`
- `requiredFieldsRate`
- `medicalReviewRequiredCount`
- `medicalReviewFailedCount`
- `spanishHeuristicRate`
- `medianOutputTokens`
- `estimatedCostPer30Cases`
- `estimatedCostAtScale`
- `overall`: `PASS`, `FAIL`, or `BLOCKED`

`PASS` requires all hard gates to pass. Cost savings alone can never override a
medical factual-accuracy failure.
