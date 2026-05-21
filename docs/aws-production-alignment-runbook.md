# AWS production alignment runbook

Use this when GitHub `main` is green but the public portal behaves differently from the latest release.

## Production endpoints

Checked on 2026-05-20:

- Canonical production URL: `https://suplementai.com`
- `www` production URL: `https://www.suplementai.com`
- Frontend delivery: AWS CloudFront
- CloudFront distribution domain observed via DNS: `d2of3lawf9cckm.cloudfront.net`
- Repo build config present: `amplify.yml`
- Canonical app URL in code: `lib/seo.ts` exports `https://suplementai.com`
- Public runtime diagnostic: `https://suplementai.com/api/check-env`

`https://suplementia.vercel.app` is not the production endpoint. It is a legacy/desynchronized Vercel deployment and must not be used for release smoke. It currently reports missing AWS search env and can return old errors such as `Hybrid Search Failed` / `hybrid_search_debug_fail`.

AWS CLI check on 2026-05-20 found an Amplify app named `suplementia` in account `239378269775`, but that app had no branches or domain associations and its default Amplify domain did not serve `/api/check-env`. Treat CloudFront/DNS plus the runtime diagnostic above as the confirmed production signal. Do not assume the visible Amplify app is the live production project unless its branch, custom domain, and build history are confirmed.

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
- `/api/check-env` reports production AWS search settings, for example `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH="true"`.

## Verify AWS deployment

First identify the AWS service/project that actually owns `suplementai.com`. The current public DNS points to CloudFront, but the CloudFront distribution may be in another AWS account or managed outside the Amplify app visible to your current CLI credentials.

Useful discovery checks:

```bash
aws sts get-caller-identity
aws amplify list-apps --region us-east-1
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(join(',', Aliases.Items), 'suplementai.com')]"
aws route53 list-hosted-zones-by-name --dns-name suplementai.com
```

If the live project is Amplify:

1. Open the AWS Amplify app that serves `suplementai.com`.
2. Confirm the connected repo is `latisnere77/SuplementIA`.
3. Confirm the production branch is `main`.
4. Confirm the latest deployment points at the intended `origin/main` SHA.
5. Confirm custom domains include `suplementai.com` and `www.suplementai.com`.
6. Review the latest build logs and confirm `amplify.yml` or the configured build spec ran `npm run build`.

Useful AWS CLI checks when credentials are available:

```bash
aws amplify list-apps --region us-east-1
aws amplify list-branches --app-id <app-id> --region us-east-1
aws amplify list-jobs --app-id <app-id> --branch-name main --region us-east-1 --max-results 5
aws amplify get-job --app-id <app-id> --branch-name main --job-id <job-id> --region us-east-1
```

If these commands show no branch/domain for the app, that app is not enough to prove production deployment. Find the account/project that owns `d2of3lawf9cckm.cloudfront.net` or the custom domain association before redeploying.

## Production environment variables to verify

In Amplify production environment variables, verify values are intentional:

| Variable | Expected/recommended state |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://suplementai.com` if set |
| `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH` | `true` in production |
| `NEXT_PUBLIC_SEARCH_API_URL` | Current AWS Lambda Function URL for supplement search |
| `STUDIES_API_URL` | Current AWS studies-fetcher endpoint |
| `ENRICHER_API_URL` | Current AWS content-enricher endpoint |
| `NEXT_PUBLIC_QUIZ_API_URL` | Usually unset unless intentionally bypassing the Next portal API |
| `PORTAL_API_URL` | Do not leave pointed at stale staging API unless that path is intentionally used |
| `SEARCH_BACKEND` | Optional emergency override: `local` |
| `USE_LANCEDB` | Optional emergency override: `false` if native LanceDB path is unhealthy |

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
```

Expected canary outcomes:

| Canary group | Supplements | Expected production outcome |
| --- | --- | --- |
| Local catalog evidence | Magnesium, Creatine, Vitamin D, Melatonin, Psyllium | `200 completed`, useful evidence result, no `500` |
| Async enrichment | Turmeric, Berberine, Green tea extract | `200 processing` or controlled `completed`, no `500` |
| Insufficient human clinical evidence | Piper auritum, Fadogia agrestis | `404 insufficient_data`, no human clinical claims |

The smoke fails if any canary returns raw `500`, `Hybrid Search Failed`, `hybrid_search_debug_fail`, or unsafe clinical wording.

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
- `backend_connection_failed` / `recommendation_generation_failed`: inspect internal route fetches and backend endpoint env (`PORTAL_API_URL`, `NEXT_PUBLIC_QUIZ_API_URL`, studies/enricher URLs).
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
