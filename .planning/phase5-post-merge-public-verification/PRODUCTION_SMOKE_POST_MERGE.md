# PRODUCTION_SMOKE_POST_MERGE — phase5-post-merge-public-verification

Run date: 2026-06-29

Mode: public/read-only HTTP smoke after PR #193 was merged to `main`. No deploy,
`.deploy-go`, AWS API, Lambda invoke/update, Terraform/EventBridge, feature flag,
Bedrock, LanceDB, checkout/live purchase, real GitHub issue, provider/PubMed direct call,
or `production-content-enricher` action was performed.

## Main State

- `main` HEAD during verification: `368a7905dfa47b3ac7288cda1aef1d5fed5c8829`.
- PR #193 merge commit: `368a7905dfa47b3ac7288cda1aef1d5fed5c8829`.
- PR #193 scoped 504 hardening is present on `main`.
- `.deploy-go` was absent.

## Commands

```bash
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

## Summary

| Base URL | Result | Failures | Notes |
| --- | --- | ---: | --- |
| `https://suplementai.com` | PASS | 0 | `Cannabis sativa` completed in ~8.3s; Centella/gotu kola passed with prudent liver warning. |
| `https://www.suplementai.com` | PASS | 0 | All 16 canaries passed. |
| `https://main.d2yn3faih4ykom.amplifyapp.com` | PASS | 0 | All 16 canaries passed. |

## Canary Coverage

All three public bases passed:

- Local catalog evidence: `Magnesium`, `Creatine`, `Vitamin D`, `Melatonin`,
  `Psyllium`, `Ashwagandha`.
- Broad botanical/clinical canaries: `Cannabis sativa`, `Centella asiatica`, `gotu kola`.
- Async enrichment canaries: `Turmeric`, `Berberine` returned controlled `processing`.
- Insufficient-evidence canaries: `Green tea extract`, `Garcinia Cambogia`,
  `hoja de aguacate`, `Piper auritum`, `Fadogia agrestis` returned controlled
  `insufficient_data` with no products.

## Interpretation

The post-merge public smoke passed on all required public URLs. This documents evidence
that the previously observed HTTP 504 pattern was not present during the post-merge
read-only verification window.

This evidence does not mark Phase 5 `HECHO`. `ROADMAP.md` still classifies Phase 5 as
`ESPERA_GATE` because production release acceptance remains a separate human-owned gate.
