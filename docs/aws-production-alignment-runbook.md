# AWS production alignment runbook

Use this when GitHub `main` is green but the public portal behaves differently from the latest release.

## Production endpoints

Checked on 2026-05-21:

- Canonical production URL: `https://suplementai.com`
- `www` production URL: `https://www.suplementai.com`
- Frontend delivery: AWS Amplify Hosting with Amplify-managed CloudFront
- Amplify-managed CloudFront distribution domain observed via DNS: `d2of3lawf9cckm.cloudfront.net`
- AWS account: `643942183354`
- Amplify app: `SuplementAI` / app id `d2yn3faih4ykom`
- Production branch: `main`
- Branch domain: `https://main.d2yn3faih4ykom.amplifyapp.com`
- Connected repository shown by Amplify: `https://github.com/latisnere77/suplementia`
- Repo build config present: `amplify.yml`
- Canonical app URL in code: `lib/seo.ts` exports `https://suplementai.com`
- Public runtime diagnostic: `https://suplementai.com/api/check-env`

`https://suplementia.vercel.app` is not the production endpoint. It is a legacy/desynchronized Vercel deployment and must not be used for release smoke. It currently reports missing AWS search env and can return old errors such as `Hybrid Search Failed` / `hybrid_search_debug_fail`.

AWS CLI check on 2026-05-20 found an unrelated/stale Amplify app named `suplementia` in account `239378269775`; that app had no branches or domain associations and its default Amplify domain did not serve `/api/check-env`. The live project is in account `643942183354` and requires assuming `CrossAccountAdminRole` through the local `suplementai-admin` AWS profile.

## Confirm current GitHub source of truth

```bash
git fetch origin main
git rev-parse origin/main
git log -1 --oneline origin/main
gh run list --branch main --limit 5 --json databaseId,workflowName,status,conclusion,createdAt,headSha
```

Expected:

- `origin/main` is the release commit you intend to verify.
- The latest `Quality Gates` run for that SHA is `success`.

## Confirm AWS production target

```bash
curl -I https://suplementai.com/en/portal
curl -sS https://suplementai.com/api/check-env
dig +short suplementai.com A
dig +short www.suplementai.com CNAME
```

Expected:

- Response has CloudFront headers such as `x-cache`, `via`, `x-amz-cf-pop`, or `x-amz-cf-id`.
- `www.suplementai.com` resolves through `d2of3lawf9cckm.cloudfront.net` unless the distribution changes intentionally.
- `/api/check-env` reports production AWS search status, for example `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH="true"` and whether search URLs are configured. It intentionally reports only booleans and a public host, not raw backend URLs.

## Verify AWS deployment

First identify the AWS service/project that actually owns `suplementai.com`. The current public DNS points to CloudFront, but the CloudFront distribution may be in another AWS account or managed outside the Amplify app visible to your current CLI credentials.

Useful discovery checks:

```bash
aws sts get-caller-identity
AWS_PROFILE=suplementai-admin aws sts get-caller-identity
AWS_PROFILE=suplementai-admin aws amplify list-apps --region us-east-1
AWS_PROFILE=suplementai-admin aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(join(',', Aliases.Items), 'suplementai.com')]"
AWS_PROFILE=suplementai-admin aws route53 list-hosted-zones-by-name --dns-name suplementai.com
```

The live project is Amplify:

1. Open AWS account `643942183354`.
2. Open Amplify app `SuplementAI` (`d2yn3faih4ykom`).
3. Confirm the connected repo is `latisnere77/suplementia`.
4. Confirm the production branch is `main`.
5. Confirm the latest deployment points at the intended `origin/main` SHA.
6. Confirm custom domains include `suplementai.com` and `www.suplementai.com`.
7. Review the latest build logs and confirm `amplify.yml` or the configured build spec ran `npm run build`.

Useful AWS CLI checks when credentials are available:

```bash
AWS_PROFILE=suplementai-admin aws amplify get-app --app-id d2yn3faih4ykom --region us-east-1
AWS_PROFILE=suplementai-admin aws amplify get-branch --app-id d2yn3faih4ykom --branch-name main --region us-east-1
AWS_PROFILE=suplementai-admin aws amplify list-domain-associations --app-id d2yn3faih4ykom --region us-east-1
AWS_PROFILE=suplementai-admin aws amplify list-jobs --app-id d2yn3faih4ykom --branch-name main --region us-east-1 --max-results 5
AWS_PROFILE=suplementai-admin aws amplify get-job --app-id d2yn3faih4ykom --branch-name main --job-id <job-id> --region us-east-1
```

Known-good deployment check from 2026-05-21:

- Amplify job `187` succeeded after the production env fix.
- Previous job `186` deployed commit `254fe2b720862fa964103634072ba11e506946d9`.
- `suplementai.com`, `www.suplementai.com`, and `main.d2yn3faih4ykom.amplifyapp.com` all served the fixed behavior after job `187`.

Amplify manages the CloudFront distribution for this app. Manual `aws cloudfront list-distributions` can return no distributions in this account even though Route 53 points at `d2of3lawf9cckm.cloudfront.net`; use Amplify domain association as the source of truth. Amplify invalidates its managed distribution during deploy, so a separate CloudFront invalidation is normally not available or needed from this account.

## Redeploy current main

Use this when `main` is green but production appears stale or when Amplify env vars changed:

```bash
AWS_PROFILE=suplementai-admin aws amplify start-job \
  --app-id d2yn3faih4ykom \
  --branch-name main \
  --region us-east-1 \
  --job-type RELEASE \
  --job-reason "Redeploy latest green main"
```

