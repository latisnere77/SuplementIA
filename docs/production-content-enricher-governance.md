# Production content enricher governance runbook

Use this runbook before changing the `production-content-enricher` Lambda, its
model configuration, cache behavior, validation logic, or production smoke
strategy.

Last governance gate: 2026-06-08.

## Status

Current status: `blocked`.

The deployment path is known, and the live deployment artifact is recoverable,
but the source tree is not reconciled to a known repository or reproducible
build. Do not ship code, model, cache, TTL, or validator changes until the
source TypeScript, build inputs, and deployment path are reconciled.

## Scope

- AWS account: `643942183354`
- AWS profile: `suplementai-admin`
- Region: `us-east-1`
- Lambda: `production-content-enricher`
- Do not touch the Ankosoft production account. Its full 12-digit account id
  must be confirmed before using it as an STS guardrail (do not rely on a
  partial reference such as `399`).

Confirm identity before every investigation:

```bash
AWS_PROFILE=suplementai-admin aws sts get-caller-identity --output json
```

Expected account:

```text
643942183354
```

## Current production facts

The most recent read-only governance gate found:

- Deploy path: manual `aws lambda update-function-code` from a workstation.
- No confirmed CI/CD, CodeBuild, SAM, CDK, Serverless, Terraform, or Amplify
  deploy path for this Lambda.
- Source tree: not found in the reachable repository, Git history, GitHub
  repos, CodeCommit, or local sibling checkout inspected during the gate.
- Live artifact: recovered through `aws lambda get-function` and verified
  byte-for-byte against the live `CodeSha256`.
- Live `CodeSha256` (expected checksum): `HQnp3PT5...JKA=`.
- Live zip size (expected size): `20412225` bytes.
- Golden artifact S3 coordinates observed during the gate (needed to re-pull;
  the `versionId` alone is not enough to address the object):
  - bucket: `prod-04-2014-tasks` (AWS Lambda service-internal snapshot bucket;
    not team-owned, do not rely on it for long-term retention)
  - key: `snapshots/643942183354/production-content-enricher-a2c01b4f-...`
  - versionId: `clKtz09jHIHFAD_MveHK._9_4wARPLkc`
- Function ARN: `arn:aws:lambda:us-east-1:643942183354:function:production-content-enricher`.
- The Lambda publishes only `$LATEST`; no immutable version or alias was found.
- The Function URL uses `AWS_IAM`, not anonymous public access.
- Live Function URL host: starts with `55noz2p7...` (see Caller / Function URL
  consistency below).
- CORS was observed as `*`; treat this as low risk while IAM remains enforced.

Negative result worth recording: the local zip dated Dec-18 does NOT reproduce
the live `CodeSha256`. Do not treat that local zip as the source of truth or as
a reproducible build input.

Do not commit the presigned `Code.Location` URL. It is short-lived. Re-run
`get-function` when a fresh read-only artifact URL is needed.

## Golden artifact preservation

The byte-for-byte verified artifact (expected `CodeSha256`
`HQnp3PT5...JKA=`, expected size `20412225` bytes) was recovered into ephemeral
`/tmp` during the gate and is already gone. The only remaining copy lives in the
AWS service-internal snapshot bucket above, which is not team-controlled and may
rotate.

Until the source is reconciled, this artifact is the only known-good rollback
target. Before any reconciliation or build work:

- Copy the verified artifact to a durable, team-owned, versioned, access-
  controlled location.
- Record its checksum (`HQnp3PT5...JKA=`) and size (`20412225`) alongside it.

Do not execute this preservation as part of this runbook update; it is a
future, separately-approved action.

## Caller / Function URL consistency

There is a stale Function URL fallback in the callers that does not match the
live function:

- Live Function URL host: `55noz2p7...`
  (`AWS_IAM`).
- Stale hardcoded fallback host `l7mve4qny...` is present in
  `app/api/portal/enrich-v2/route.ts` and
  `app/api/portal/enrich-stream/route.ts`.
- If the `ENRICHER_API_URL` / `NEXT_PUBLIC_ENRICHER_API_URL` environment
  variables are unset, those callers can hit the wrong/old endpoint.

Future action (do not perform in this runbook update):

- Confirm the Amplify environment variables for each deployed environment.
- Remove the stale `l7mve4qny...` fallbacks in a separate code PR if applicable.
- Keep this code change out of this governance runbook.

## Load-bearing environment variables

These environment variables define production behavior. Do not clear, omit, or
replace them during any manual update:

