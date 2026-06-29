# PRODUCTION_SMOKE — portal-production-verification

Run date: 2026-06-29

Mode: public/read-only HTTP smoke only. No deploy, `.deploy-go`, AWS API, Lambda,
Terraform/EventBridge, feature flag, Bedrock, LanceDB, checkout/live purchase, real
GitHub issue, provider/PubMed direct call, or `production-content-enricher` action was
performed.

## Commands

```bash
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

## Summary

| Base URL | Result | Failures | Failed canaries |
| --- | --- | ---: | --- |
| `https://suplementai.com` | FAIL | 3 | `Cannabis sativa`, `Centella asiatica`, `gotu kola` |
| `https://www.suplementai.com` | FAIL | 3 | `Cannabis sativa`, `Centella asiatica`, `gotu kola` |
| `https://main.d2yn3faih4ykom.amplifyapp.com` | FAIL | 1 | `Cannabis sativa` |

## Passing Coverage

All three public bases passed these groups:

- Local catalog evidence: `Magnesium`, `Creatine`, `Vitamin D`, `Melatonin`,
  `Psyllium`, `Ashwagandha`.
- Async enrichment: `Turmeric`, `Berberine` returned controlled `processing`.
- Insufficient human clinical evidence: `Green tea extract`, `Garcinia Cambogia`,
  `hoja de aguacate`, `Piper auritum`, `Fadogia agrestis` returned controlled
  `insufficient_data` with no products.

Additional distinction:

- `Centella asiatica` and `gotu kola` failed with HTTP 504 on `suplementai.com` and
  `www.suplementai.com`.
- `Centella asiatica` and `gotu kola` passed on the Amplify public branch URL with
  `completed`, `worksForCount=3`, and prudent liver warning detected.

## Failed Canary Details

### `https://suplementai.com`

- `Cannabis sativa`: HTTP 504, state `unknown`, fallback `none`, duration ~28.2s.
- `Centella asiatica`: HTTP 504, state `unknown`, fallback `none`, no prudent liver
  warning detected because no JSON result was returned, duration ~28.3s.
- `gotu kola`: HTTP 504, state `unknown`, fallback `none`, no prudent liver warning
  detected because no JSON result was returned, duration ~28.3s.

### `https://www.suplementai.com`

- `Cannabis sativa`: HTTP 504, state `unknown`, fallback `none`, duration ~28.2s.
- `Centella asiatica`: HTTP 504, state `unknown`, fallback `none`, duration ~28.3s.
- `gotu kola`: HTTP 504, state `unknown`, fallback `none`, duration ~28.4s.

### `https://main.d2yn3faih4ykom.amplifyapp.com`

- `Cannabis sativa`: HTTP 504, state `unknown`, fallback `none`, duration ~28.2s.

## Interpretation

Production verification did not pass. The failure pattern suggests:

- A cross-base timeout for `Cannabis sativa`.
- A custom-domain-specific timeout for `Centella asiatica` and `gotu kola`, because the
  Amplify public branch URL passed those two canaries.

This task does not authorize deploy, AWS reads/writes, production log access, Lambda,
Terraform/EventBridge, feature flags, Bedrock, LanceDB, or product fixes. A separate
scoped fix or gated production investigation is required.
