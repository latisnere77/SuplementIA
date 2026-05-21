# Portal release hardening checklist

Use this checklist after portal releases that touch clinical gating, enrichment, search, or result rendering.

Last hardening pass:

- Date: 2026-05-20
- Expected main commit: latest green `origin/main`
- Production URL checked: `https://suplementai.com`
- Production delivery: AWS Amplify Hosting in account `643942183354`, app `SuplementAI` (`d2yn3faih4ykom`), with Amplify-managed CloudFront `d2of3lawf9cckm.cloudfront.net`.
- Legacy URL note: `https://suplementia.vercel.app` is not production and must not be used for release smoke.

## Local release validation

Run these from the repo root:

```bash
npm run lint
npm run type-check
npm run validate
npx playwright test e2e/portal.spec.ts --workers=1
RUN_REAL_SEARCHES=1 npx playwright test e2e/portal-real-search.spec.ts --workers=1
```

Expected result:

- Lint/type-check/build/Jest pass.
- Normal portal E2E passes on desktop and mobile.
- Real supplement browser matrix passes on desktop and mobile.

## GitHub Actions checks

Confirm the latest `main` run is green:

```bash
gh run list --branch main --limit 5 --json databaseId,workflowName,status,conclusion,createdAt,headSha
gh run watch <run-id> --exit-status
```

The `Quality Gates / Validate` job must pass:

- Install dependencies
- Install Playwright browsers
- Lint
- Type check
- Build
- Unit tests
- Audit dependencies
- Browser tests
- Real supplement browser matrix

## Production smoke

Run the focused API canary smoke against production:

```bash
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

Expected canary outcomes:

| Canary group | Supplements | Expected production outcome |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium | `200 completed`, useful nested `recommendation.supplement.worksFor`, no `500` |
| Async enrichment | Turmeric, Berberine, Green tea extract | `200 processing` or controlled `completed`, no `500` |
| Insufficient human clinical evidence | Piper auritum, Fadogia agrestis | `404 insufficient_data`, no human clinical claims |

If AWS production returns `Hybrid Search Failed` or `hybrid_search_debug_fail`, the request is hitting stale code or a legacy endpoint. Confirm the base URL is `https://suplementai.com`, then verify Amplify app `d2yn3faih4ykom` deployed the latest green `main`.

If Piper auritum or Fadogia agrestis return `500 backend_connection_failed`, verify Amplify branch `main` has `NEXT_PUBLIC_APP_URL=https://suplementai.com`, then redeploy the branch. Missing `NEXT_PUBLIC_APP_URL` can break internal SSR fetches before controlled `insufficient_data` handling runs.

For AWS production alignment and deploy checks, see
[`aws-production-alignment-runbook.md`](./aws-production-alignment-runbook.md).

## Production logs to check

Search production logs for structured portal outcomes:

```text
event="PORTAL_SUPPLEMENT_OUTCOME"
event="STUDIES_FETCHER_FAILURE"
```

Important fields:

- `endpoint`
- `supplementName`
- `originalQuery`
- `normalizedQuery`
- `status`
- `finalStatusCode`
- `errorCode`
- `upstreamStatus`
- `fallback`
- `elapsedTime`

Expected signals:

- Common evidence canaries should show `status="completed"` and often `fallback="local_catalog_fallback"`.
- Async canaries can show `status="processing"` with `fallback="async_enrichment"`.
- Piper auritum and Fadogia agrestis should show `status="insufficient_data"` and `fallback="insufficient_data"`.
- Studies-fetcher/PubMed outage should show `status="upstream_unavailable"`, `finalStatusCode=503`, and `fallback="upstream_unavailable"`, not a raw `500`.

## If a supplement starts returning 500

1. Confirm whether the error happens on current `main` locally:
   ```bash
   RUN_REAL_SEARCHES=1 npx playwright test e2e/portal-real-search.spec.ts --grep "Magnesium|Psyllium|fadogia agrestis" --workers=1
   ```
2. Check production logs for `PORTAL_SUPPLEMENT_OUTCOME` around the failed query.
3. Identify `fallback` and `errorCode`:
   - `backend_service_error`: inspect `/api/portal/recommend` and `/api/portal/enrich-v2` logs.
   - `upstream_unavailable`: inspect studies-fetcher/PubMed status, rate limits, and upstream status.
   - `hybrid_search_debug_fail`: redeploy current `main`; this is an old search failure path.
4. If only production fails and local/main is green, treat it as deployment/config drift first.
5. If current `main` reproduces it, add a focused unit or Playwright regression before patching.

## If a botanical without human evidence shows claims

1. Immediately test:
   ```bash
   npm test -- --runInBand --runTestsByPath app/api/portal/quiz/route.test.ts app/api/portal/enrich-v2/route.test.ts messages/clinical-copy.test.ts
   npx playwright test e2e/portal.spec.ts --grep "insufficient-data|supplement URL does not crash" --workers=1
   ```
2. Check whether the query is returning `completed` instead of `insufficient_data`.
3. Review the literature profile categories: `human_clinical`, `preclinical`, `phytochemical`, `review`, `other`.
4. Patch the smallest classifier/gating issue and add a canary test for that ingredient.
5. Confirm UI copy does not contain unsafe wording such as `sirve para`, `treats`, `cures`, `beneficio comprobado`, or `clinical benefit` in no-data states.

## Deployment or rollback

- Preferred fix for stale production: redeploy the latest green `main` commit.
- If the latest deploy introduces a new production-only failure, roll back to the previous green deployment and keep the failed smoke output with the run ID.
- After redeploy or rollback, rerun the production smoke above and confirm GitHub Actions is green on the target commit.
