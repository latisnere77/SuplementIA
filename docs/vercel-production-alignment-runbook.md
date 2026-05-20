# Vercel production alignment runbook

Use this when GitHub `main` is green but `https://suplementia.vercel.app` behaves like an older or different build.

## Current diagnosis

Checked on 2026-05-20:

- Expected production commit: `798fa5aa0ed696847bcf3522a9c3e90a21bd5cdf`
- Expected short commit: `798fa5a`
- Expected commit title: `Add portal release hardening checklist`
- Latest `main` Quality Gates run: `26190944232`
- Latest `main` Quality Gates result: success
- Public production URL: `https://suplementia.vercel.app`
- Public production server header: `server: Vercel`
- Public production build id observed in HTML: `akDizoROimnqD4W70mJXT`
- Public production portal chunk observed: `/_next/static/chunks/app/%5Blocale%5D/portal/page-a7daeb82f5999d34.js`
- Vercel CLI availability: installed locally
- Vercel CLI authentication: unavailable on this machine (`No existing credentials found`)
- Local `.vercel/project.json`: not present
- Repo `vercel.json`: not present
- GitHub deployments API: no deployment record for current `main`; recent records point to older SHAs.

The public API smoke currently returns this old failure path for all canaries:

```json
{"http":500,"state":"Hybrid Search Failed","fallback":"hybrid_search_debug_fail","error":"Hybrid Search Failed"}
```

`Hybrid Search Failed` and `hybrid_search_debug_fail` are not present in current `origin/main`; they are present in older commits such as `6475dac` (`Add Google Analytics tracking`). Treat this as production deploy drift before changing portal logic.

## Confirm current GitHub source of truth

```bash
git fetch origin main
git rev-parse origin/main
git log -1 --oneline origin/main
gh run list --branch main --limit 5 --json databaseId,workflowName,status,conclusion,createdAt,headSha
```

Expected:

- `origin/main` is `798fa5aa0ed696847bcf3522a9c3e90a21bd5cdf` or newer.
- Latest `Quality Gates` for that SHA is `success`.

## Confirm local Vercel access

```bash
vercel --version
vercel whoami
test -f .vercel/project.json && cat .vercel/project.json || echo "No local Vercel project link"
```

If `vercel whoami` fails, use the Vercel dashboard steps below or authenticate first:

```bash
vercel login
vercel link
```

When linking, verify the project is the one serving `https://suplementia.vercel.app`.

## Redeploy with Vercel CLI

Only run this after `vercel whoami` succeeds and `vercel link` points to the expected project:

```bash
git switch main
git pull --ff-only origin main
git rev-parse HEAD
vercel pull --yes --environment=production
vercel deploy --prod
```

After deploy, inspect the deployment:

```bash
vercel inspect <deployment-url>
```

Confirm:

- Project is the expected SuplementIA/SuplementAI portal project.
- Production domain includes `suplementia.vercel.app`.
- Source commit is `798fa5a` or newer.
- Production branch is `main`.

## Redeploy from Vercel dashboard

If CLI credentials are unavailable:

1. Open Vercel dashboard.
2. Find the project that owns `suplementia.vercel.app`.
3. Open **Settings -> Git**.
4. Confirm the connected repository is `latisnere77/SuplementIA`.
5. Confirm the production branch is `main`.
6. Open **Deployments**.
7. Find or create a deployment for commit `798fa5a` or the latest `origin/main` SHA.
8. Use **Redeploy** or trigger a new deployment from the latest `main`.
9. Promote that deployment to production if it is not promoted automatically.
10. Confirm the production alias/domain is assigned to that deployment.

If the project is not connected to `latisnere77/SuplementIA`, either reconnect the Git integration or update the public domain to point to the correct Vercel project.

## Production environment variables to verify

In Vercel dashboard **Settings -> Environment Variables**, verify production values are intentional:

| Variable | Expected/recommended state |
| --- | --- |
| `NODE_ENV` | Vercel sets `production` automatically |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Present if analytics should run |
| `SEARCH_BACKEND` | Optional. Use `local` as emergency safe mode if external search/LanceDB is unavailable |
| `USE_LANCEDB` | Optional. Set `false` if the Vercel runtime does not have a LanceDB table |
| `SEARCH_API_URL` | Optional. If unset, current code should fall back to local catalog when LanceDB is unavailable |
| `NEXT_PUBLIC_QUIZ_API_URL` | Should not point the browser at an old Lambda URL unless intentionally bypassing the Next portal API |

Current public diagnostic endpoint reports:

```json
{
  "NODE_ENV": "production",
  "SEARCH_API_URL": "undefined",
  "NEXT_PUBLIC_SEARCH_API_URL": "undefined"
}
```

That is compatible with current `main` if the current build is deployed, because current search service can fall back to the local catalog. It is not compatible with the old build that still returns `hybrid_search_debug_fail`.

## Production smoke after redeploy

Run this after the deployment has been promoted to production:

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
let failures = 0;
for (const c of cases) {
  const res = await fetch(`${base}/api/portal/quiz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: c.query, searchIntent: 'supplement' }),
  });
  const body = await res.json().catch(async () => ({ raw: (await res.text()).slice(0, 200) }));
  const serialized = JSON.stringify(body);
  const state = body.status || body.error || (body.success ? 'completed' : 'unknown');
  const fallback = body.metadata?.fallback || body.fallback || body.source || body.recommendation?.metadata?.fallback || body.recommendation?.source || 'none';
  const hasOldError = serialized.includes('Hybrid Search Failed') || serialized.includes('hybrid_search_debug_fail');
  const ok = c.expected.includes(state) && res.status < 500 && !hasOldError;
  if (!ok) failures += 1;
  console.log(JSON.stringify({
    query: c.query,
    http: res.status,
    state,
    fallback,
    success: body.success,
    error: body.error,
    oldHybridSearchError: hasOldError,
    ok,
  }));
}
if (failures) process.exit(1);
NODE
```

Acceptance after redeploy:

- No canary returns `Hybrid Search Failed`.
- No canary returns `hybrid_search_debug_fail`.
- No canary returns raw `500`.
- Magnesium, Creatine, Vitamin D, Melatonin, and Psyllium return useful completed results.
- Turmeric, Berberine, and Green tea extract return controlled `processing` or `completed`.
- Piper auritum and Fadogia agrestis return `insufficient_data`.

## If production still fails after deploying the correct commit

1. Confirm the deployment source commit in Vercel is `798fa5a` or newer.
2. Confirm the production alias `suplementia.vercel.app` points to that deployment.
3. Check Vercel function logs for:
   ```text
   event="PORTAL_SUPPLEMENT_OUTCOME"
   event="STUDIES_FETCHER_FAILURE"
   Hybrid Search Failed
   hybrid_search_debug_fail
   ```
4. If the old strings still appear, the domain is still pointing at an old deployment or a different project.
5. If the old strings are gone but canaries fail:
   - `backend_service_error`: inspect `/api/portal/recommend` and `/api/portal/enrich-v2`.
   - `upstream_unavailable`: inspect PubMed/studies-fetcher availability and rate limits.
   - LanceDB/native binding errors: set `SEARCH_BACKEND=local` and `USE_LANCEDB=false`, redeploy, and rerun smoke.
6. Once smoke passes, remove emergency env overrides only after confirming the external backend path is healthy.
