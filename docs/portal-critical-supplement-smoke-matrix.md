# Portal critical supplement smoke matrix

This matrix protects the portal cases that have recently regressed in production.
Keep deterministic unit/integration checks separate from live browser diagnostics:

- `app/api/portal/quiz/route.test.ts` owns the deterministic canary matrix.
- `e2e/portal-real-search.spec.ts` is a live diagnostic matrix and only runs when `RUN_REAL_SEARCHES=1`.
- `.github/workflows/quality-gates.yml` runs both the normal E2E suite and the live matrix in CI.

## Canary groups

| Group | Supplements | Expected behavior |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium | `200 completed`, `local_catalog_fallback`, curated `worksFor`, no backend fetcher dependency |
| Async enrichment | Turmeric, Berberine, Green tea extract | `200 processing` or controlled completion, no immediate preclinical `worksFor`, no 500 |
| Insufficient human clinical evidence | Piper auritum, Fadogia agrestis | `404 insufficient_data`, no clinical claims |
| Transient upstream failure | studies-fetcher 403/429/5xx class failures | `503 upstream_unavailable`, not `backend_service_error`/500 |

## Why these supplements

- `Piper auritum` and `Fadogia agrestis` guard against converting animal, in vitro, phytochemical, botanical, or agricultural literature into human clinical claims.
- `Psyllium` guards against a known studies-fetcher 403 path and verifies common high-evidence supplements can be served without a fragile upstream dependency.
- `Magnesium`, `Creatine`, `Vitamin D`, and `Melatonin` guard the fast local evidence path for common supplements.
- `Turmeric`, `Berberine`, and `Green tea extract` guard mixed-evidence supplements that should not be blocked too aggressively and should not return 500 while async enrichment runs.

When adding a new canary, prefer a deterministic route test first. Add it to the live browser matrix only if the value of testing the deployed network path outweighs the extra runtime and flake risk.
