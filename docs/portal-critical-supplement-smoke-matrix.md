# Portal critical supplement smoke matrix

This matrix protects the portal cases that have recently regressed in production.
Keep deterministic unit/integration checks separate from live browser diagnostics:

- `app/api/portal/quiz/route.test.ts` owns the deterministic canary matrix.
- `e2e/portal-real-search.spec.ts` is a live diagnostic matrix and only runs when `RUN_REAL_SEARCHES=1`.
- `.github/workflows/quality-gates.yml` runs both the normal E2E suite and the live matrix in CI.

## Canary groups

| Group | Supplements | Expected behavior |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium, Ashwagandha | `200 completed`, curated `worksFor`, no backend fetcher dependency |
| Human clinical enrichment | Centella asiatica, gotu kola | `200 completed`, canonicalized evidence result, calibrated moderate/preliminary claims |
| Async enrichment | Turmeric, Berberine | `200 processing` or controlled completion, no immediate preclinical `worksFor`, no 500 |
| Insufficient human clinical evidence | Green tea extract, Garcinia Cambogia, hoja de aguacate, Piper auritum, Fadogia agrestis | `404 insufficient_data`, no clinical claims, no products |
| Transient upstream failure | studies-fetcher 403/429/5xx class failures | `503 upstream_unavailable`, not `backend_service_error`/500 |

## Why these supplements

- `Green tea extract`, `Garcinia Cambogia`, `hoja de aguacate`, `Piper auritum`, and `Fadogia agrestis` guard against converting animal, in vitro, phytochemical, botanical, safety-only, mixed, or agricultural literature into human clinical claims or product recommendations.
- `Psyllium` guards against a known studies-fetcher 403 path and verifies common high-evidence supplements can be served without a fragile upstream dependency.
- `Magnesium`, `Creatine`, `Vitamin D`, `Melatonin`, and `Ashwagandha` guard the fast evidence path for common supplements.
- `Centella asiatica` and `gotu kola` guard canonicalization plus calibrated clinical recall, where moderate human evidence must not become overclaims.
- `Turmeric` and `Berberine` guard mixed-evidence supplements that should not be blocked too aggressively and should not return 500 while async enrichment runs.

When adding a new canary, prefer a deterministic route test first. Add it to the live browser matrix only if the value of testing the deployed network path outweighs the extra runtime and flake risk.

For the production smoke command and incident checklist, see
[`portal-release-hardening-checklist.md`](./portal-release-hardening-checklist.md).