| Variable | Observed production value |
| --- | --- |
| `USE_TOOL_API` | `true` |
| `ENVIRONMENT` | `production` |
| `MAX_TOKENS` | `16000` |
| `XRAY_ENABLED` | `true` |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |

The deployed code defaults observed during the audit are dangerous:

- Default model: Haiku 3.5.
- Default `MAX_TOKENS`: `4500`.

This means a redeploy or configuration update that omits the live environment
map can silently revert production from Sonnet 4.5 at `16000` tokens to Haiku
3.5 at `4500` tokens.

## CloudTrail findings

CloudTrail reconstruction over the inspected window found manual production
mutations:

- 2026-05-03 23:14-23:27 UTC -- `UpdateFunctionConfiguration`
  - Actor: `CrossAccountAdminRole`; workstation IP `189.139.24.13`; AWS CLI on
    macOS; `MFA=false`.
  - Sessions named like `codex-lambda-update-model`,
    `codex-lambda-update-sonnet`, `codex-lambda-update-tokens`,
    `codex-lambda-update-timeout`.
  - Outcome: introduced load-bearing config including Sonnet 4.5,
    `MAX_TOKENS=16000`, and timeout `300`.
- 2026-05-04 18:19 and 18:26 UTC -- `UpdateFunctionCode`
  - Actor: `CrossAccountAdminRole`, session `lambda-cache-fix`, same workstation
    pattern.
  - Outcome: last real code deploy; final live sha `HQnp3PT5...JKA=`
    (see two-shot note below).
- 2026-06-08 01:53-02:03 UTC -- `UpdateFunctionConfiguration`
  - Actor: audit sessions.
  - Outcome: temporary model/config swaps and rollbacks from the audit.

The 2026-05-04 code deploy was two-shot: at 18:19Z an intermediate artifact was
written (`CodeSha256` `KzXmb...`), then at 18:26Z it was superseded by the live
artifact (`CodeSha256` `HQnp3PT5...JKA=`). The intermediate `KzXmb...` sha is
transient and is NOT the current deployable artifact; do not treat it as a
rollback target.

CloudTrail redacts raw environment values in the configuration event payload.
Use live `get-function` output for current literal values and CloudTrail for
who/when/how.

## Governance gaps

The gate found no adequate production governance for this Lambda:

- Production Lambda mutations observed through assumed-role sessions with
  `MFA=false`; require MFA enforcement on the role used for production changes.
- Bedrock model invocation logging: disabled.
- AWS Budgets: none found for this account.
- Billing or Bedrock token/invocation alarms: none found.
- Lambda tags: no useful repo, owner, managed-by, or git sha tags found.
- No version or alias for canary and rollback.
- No repo-backed IaC declaration for function settings and environment.
- No change approval record for Sonnet 4.5 plus `MAX_TOKENS=16000`.

## Code risks to cover after source recovery

Do not patch these until source is recovered and the build/deploy path is
reconciled.

Known risks from the deployed artifact review:

- `validateEnrichedContent` is fragile around model-produced string values.
  The known risk areas include `dosage`, `safety`, `buyingGuidance`, and
  possibly `mechanisms`.
- `sanitizeDosageWithPMIDValidation` behaves as a passthrough.
- `studySummarizer.js` also uses `config.modelId`; model swaps affect this
  second Bedrock path, not just the main enrichment call.
- `CACHE_TTL_DAYS` is hardcoded in code, not controlled by environment.
- Cache key is only `supplementId`; it does not include model, schema, or
  version.
- A `version: "1.0.0"` marker exists but was not found to drive cache
  invalidation.
- `forceRefresh` can poison production cache because cache writes happen after
  generation if validation passes.
- Smoke tests against production must not use real supplement ids with
  `forceRefresh`.

## Read-only checks

Use these commands to refresh evidence without writing to production.

Identity:

```bash
AWS_PROFILE=suplementai-admin aws sts get-caller-identity --output json
```

Lambda configuration and artifact pointer:

```bash
AWS_PROFILE=suplementai-admin aws lambda get-function \
  --function-name production-content-enricher \
  --region us-east-1
```

Tags:

```bash
# Note: `list-tags-for-resource` is NOT a valid Lambda subcommand.
# Use `list-tags --resource <arn>`. The ARN is the Function ARN below.
AWS_PROFILE=suplementai-admin aws lambda list-tags \
  --resource arn:aws:lambda:us-east-1:643942183354:function:production-content-enricher
```

Versions:

```bash
AWS_PROFILE=suplementai-admin aws lambda list-versions-by-function \
  --function-name production-content-enricher \
  --region us-east-1
```

Function URL:

