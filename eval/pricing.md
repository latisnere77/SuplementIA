# Bedrock pricing anchor

Read-only source: AWS Pricing API with:

- `serviceCode=AmazonBedrock`
- `location=US East (N. Virginia)`
- `feature=On-demand Inference`

Only rows with both input and output token SKUs are marked `CONFIRMED`.

| Candidate | Pricing API model | Status | Input $/1M | Output $/1M | Input SKU | Output SKU | Effective date |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Amazon Nova Lite | `Nova Lite` | `CONFIRMED` | 0.06 | 0.24 | `QRGWJ3P8FT28EYX2` | `CBZ6A6U7XK8WJ3KA` | 2026-06-01 |
| Amazon Nova 2 Lite | `Nova 2.0 Lite` | `CONFIRMED` | 0.33 | 2.75 | `FY8T82UUN7VZR55K` | `DY69Q8C3F88CHA2Q` | 2026-06-01 |
| Amazon Nova Pro | `Nova Pro` | `CONFIRMED` | 0.80 | 3.20 | `8X836UXRHN5Q5T2H` | `ARFVY95XGU794VBG` | 2026-06-01 |
| Mistral Large 3 | `Mistral Large 3` | `CONFIRMED` | 0.50 | 1.50 | `F6SEZYUB98SAU4VQ` | `3BG26FXFTP3HQ6SM` | 2026-06-01 |
| Claude Haiku 4.5 | N/A | `NOT CONFIRMED` | N/A | N/A | N/A | N/A | N/A |
| Claude Sonnet 4.5 baseline | N/A | `NOT CONFIRMED` | N/A | N/A | N/A | N/A | N/A |

## Important constraints

- Do not substitute third-party tracker prices for rows marked `NOT CONFIRMED`.
- Claude Haiku 4.5 and Sonnet 4.5 are available in the account via inference
  profiles, but this run did not find matching `us-east-1` on-demand token SKUs
  in the Pricing API.
- Nova 2 Lite also exposes flex and priority rows. The table uses standard
  input/output token rows, not flex/priority.
- Pricing rows are copied into `eval/pricing.json` for the local estimator.
