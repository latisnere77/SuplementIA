# OBSERVATIONS - SuplementAI

Generated: 2026-06-17

This is a read-only audit log for future agents. Do not fix these items opportunistically inside unrelated product tasks. Convert an item into a scoped task before changing code.

## Critical

### Queue State Divergence

`TASK_QUEUE.md` marks SEO tasks T2-T14 as `PENDING`, while `.planning/queue-idle.md` states the queue is idle and lists PRs #156-#168 for those same tasks.

Risk:

- A future agent may duplicate already-open PR work.
- Queue automation may create conflicting branches against shared `seo.ts`.
- Review state may be lost if local task status is stale.

Containment:

- Reconcile `TASK_QUEUE.md`, `.planning/queue-idle.md`, open PRs, and `origin/main` before executing queue work.
- Treat shared `app/[locale]/portal/category/[slug]/seo.ts` tasks as serialized until reconciled.

## High

### Content Enricher Source Is Reconstructed And Ungoverned For Normal Edits

Files under `services/content-enricher/src/**` contain `@ts-nocheck` and broad `eslint-disable` markers. Prior planning notes state the original TypeScript source was unavailable and this tree is a governed reconstruction.

Risk:

- TypeScript may not catch contract drift.
- Cosmetic refactors could alter production Lambda/Bedrock behavior.
- The area is explicitly human-gated by `AGENTS.md`.

Containment:

- Do not edit content-enricher, Bedrock prompts, Lambda packaging, or deployment paths without explicit human approval.
- Keep production-content-enricher work in dedicated PRs with artifact comparison and rollback plan.
- Type-safety recovery plan is documented in `docs/content-enricher-type-safety-recovery-plan.md`; future implementation remains human-gated.

### Overlapping Initial Database Migrations

Both `infrastructure/migrations/001_initial_schema.sql` and `infrastructure/migrations/001_setup_pgvector.sql` create `supplements`, pgvector extension, indexes, triggers, and search-count functions.

Risk:

- Fresh environments may apply ambiguous schema intent.
- Trigger/index naming differs between migrations.
- Migration history may not be reproducible without knowing which file was actually applied in production.

Containment:

- Do not run migrations casually.
- Read-only discovery completed: current documented operational setup path is `001_setup_pgvector.sql`, while `npm run migrate` applies all SQL files and should not be used blindly until migration history is reconciled.
- See `infrastructure/migrations/SOURCE_OF_TRUTH.md`.

### AWS/Bedrock Paths Can Be Reached From Search Or Enrichment

`lib/lancedb-service.ts` uses Bedrock Titan embeddings. Enrichment routes and `services/content-enricher/**` use Bedrock-related code. Async job state uses DynamoDB.

Risk:

- Local tests or debug routes may accidentally require AWS credentials if env isolation is not applied.
- Paid or gated services may be touched outside intended workflow.

Containment:

- For local e2e, keep `SEARCH_BACKEND=local`, `USE_LANCEDB=false`, and `JOB_STORE_DRIVER=memory`.
- Treat AWS writes, Lambda invokes, and Bedrock actions as human-gated.
- Playwright server reuse is now opt-in with `PLAYWRIGHT_REUSE_SERVER=1`; default e2e runs start an isolated server.

## Medium

### Duplicate Files With ` 2` Suffix - Resolved

Observed duplicate-looking files:

- `app/api/supplements/route 2.ts`
- `app/api/test-env/route 2.ts`
- `components/portal/VariantSelectorModal 2.tsx`
- `lib/cache/simple-cache 2.ts`
- `lib/portal/variant-detector 2.ts`
- `types/supplement-variants 2.ts`

Risk:

- Unclear source of truth.
- Accidental imports or editor confusion.
- Tests may miss dead or duplicate code paths.

Containment:

- Resolved by the focused duplicate-file audit: each suffixed file was byte-identical to its canonical sibling and had no code references.
- Keep future duplicate cleanup scoped to proof of identical content and unused paths.

### Consumer-Facing Debug Logging

Portal result flows and some API routes contain extensive `console.log`, `console.warn`, and `console.error` statements. Some are structured logs; others appear debug-oriented.

Risk:

- Noisy production logs.
- Potential exposure of request, token, URL, or user-state details.
- Harder incident triage due to low-signal output.

Containment:

- Do not broadly strip logs inside feature tasks.
- Logging classification completed in `docs/portal-api-logging-classification.md`.
- Treat `app/[locale]/portal/results/page.tsx`, `app/[locale]/portal/PortalPageClient.tsx`, `app/api/portal/quiz/route.ts`, `app/api/portal/enrich/route.ts`, and `app/api/portal/enrich-async/route.ts` as cleanup-priority files for a future scoped implementation.