Watch the job:

```bash
AWS_PROFILE=suplementai-admin aws amplify get-job \
  --app-id d2yn3faih4ykom \
  --branch-name main \
  --job-id <job-id> \
  --region us-east-1
```

## Production environment variables to verify

In Amplify production branch `main`, verify values are intentional:

| Variable | Expected/recommended state |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://suplementai.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://suplementai.com` |
| `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH` | `true` in production |
| `NEXT_PUBLIC_SEARCH_API_URL` | Current AWS Lambda Function URL for supplement search |
| `STUDIES_API_URL` | Current AWS studies-fetcher endpoint |
| `ENRICHER_API_URL` | Current AWS content-enricher endpoint |
| `NEXT_PUBLIC_QUIZ_API_URL` | Currently set to the production quiz orchestrator Lambda URL |
| `PORTAL_API_URL` | Do not leave pointed at stale staging API unless that path is intentionally used |
| `SEARCH_BACKEND` | Optional emergency override: `local` |
| `USE_LANCEDB` | Optional emergency override: `false` if native LanceDB path is unhealthy |

`NEXT_PUBLIC_APP_URL` is required for server-side internal route fetches in Amplify SSR. If it is missing, `/api/portal/quiz` can resolve internal calls such as `/api/portal/recommend` and `/api/portal/enrich-v2` incorrectly and surface `backend_connection_failed` for cases that should be controlled `insufficient_data`.

`/api/check-env` is public. Keep it limited to coarse diagnostic status such as configured booleans and safe hostnames. Do not add raw secret values, signed URLs, API keys, bearer tokens, or full private backend URLs to that response.

To update branch env safely, export the current map, add only the needed keys, then update the branch:

```bash
AWS_PROFILE=suplementai-admin aws amplify get-branch \
  --app-id d2yn3faih4ykom \
  --branch-name main \
  --region us-east-1 \
  --query 'branch.environmentVariables' \
  --output json > /tmp/main-env.json

node -e "const fs=require('fs'); const env=JSON.parse(fs.readFileSync('/tmp/main-env.json','utf8')); env.NEXT_PUBLIC_APP_URL='https://suplementai.com'; env.NEXT_PUBLIC_SITE_URL='https://suplementai.com'; fs.writeFileSync('/tmp/main-env-updated.json', JSON.stringify(env));"

AWS_PROFILE=suplementai-admin aws amplify update-branch \
  --app-id d2yn3faih4ykom \
  --branch-name main \
  --region us-east-1 \
  --environment-variables file:///tmp/main-env-updated.json
```

Avoid using `suplementia.vercel.app` as any production base URL.

## Production smoke

Run the canary matrix against AWS production:

```bash
npm run smoke:production:portal
```

To test another environment explicitly:

```bash
PRODUCTION_BASE_URL=https://suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

Expected canary outcomes:

| Canary group | Supplements | Expected production outcome |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium, Ashwagandha | `200 completed`, useful evidence result, no `500` |
| Human clinical enrichment | Centella asiatica, gotu kola | `200 completed`, calibrated evidence result, no timeout or entity mix |
| Async enrichment | Turmeric, Berberine | `200 processing` or controlled `completed`, no `500` |
| Insufficient human clinical evidence | Green tea extract, Garcinia Cambogia, hoja de aguacate, Piper auritum, Fadogia agrestis | `404 insufficient_data`, no human clinical claims, no products |

The smoke fails if any canary returns raw `500`, `Hybrid Search Failed`, `hybrid_search_debug_fail`, unsafe clinical wording, or products in an `insufficient_data` response.

## Logs to inspect

Use CloudWatch logs for the deployed SSR functions and search/enrichment functions. If the app is served by Amplify, also inspect Amplify build and hosting logs. Search for:

```text
PORTAL_SUPPLEMENT_OUTCOME
STUDIES_FETCHER_FAILURE
backend_connection_failed
recommendation_generation_failed
upstream_unavailable
insufficient_data
Hybrid Search Failed
hybrid_search_debug_fail
```

Interpretation:

- `Hybrid Search Failed` or `hybrid_search_debug_fail`: the request is hitting stale code or a legacy endpoint.
- `backend_connection_failed` / `recommendation_generation_failed`: inspect internal route fetches and backend endpoint env first. In Amplify SSR, confirm `NEXT_PUBLIC_APP_URL=https://suplementai.com`; if it is missing, internal same-app fetches can resolve incorrectly.
- `upstream_unavailable`: controlled external outage/rate-limit path.
- `insufficient_data`: expected for botanicals without enough human clinical evidence.

## If AWS production differs from green main

1. Confirm `main` Quality Gates is green for the target SHA.
2. Confirm the AWS project that owns `suplementai.com` deployed that exact SHA on branch `main`.
3. Confirm `suplementai.com` points at the current CloudFront distribution and that the distribution points at the intended SSR origin.
4. Rerun:
   ```bash
   PRODUCTION_BASE_URL=https://suplementai.com npm run smoke:production:portal
   ```
5. If only production fails, inspect deployed env, SSR logs, and CloudWatch logs before changing clinical logic.
6. If local and production both fail on current `main`, add a focused regression test before patching.

## Legacy Vercel URL

`https://suplementia.vercel.app` is a legacy/desynchronized deployment. It can be useful only as a negative control for stale deployment symptoms. Do not use it for production release acceptance, SEO canonical URLs, smoke tests, or user-facing links.