```bash
AWS_PROFILE=suplementai-admin aws lambda get-function-url-config \
  --function-name production-content-enricher \
  --region us-east-1
```

CloudTrail mutation history:

```bash
# Without --start-time, lookup-events defaults to the last 90 days only.
# The May 2026 mutations will fall out of that default window over time, so
# pass explicit bounds to keep the reconstruction reproducible later, e.g.
# --start-time 2026-05-01T00:00:00Z --end-time 2026-05-05T00:00:00Z
AWS_PROFILE=suplementai-admin aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=UpdateFunctionCode20150331v2 \
  --region us-east-1

AWS_PROFILE=suplementai-admin aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=UpdateFunctionConfiguration20150331v2 \
  --region us-east-1
```

Bedrock invocation logging:

```bash
AWS_PROFILE=suplementai-admin aws bedrock get-model-invocation-logging-configuration \
  --region us-east-1
```

Budgets:

```bash
AWS_PROFILE=suplementai-admin aws budgets describe-budgets \
  --account-id 643942183354
```

Source recovery searches in the repo:

```bash
rg -n "validateEnrichedContent|bedrockConverse|generate_enriched_content|sanitizeDosageWithPMIDValidation|buildEnrichmentPrompt|suplementia-content-enricher-cache" .
rg -n "production-content-enricher|content-enricher|lambda-cache-fix|codex-lambda-update-model|codex-lambda-update-sonnet|codex-lambda-update-tokens" .
rg --files | rg "(enricher|lambda|bedrock|dist|toolSchema|prompts|studySummarizer|cache)"
```

## Hard prohibitions while blocked

Do not do any of the following while status is `blocked`:

- `aws lambda update-function-code`
- `aws lambda update-function-configuration`
- Manual environment edits in the AWS console
- Model swap between Sonnet and Haiku
- TTL or cache changes
- Validator changes
- Force-refresh production smoke using real supplement ids
- Deploys from unreconciled local zips
- Changes in the Ankosoft production account (full 12-digit id to be confirmed;
  not the partial `399`)

## Source recovery gate

The next blocking objective is:

```text
Identify the TypeScript source tree, build inputs, and deployment method that
produce the deployed Lambda artifact or a validated successor artifact.
```

The gate remains blocked until all of these are true:

- The source TypeScript is recovered and versioned in a known repo.
- Build inputs exist: `package.json`, lockfile, `tsconfig`, build script, and
  any packaging script.
- The deployment path is declared in repo-backed IaC or a reviewed release
  script.
- The five load-bearing environment variables are declared outside manual
  console state.
- A successor artifact can be built and validated through the declared path.

Human handoff likely required:

- Ask the operator behind the `lambda-cache-fix` and `codex-lambda-*` sessions
  from workstation IP `189.139.24.13` for the local TypeScript source
  directory, build command, and packaging/deploy script used on 2026-05-04.

## First safe PR after reconciliation

After source recovery and build reconciliation, the first code PR should be
small and combine only the directly coupled safety fixes:

1. Normalize model output before validation:
   - add `typeof` guards;
   - parse JSON strings with `try/catch` where expected;
   - cover `dosage`, `safety`, `buyingGuidance`, and `mechanisms`;
   - fail closed before any cache write.
2. Version the cache key:
   - include model id;
   - include schema or content version.
3. Move TTL to an explicit governed setting:
   - use a conservative TTL if the cache key is not versioned;
   - consider longer TTL only after key versioning is live.
4. Make smoke anti-poisoning:
   - use throwaway supplement ids or non-production cache tables for
     `forceRefresh`;
   - never force-refresh production real supplement ids during gates.
5. Add coverage for `studySummarizer` because it uses the model config through
   a separate path.

## Later gates

Treat these as separate gates after the first safe PR:

- Enable Bedrock model invocation logging.
- Add AWS Budget and Billing/Bedrock alarms.
- Add Lambda version and alias for immutable rollback.
- Add repo-backed IaC.
- Add function tags for repo, owner, managed-by, and git sha.
- Decide whether Sonnet 4.5 plus `MAX_TOKENS=16000` is approved or should be
  replaced.
- Only then run a Haiku 4.5 swap gate:
  - environment-only;
  - guarded with `--revision-id`;
  - version plus alias canary;
  - validate main enrichment and `studySummarizer`;
  - measure tokens and cost with invocation logging enabled.

## Source recovery gate result

Gate run: 2026-06-11 (read-only Source Recovery Gate).