### Mixed Search Backends And Vocabulary Sources

Search can use local catalog, LanceDB, Lambda, Postgres/pgvector concepts, and content-enricher outputs. The live source of truth for supplement names differs by context.

Risk:

- Autocomplete, SEO slugs, search results, and evidence enrichment may disagree.
- Slug additions can pass one path and fail another.

Containment:

- For SEO/category tasks, verify `supplementSlug` values against actual portal/category rendering and existing SEO tests.
- Avoid adding another abstraction until source-of-truth ownership is decided.
- Search backend contracts are mapped in `docs/search-backend-contracts.md`; preserve `SEARCH_BACKEND=local` and `USE_LANCEDB=false` for local e2e isolation.

### Retry Limits Differ Across Layers

`AGENTS.md` enforces three attempts for task validation loops. `app/api/portal/enrich-async/route.ts` checks retry limit with max 5 for user-facing async enrichment.

Risk:

- Future agents may confuse operational retry policy with agent execution retry policy.

Containment:

- Keep the agent rule at three attempts.
- Treat user-facing enrichment retry policy as product behavior, not agent workflow governance.

## Low

### `.DS_Store` Is Untracked

Observed `.DS_Store` in the worktree.

Risk:

- Noise in git status and accidental staging.

Containment:

- Leave untouched unless a dedicated hygiene task updates ignore rules or removes local-only files.

### Emoji And Non-ASCII In Scripts/Docs

Several operational scripts print emoji and non-ASCII symbols. This is not necessarily a bug.

Risk:

- Some CI or log parsers may render output inconsistently.

Containment:

- Do not normalize in unrelated tasks.

### Stale Planning Artifacts May Not Match Current Queue

`.planning/**` contains previous specs/manifests and idle state. Some appear more current than `TASK_QUEUE.md`.

Risk:

- Agents may pick the wrong authority.

Containment:

- Per `AGENTS.md`, rehydrate from `TASK_QUEUE.md` plus physical git/PR state. If disagreement exists, pause queue execution and reconcile explicitly.

## Read-Only Audit Addendum - 2026-06-17

### High

#### Local Branch State Requires Reconciliation Before Autonomous Execution

The read-only scan observed `HEAD` at `831d949` on `codex/reconstruct-content-enricher-source` and local `origin/main` at `283316e`, where `origin/main` includes merge PR #179 for the same content-enricher reconstruction branch.

Risk:

- A future task may branch from stale or already-merged local state.
- Queue execution could duplicate merged work or misinterpret branch ancestry.

Containment:

- In a write-capable execution session, run `git fetch origin` before any task and compare against fresh `origin/main`.
- Reconcile `TASK_QUEUE.md`, `.planning/queue-idle.md`, open PRs, and merged PRs before touching product code.

### Medium

#### `TASKS.md` Had Non-Compliant Task Shape Before Normalization

The existing `TASKS.md` used section headings and prose blocks instead of the required `- [ ] TAREA: [Nombre]. ESTADO: TODO` task line.

Risk:

- Future agents may parse proposed tasks inconsistently.
- Human-approved discovery tasks may be harder to promote into `TASK_QUEUE.md`.

Containment:

- Keep `TASKS.md` as a proposed backlog only.
- Promote tasks into `TASK_QUEUE.md` deliberately, preserving `AGENTS.md` SPEC -> LOOP -> FLUSH requirements.

#### Root Audit Files Were Untracked

`PROJECT_CONTEXT.md`, `OBSERVATIONS.md`, and `TASKS.md` existed but were untracked at scan time.

Risk:

- Future agents may rely on local-only artifacts that are not present in PR review or another clone.

Containment:

- Resolved by the governance artifact ownership task: these files are repo-owned descriptive artifacts.
- Continue treating `AGENTS.md`, explicit human instructions, CI config, physical git/PR state, and `TASK_QUEUE.md` as higher authority than descriptive audit files.

### Low

#### `.gitignore` Does Not Ignore `.DS_Store`

`.DS_Store` was present as an untracked file, and `.gitignore` did not include it.

Risk:

- Repeated status noise and accidental staging.

Containment:

- Add `.DS_Store` to `.gitignore` in a focused hygiene task, or remove only local copies outside product work.

## Read-Only Audit Addendum - 2026-06-18

### Medium

#### Deploy Command Surface Requires Human Gate Classification

The deploy protocol inventory found several command surfaces that look convenient but are
dangerous for autonomous execution:

- `package.json` maps `npm run deploy` to `git push origin main`, which would bypass the
  repository rule that agents never merge or push `main`.
