# Corrected paid enricher model A/B verdict

This rescoring reused the saved paid outputs only. No Bedrock inference was invoked.

## Corrected absolute medical gate

- PMIDs fail only when NCBI PubMed E-utilities confirms they do not exist.
- Dose failures are limited to internally inconsistent ranges or clearly dangerous/impossible values.
- Safety/interactions are scored by absolute non-trivial presence, not by similarity to the Sonnet golden output.
- The Sonnet 4.5 golden output is scored as `sonnet-baseline`.

## Model comparison

| Model | Completed | Failed | Avg score | Medical failures | Fabricated PMIDs | Dangerous dose flags | Missing safety | Input tokens | Output tokens | Cost | Cost/item | Avg latency |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| sonnet-baseline | 30 | 0 | 0.99 | 0 | none | 0 | 0 | 0 | 514314 | $0.000000 | $0.000000 | 116325 ms |
| haiku-4.5 | 30 | 0 | 0.947 | 0 | none | 0 | 0 | 291894 | 298494 | $1.784364 | $0.059479 | 70763 ms |
| nova-lite | 30 | 0 | 0.914 | 1 | none | 0 | 1 | 251977 | 67861 | $0.031402 | $0.001047 | 15266 ms |

## Fabricated PMIDs by model

- sonnet-baseline: none
- haiku-4.5: none
- nova-lite: none

## Verdict

No candidate matches or exceeds the corrected absolute baseline gate; do not migrate yet.
