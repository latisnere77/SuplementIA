# PROJECT_CONTEXT - SuplementAI

Generated: 2026-06-17

This file maps the live technical context for future autonomous agents. It is descriptive only and does not override `AGENTS.md`, `TASK_QUEUE.md`, CI, or any production governance.

## Governance Sources

Immutable operating law:

- `AGENTS.md` is the primary agent protocol. It defines SPEC -> LOOP -> FLUSH, the Scope Reflex, the three-attempt anti-loop rule, human gates, validation rules, queue behavior, and the no-merge constraint.
- `TASK_QUEUE.md` is the autonomous execution queue. Agents must reconcile it with physical branch/PR state before acting.
- `.github/workflows/quality-gates.yml` is the CI quality gate for PRs and `main`/`codex/**` pushes.
- `.planning/**` contains prior task specs, manifests, observations, and queue state summaries.

## Root Audit Artifact Ownership

Repo-owned audit artifacts:

- `PROJECT_CONTEXT.md`: descriptive technical map for future agents.
- `OBSERVATIONS.md`: backlog of findings that must not be fixed opportunistically.
- `TASKS.md`: proposed or explicitly assigned governance backlog; not a replacement for `TASK_QUEUE.md`.
- `MASTER_TASK_SPEC.md`: approved batch-level execution plan for the current assigned `TASKS.md` run.
- `.planning/**`: task specs, manifests, handoffs, and queue idle summaries.

Authority order:

1. `AGENTS.md`, explicit human instructions, CI config, and physical git/PR state.
2. `TASK_QUEUE.md` for autonomous queue execution.
3. `TASKS.md` only when a human explicitly assigns that backlog.
4. `PROJECT_CONTEXT.md`, `OBSERVATIONS.md`, and `.planning/**` as descriptive support.

Governance controls already present:

- Test de Sustitucion: skip edits that are not required for the task.
- Max three retries for a repeated test/lint/build failure.
- Diff against `origin/main`, not stale local `main`.
- Human gate for merge, deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags, `production-content-enricher`, and Bedrock.
- `npm run validate` explicitly excludes Playwright.
- Portal/category/SEO rendering changes require local Playwright e2e in addition to Jest/lint/type-check.
- Health copy must avoid unsafe clinical claims.
- Negative controls such as `gut-health` must remain negative controls.

Autonomous deploy gate protocol:

- The deploy protocol in `AGENTS.md` section 3.1 is a classifier and preflight harness, not
  standing permission to deploy.
- Tier 0 local validation is autonomous.
- Tier 1 remote inspection is read-only and requires AWS identity confirmation before any AWS
  read: account `643942183354`, profile `suplementai-admin`.
- Tier 2 staging writes and Tier 3 production actions remain human-gated until a task-specific
  GO names the command, target SHA, smoke, rollback, and audit record.
- Tier 4 paths remain blocked unless a dedicated TASK_SPEC and GO cover them: Bedrock,
  `production-content-enricher`, secrets, destructive scripts, and irreversible infra changes.
- Any deploy-capable task must prove rollback exists before forward execution. Missing rollback
  or smoke is a BLOCKED condition, not permission to improvise automation.

## Application Shape

Runtime:

- Next.js 16 App Router with TypeScript.
- React 18.
- i18n lives under `app/[locale]/...` with supported locales `en` and `es`.
- `next-intl` loads messages from `messages/en.json` and `messages/es.json`.
- Styling uses Tailwind and shared UI primitives under `components/ui`.

Main route groups:

- `app/[locale]/page.tsx`: localized public landing entry.
- `app/[locale]/portal/**`: consumer supplement portal.
- `app/[locale]/portal/category/[slug]/**`: category landing pages and SEO content.
- `app/[locale]/portal/supplement/[slug]/**`: supplement detail pages and SEO content.
- `app/[locale]/spot/**`: spot/admin-ish localized pages.
- `app/api/**`: Next route handlers for portal, auth, monitoring, cache, supplements, and test/debug endpoints.

Critical portal modules:

- `lib/search-service.ts`: search orchestration. Chooses local catalog, LanceDB, or Lambda based on env.
- `lib/portal/supplements-database.ts`: deterministic local supplement and condition catalog for autocomplete/search fallback.
- `lib/lancedb-service.ts`: optional LanceDB vector search with Bedrock Titan embeddings.
- `lib/portal/job-store.ts`: async job state backed by DynamoDB or memory in tests/local e2e.
- `lib/portal/query-validator.ts` and `lib/portal/query-normalization/**`: query guardrails and normalization.
- `lib/portal/centella-editorial-calibration.ts`: clinical copy calibration and evidence scoping.
- `lib/portal/evidence-grades.ts`: evidence grade normalization and strong-evidence checks.
- `components/portal/**`: portal UI components and evidence views.

Content enricher:

- `services/content-enricher/**` is a governed reconstructed TypeScript source tree for `production-content-enricher`.
- Treat this area as gated. Do not edit, deploy, invoke, or alter Bedrock behavior without explicit human approval.
- Its own package commands are:
  - `cd services/content-enricher && npm run build`
  - `cd services/content-enricher && npm test`

## Data Model And Storage

Local catalog:

- `SUPPLEMENTS_DATABASE` is an in-repo TypeScript catalog with entries shaped as:
  - `id`
  - `name`
  - `aliases`
  - `category`
  - optional `healthConditions`
  - `language`
- It supports deterministic local autocomplete/search and is used when external search backends are unavailable or disabled.

Postgres/pgvector:

- `infrastructure/migrations/001_initial_schema.sql` creates `supplements` with `id`, `name`, `scientific_name`, `common_names`, `embedding vector(384)`, `metadata`, search counters, timestamps, HNSW vector index, helper views, and update/search-count functions.
- `infrastructure/migrations/001_setup_pgvector.sql` also creates `supplements` and pgvector search infrastructure. This overlaps with `001_initial_schema.sql` and should be treated as migration debt until reconciled.

LanceDB:

- Default local path is `/tmp/lancedb-pristine`.
- `SEARCH_BACKEND=local` disables LanceDB/Lambda search.
- `USE_LANCEDB=false` prevents LanceDB use.
- LanceDB embedding generation uses Bedrock Titan V2, so any live path that triggers embeddings may touch AWS/Bedrock and must respect gates.

DynamoDB:

- Async portal jobs use table `suplementai-async-jobs` in `us-east-1`.
- Playwright config forces `JOB_STORE_DRIVER=memory`, `SEARCH_BACKEND=local`, and `USE_LANCEDB=false` for local e2e isolation.

External services and integrations:

- AWS SDK: Bedrock Runtime, DynamoDB, Lambda, S3, Secrets Manager, CloudFormation, CloudWatch Logs, EC2, ECS, EFS, X-Ray.
- Auth: NextAuth plus Cognito-related helpers.
- Payments/subscription: Stripe route handlers under `app/api/portal/subscription/**`.
- Monitoring: Sentry, CloudWatch/X-Ray helper modules, and portal metrics endpoints.

## Validation Commands

Use exact commands from `package.json`.

Local development:

```bash
npm run dev
```

Core local validation:

```bash
npm run lint
npm run type-check
npm run build
npm test
```

Combined validation:

```bash
npm run validate
```

Important: `npm run validate` runs type-check, build, and Jest. It does not run Playwright.

E2E validation:

```bash
npm run test:e2e
npm run test:e2e -- e2e/portal.spec.ts
npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1
RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1
```

Portal/category/SEO render changes require:

```bash
npm test
npm run type-check
npm run lint
npm run test:e2e -- e2e/portal.spec.ts
```

Playwright local server behavior:

- Test dir: `e2e`.
- Browser projects: `chromium`, `mobile-chrome`.
- Default port: `3100`.
- Server command sets `JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false`.

CI quality gates:

- `npm ci`
- `npx playwright install --with-deps chromium`
- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npm test -- --runInBand`
- `npm audit`
- `npm run test:e2e`
- `RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1`

## Branch And Queue State Notes

Current observed branch during audit:

- `codex/reconstruct-content-enricher-source`

Observed untracked files at audit time:

- `.DS_Store`
- `.planning/queue-idle.md`
- `.planning/seo-clusters-integration/`

Observed queue inconsistency:

- `TASK_QUEUE.md` marks T2-T14 as `PENDING`.
- `.planning/queue-idle.md` says no pending SEO cluster tasks remain and lists PRs #156-#168 for those same clusters.
- Before executing queue work, reconcile with GitHub PR state and `origin/main`. Do not blindly execute stale local `PENDING` entries.

Read-only audit addendum, 2026-06-17:

- `git fetch origin` was intentionally not run during the governance scan because the session was constrained to read-only behavior.
- Existing local refs showed `HEAD` at `831d949` on `codex/reconstruct-content-enricher-source` and `origin/main` at `283316e`.
- `HEAD..origin/main` contained merge commit `283316e Merge pull request #179 from latisnere77/codex/reconstruct-content-enricher-source`; no product execution should start until a normal write-capable agent refreshes refs and reconciles this with the local branch.
- `PROJECT_CONTEXT.md`, `OBSERVATIONS.md`, `TASKS.md`, `.planning/queue-idle.md`, `.planning/seo-clusters-integration/CHANGE_MANIFEST.md`, and `.DS_Store` were untracked at audit time.
- `TASKS.md` was normalized after human approval so future proposed tasks use the required atomic-task syntax.

## External Research Snapshot

BrightData scan on 2026-06-17 found current industry guidance aligned with this repo's governance:

- Next.js testing docs recommend matching test type to risk and favor e2e for realistic browser flows and async Server Components: https://nextjs.org/docs/app/guides/testing
- Agentic SDLC guidance emphasizes context, knowledge, collaboration, and auditable governance: https://coderabbit.ai/guides/agentic-sdlc
- GitHub/Gartner 2026 messaging frames enterprise agentic development around review, security, governance, and deployment bottlenecks rather than code generation alone: https://github.blog/ai-and-ml/github-copilot/github-recognized-as-a-leader-in-the-gartner-magic-quadrant-for-enterprise-ai-coding-agents-for-the-third-year-in-a-row/

Implication for SuplementAI: keep the existing PR-first, human-gated, e2e-backed workflow. Improve state reconciliation and context hygiene before increasing autonomous throughput.