- `npm run migrate` runs migration automation and must not be used until migration history is
  reconciled.
- `infrastructure/DEPLOYMENT-SCRIPTS-README.md`, `DEPLOYMENT_GUIDE.md`,
  `STAGING-DEPLOYMENT-GUIDE.md`, `PRODUCTION-ROLLOUT-GUIDE.md`, and
  `ROLLBACK_PROCEDURES.md` document CloudFormation, traffic routing, rollback, Lambda, cleanup,
  and database commands that mutate AWS resources.
- `infrastructure/smoke-tests.sh` includes Lambda invokes and DynamoDB writes/deletes, so it is
  not equivalent to the read-only portal production smoke.
- `amplify.yml` can run LanceDB update scripts during Amplify builds if a LanceDB table is
  present, and those scripts generate Bedrock embeddings.

Risk:

- A future agent could treat a documented runbook command as permission to mutate staging or
  production.
- A smoke or validation label may hide AWS writes or Bedrock activity.

Containment:

- `AGENTS.md` section 3.1 now classifies deploy commands by tier.
- Treat production/staging deploy, rollback, migration, traffic routing, Lambda invoke/update,
  Amplify job, env update, Terraform/EventBridge, Bedrock, and `production-content-enricher`
  paths as human-gated writes unless a task-specific GO names the exact command.
- Require named smoke, named rollback, target SHA, account confirmation, and audit artifact
  before any future deploy GO.

#### Uncommitted Governance Drift On PR #180 Branch

