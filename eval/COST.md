# Scale cost model

This model is deliberately a range. User cost depends on cache hit rate and on
whether content is shared catalog output or personalized per user.

## Assumptions

- Calls per active user per month: 5.
- Token profile per cache miss: 10,000 input tokens and 11,000 output tokens.
- Current observed cache-hit best case: 84%.
- Worst case: 0% cache hit / fully personalized generation.
- Confirmed prices come from `eval/pricing.json`.
- Claude Haiku 4.5 and Claude Sonnet 4.5 are listed as `NOT CONFIRMED` in the
  Bedrock Pricing API run, so the table cannot claim official AWS cost for them.

## Confirmed per-call costs

| Model | Status | Cost per miss |
| --- | --- | ---: |
| Nova Lite | Confirmed | $0.00324 |
| Nova 2.0 Lite | Confirmed | $0.03355 |
| Nova Pro | Confirmed | $0.04320 |
| Mistral Large 3 | Confirmed | $0.02150 |
| Claude Haiku 4.5 | Not confirmed | N/A |
| Claude Sonnet 4.5 | Not confirmed | N/A |

## Monthly range

| Users | Monthly logical calls | Misses at 84% cache hit | Misses at 0% cache hit |
| ---: | ---: | ---: | ---: |
| 1,000 | 5,000 | 800 | 5,000 |
| 10,000 | 50,000 | 8,000 | 50,000 |
| 100,000 | 500,000 | 80,000 | 500,000 |

| Users | Nova Lite best/worst | Nova 2 Lite best/worst | Nova Pro best/worst | Mistral Large 3 best/worst |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | $2.59 / $16.20 | $26.84 / $167.75 | $34.56 / $216.00 | $17.20 / $107.50 |
| 10,000 | $25.92 / $162.00 | $268.40 / $1,677.50 | $345.60 / $2,160.00 | $172.00 / $1,075.00 |
| 100,000 | $259.20 / $1,620.00 | $2,684.00 / $16,775.00 | $3,456.00 / $21,600.00 | $1,720.00 / $10,750.00 |

## Interpretation

- The biggest product-scale control is cache architecture: 84% cache hit makes
  all confirmed candidates 6.25x cheaper than a fully personalized path.
- A model with a lower token price can still fail if it cannot reliably emit
  valid long structured Spanish output.
- Cost is not a pass condition. It is evaluated after JSON validity, schema
  completeness, Spanish quality, and medical factual-accuracy gates.