Verdict: `blocked`. The live binary artifact was recovered and verified, but the
TypeScript source tree, build inputs, and packaging/deploy path were not found
in any machine-readable location. No code/model/cache/validator change is safe
until the source is reconciled.

Live binary artifact recovered and verified (read-only):

- Recovered to: `/tmp/production-content-enricher-live.zip` (via the presigned
  `Code.Location` from `aws lambda get-function`).
- Size: `20412225` bytes (matches live `CodeSize`).
- Checksum: `HQnp3PT5...JKA=` (matches live `CodeSha256`).
- Note: `/tmp` is ephemeral. This is NOT durable preservation; re-pull from
  `Code.Location` when needed and preserve durably as a separate approved action.

Sources searched and result:

- Local checkouts (active + siblings): not found. All checkouts resolve to the
  single repo `SuplementIA`; only callers/orchestrators exist, never the Lambda
  handler source.
- Git history (all branches): not found. No enricher handler source was ever
  committed.
- GitHub (current identity): not found. Owner-scoped and global code search for
  the distinctive markers returned zero hits; no `*enricher*` repo exists.
- CodeCommit: not found. Zero repositories in the account/region.
- CodeBuild: not found. Zero build projects (no pipeline that could produce it).
- S3: not found. Only migration/app-data/cloudtrail-logs buckets; no
  build/source/artifact bucket. The migration bucket is empty.
- Artifact zip: recovered (build output only, see above), but it does not
  contain the TypeScript source.

Conclusion: machine-readable recovery is exhausted. The source now depends on a
human handoff to the deploy operator.

### Original TypeScript filenames observed in sourcemaps

A nested older build `index.zip` inside the artifact carries `dist/*.js.map`
sourcemaps that reference `../src/<name>.ts`, naming the 13 original source
files:

- `index.ts`
- `bedrock.ts`
- `bedrockConverse.ts`
- `cache.ts`
- `config.ts`
- `prompts.ts`
- `prompts-examine-style.ts`
- `retry.ts`
- `studySummarizer.ts`
- `toolSchema.ts`
- `types.ts`
- `synergies.ts`
- `job-store.ts`

Important:

- These filenames prove a `src/` TypeScript tree existed.
- The sourcemaps do NOT contain `sourcesContent` (it is empty on all maps).
- Therefore the TypeScript cannot be reconstructed from the artifact; only the
  filenames and line/column mappings survive. Recovery must come from outside
  the artifact (the operator's workstation, editor history, or backups).

The operator can locate the tree quickly by searching their disk for these
distinctive filenames (for example `bedrockConverse.ts`, `toolSchema.ts`,
`studySummarizer.ts`).

### Human handoff questions

For the operator behind workstation IP `189.139.24.13` and the sessions
`codex-lambda-update-*` / `lambda-cache-fix`:

1. What machine (hostname) and absolute directory holds the TypeScript project
   that produced `production-content-enricher`?
2. What was the exact build/compile command (tsc/esbuild/webpack and flags)?
3. What was the exact packaging/zip command (flags, file ordering, bundled
   node_modules)?
4. What was the exact deploy command on 2026-05-04 18:26Z (full
   `update-function-code` line: `--zip-file fileb://...` or `--s3-*`)?
5. What repo/branch/commit did that deploy originate from (or was it built from
   an uncommitted working tree)?
6. Where do `package.json`, the lockfile, `tsconfig.json`, and the build/deploy
   scripts live?
7. Does the exact zip with checksum `HQnp3PT5...JKA=` (`20412225` bytes) exist
   anywhere outside the Lambda-internal snapshot (workstation, backup, bucket)?
8. Why does the local Dec-18 zip NOT reproduce the live checksum (older source,
   different deps/lockfile, different build tool, or different packaging)?
9. Who approved Sonnet 4.5 with `MAX_TOKENS=16000`, and where is it recorded?
10. Should this Lambda move to IaC with version/alias BEFORE any new deploy, and
    who approves that migration?

### Unblock criteria

The gate stays `blocked` until ALL of the following are true:

1. TypeScript source recovered and versioned in a known repo.
2. Build inputs present: `package.json`, lockfile, `tsconfig`, build/packaging
   scripts.
3. Build reproduces `HQnp3PT5...JKA=` or produces a validated successor
   artifact.
4. Deploy path declared in repo-backed IaC or a reviewed release script.
5. The five load-bearing environment variables declared outside manual console
   state.
6. Rollback / version / alias strategy defined.

## Related production docs

- [AWS production alignment runbook](./aws-production-alignment-runbook.md)
- [Portal release hardening checklist](./portal-release-hardening-checklist.md)