A read-only scan observed the working tree on branch `codex/reconcile-queue-pr-state` (PR #180) with uncommitted modifications to `MASTER_TASK_SPEC.md` and `TASKS.md`. These edits are the planning artifacts for the in-progress `Define Fully Autonomous Deploy Gate Protocol` task (dated 2026-06-18) and are not part of PR #180's committed scope.

Risk:

- Dirty governance edits could be accidentally committed into the wrong PR.
- The in-progress plan could be lost on a branch switch or reset.

Containment:

- Isolate the deploy-gate protocol planning in its own branch/PR before touching product code.
- Keep PR #180's committed scope limited to the queue/governance reconciliation it already contains.

#### Local Branch Reconciliation Addendum (2026-06-17) Is Now Stale

The `Local Branch State Requires Reconciliation Before Autonomous Execution` note above references `HEAD` at `831d949` on `codex/reconstruct-content-enricher-source` and `origin/main` at `283316e`. The current physical state is `HEAD` at `2e94059` on `codex/reconcile-queue-pr-state`, 14 commits ahead of `origin/main` and 0 behind, with PR #179 (content-enricher reconstruction) already merged into `main`.

Risk:

- A future agent may reconcile against the obsolete refs in the prior addendum and misread branch ancestry.

Containment:

- Treat physical git/PR state (`git fetch origin` + `gh pr list`) as authority over any dated ref snapshot in this file.
- Refresh or supersede the 2026-06-17 ref snapshot in a scoped governance task rather than opportunistically.

### Low

#### CI `npm audit` Is An Unpinned Hard Gate

`.github/workflows/quality-gates.yml` runs `npm audit` as a required step with no `--audit-level` threshold. The current scan reported 0 vulnerabilities, so the gate is green.

Risk:

- Any future moderate/low advisory in the dependency tree will fail the entire pipeline regardless of whether the PR touches the affected dependency.

Containment:

- Consider pinning an `--audit-level` (e.g. `high`) or moving advisory triage to a non-blocking job in a scoped CI task.
- Do not change CI gating opportunistically inside unrelated product work.

## Current Audit Addendum - 2026-06-22

### Critical

No new critical product defect is known from the latest read-only audit. The autonomous queue
is idle: `TASK_QUEUE.md` exposes no actionable task headings in `PENDING`, `IN_PROGRESS`, or
`BLOCKED` state. Current work is review-bound in open PRs rather than executable backlog.

Risk:

- A future agent may interpret "queue idle" as "project complete" and skip product planning.
- Another agent may create speculative work instead of waiting for task promotion or human
  assignment.

Containment:

- Keep using `TASK_QUEUE.md` as the execution queue.
- Treat additional work as requiring explicit task promotion or direct human assignment before
  implementation.

### High

#### Deploy And Migration Runbooks Still Need Reconciliation Before Any GO

The project has a clear deploy classifier in `AGENTS.md`, but the command surface remains
easy to misuse:

- `npm run deploy` maps directly to `git push origin main`.
- `npm run migrate` runs migration automation over a migration set that still has overlapping
  initial schema files.
- Amplify `start-job`, branch env updates, CloudFormation deploys, traffic rollback, Lambda
  invoke/update, cleanup scripts, LanceDB updates, and Bedrock-backed embedding scripts remain
  reachable from docs or scripts.
- `amplify.yml` conditionally runs LanceDB update scripts when a LanceDB table is present.
- Several runbooks reference deployment support commands that are not present in the tree,
  including `monitor-rollout.sh`, `compare-systems.sh`, and `run-smoke-tests.sh`.

Risk:

- A future task could mistake a documented runbook command for autonomous permission to mutate
  production, staging, database state, or Bedrock-backed data.
- A deploy GO could be blocked late because the exact smoke, rollback, target SHA, or audit
  artifact has not been proven executable.

Containment:

- Treat deploy, migration, AWS write, Lambda invoke/update, traffic, Bedrock, LanceDB mutation,
  and production smoke paths as human-gated until a task-specific GO names the exact command,
  target, preflight, smoke, rollback, and audit record.
- Add a scoped runbook reconciliation task before any deploy-oriented execution work.

#### Content Enricher Remains A Governed Reconstructed Source Tree

`services/content-enricher/src/**` still contains broad `@ts-nocheck` and `eslint-disable`
markers, while `AGENTS.md` gates all `production-content-enricher` and Bedrock work.

Risk:

- Normal TypeScript checks do not provide strong contract protection for this source tree.
- Cosmetic or opportunistic edits could change production Lambda/Bedrock behavior.

Containment:

- Keep all content-enricher, Bedrock prompt, packaging, invoke, and deploy changes behind a
  dedicated human-approved TASK_SPEC and GO.
- Use the existing type-safety recovery plan as the starting point rather than editing this
  area inside unrelated work.

### Medium

#### Planning Artifacts Contain Stale State Despite Idle Queue

`TASK_QUEUE.md` and `TASKS.md` currently show no actionable pending work, but descriptive
artifacts still contain older branch, queue, and task-state snapshots. `MASTER_TASK_SPEC.md`
still describes the deploy-gate task as claimed or in progress, while later physical state
and task files show that work as closed or review-bound.

Risk:

- Future agents may trust stale descriptive text instead of `TASK_QUEUE.md`, current git state,
  and GitHub PR state.
- Queue automation may duplicate already completed work or misread review-bound work as
  executable backlog.

Containment:

- Before product execution, refresh remote refs in a write-capable session and reconcile
  `TASK_QUEUE.md`, `TASKS.md`, open PRs, and current branch ancestry.
- Prefer `AGENTS.md`, explicit human instructions, CI config, physical git/PR state, and
  `TASK_QUEUE.md` over dated audit snapshots.
- Avoid adding per-session SHA or ahead-count snapshots unless they are required for a specific
  handoff; they become stale quickly.

#### Validation Coverage Is Strong But `npm run validate` Is Not A Browser Gate

The repo has a mature validation harness: lint, type-check, build, Jest, Playwright desktop
and mobile, `npm audit`, and a real supplement browser matrix in CI. Local `npm run validate`
intentionally excludes Playwright.

Risk:

- Portal, category, SEO, card, internal-link, or route-render changes can pass `npm run validate`
  while still breaking browser behavior.

Containment:

- Preserve the hard rule that portal/category/SEO render changes run local Playwright in
  addition to lint, type-check, build, and Jest.
- Keep local e2e isolated with `JOB_STORE_DRIVER=memory`, `SEARCH_BACKEND=local`, and
  `USE_LANCEDB=false` unless a task explicitly validates real search.

#### Type-Check Scope Excludes Some Operational And Test Trees

Root `tsconfig.json` excludes `infrastructure`, `scripts`, and `**/*.test.ts(x)` from the main
type-check command. Jest and focused tests still exercise many tests, but the main type-check
does not cover all operational TypeScript surfaces.

Risk:

- Script, infrastructure, or test-only type drift may be caught later by runtime execution
  rather than `npm run type-check`.
- Deployment/runbook scripts can remain stale while the main app validation stays green.

Containment:

- Add a scoped validation-design task if stronger type coverage is desired.
- Do not expand root type-check scope opportunistically inside unrelated product tasks.

### Low

#### Root Onboarding Entry Point Is Sparse

There is no root `README.md`. Operational knowledge is spread across `AGENTS.md`,
`PROJECT_CONTEXT.md`, `TASK_QUEUE.md`, docs, and `.planning/**`.

Risk:

- New humans or agents may discover the wrong starting document first.
- Repeated audits may spend time rediscovering the same command map.

Containment:

- If desired, add a small root README in a scoped docs task that points to `AGENTS.md`,
  `PROJECT_CONTEXT.md`, `TASK_QUEUE.md`, and the validation/deploy runbooks without changing
  governance.
