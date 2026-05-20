# Portal release hardening checklist

Use this checklist after portal releases that touch clinical gating, enrichment, search, or result rendering.

Last hardening pass:

- Date: 2026-05-20
- Expected main commit: `6aa5f51` (`Fix portal audit regressions`)
- GitHub Actions: `main` Quality Gates passed for run `26132705426`
- Production URL checked: `https://suplementia.vercel.app`
- Production canary smoke result: blocked by stale/unhealthy production deployment returning `500 Hybrid Search Failed` / `hybrid_search_debug_fail` for all canaries. That error string is not present in current `origin/main`, so redeploy production before considering the release fully live.

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
node - <<'NODE'
const base = 'https://suplementia.vercel.app';
const cases = [
  { query: 'Magnesium', expected: ['completed'] },
  { query: 'Creatine', expected: ['completed'] },
  { query: 'Vitamin D', expected: ['completed'] },
  { query: 'Melatonin', expected: ['completed'] },
  { query: 'Psyllium', expected: ['completed'] },
  { query: 'Turmeric', expected: ['processing', 'completed'] },
  { query: 'Berberine', expected: ['processing', 'completed'] },
  { query: 'Green tea extract', expected: ['processing', 'completed'] },
  { query: 'Piper auritum', expected: ['insufficient_data'] },
  { query: 'Fadogia agrestis', expected: ['insufficient_data'] },
];
const unsafeClaimPattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;
let failures = 0;
for (const c of cases) {
  const started = Date.now();
  const res = await fetch(`${base}/api/portal/quiz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: c.query, searchIntent: 'supplement' }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  const state = body.status || body.error || (body.success ? 'completed' : 'unknown');
  const fallback = body.metadata?.fallback || body.fallback || body.source || body.recommendation?.metadata?.fallback || body.recommendation?.source || 'none';
  const ok = c.expected.includes(state) && res.status < 500 && !unsafeClaimPattern.test(text);
  if (!ok) failures += 1;
  console.log(JSON.stringify({
    query: c.query,
    http: res.status,
    state,
    success: body.success,
    fallback,
    worksForCount: body.recommendation?.worksFor?.length ?? body.recommendation?.works_for?.length ?? 0,
    error: body.error,
    durationMs: Date.now() - started,
    ok,
  }));
}
if (failures) process.exit(1);
NODE
```

Expected canary outcomes:

| Canary group | Supplements | Expected production outcome |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium | `200 completed`, useful `worksFor`, no `500` |
| Async enrichment | Turmeric, Berberine, Green tea extract | `200 processing` or controlled `completed`, no `500` |
| Insufficient human clinical evidence | Piper auritum, Fadogia agrestis | `404 insufficient_data`, no human clinical claims |

If production returns `Hybrid Search Failed` or `hybrid_search_debug_fail`, production is not running the current hardened portal code. Redeploy the latest `main` commit before debugging clinical gating.

For the exact Vercel diagnosis and redeploy steps for `https://suplementia.vercel.app`, see
[`vercel-production-alignment-runbook.md`](./vercel-production-alignment-runbook.md).

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
