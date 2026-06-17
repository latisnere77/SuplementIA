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

### Overlapping Initial Database Migrations

Both `infrastructure/migrations/001_initial_schema.sql` and `infrastructure/migrations/001_setup_pgvector.sql` create `supplements`, pgvector extension, indexes, triggers, and search-count functions.

Risk:

- Fresh environments may apply ambiguous schema intent.
- Trigger/index naming differs between migrations.
- Migration history may not be reproducible without knowing which file was actually applied in production.

Containment:

- Do not run migrations casually.
- Reconcile migration history in a dedicated read-only discovery task before any schema change.

### AWS/Bedrock Paths Can Be Reached From Search Or Enrichment

`lib/lancedb-service.ts` uses Bedrock Titan embeddings. Enrichment routes and `services/content-enricher/**` use Bedrock-related code. Async job state uses DynamoDB.

Risk:

- Local tests or debug routes may accidentally require AWS credentials if env isolation is not applied.
- Paid or gated services may be touched outside intended workflow.

Containment:

- For local e2e, keep `SEARCH_BACKEND=local`, `USE_LANCEDB=false`, and `JOB_STORE_DRIVER=memory`.
- Treat AWS writes, Lambda invokes, and Bedrock actions as human-gated.

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
- Create a scoped logging audit that classifies structured observability versus debug leftovers.

### Mixed Search Backends And Vocabulary Sources

Search can use local catalog, LanceDB, Lambda, Postgres/pgvector concepts, and content-enricher outputs. The live source of truth for supplement names differs by context.

Risk:

- Autocomplete, SEO slugs, search results, and evidence enrichment may disagree.
- Slug additions can pass one path and fail another.

Containment:

- For SEO/category tasks, verify `supplementSlug` values against actual portal/category rendering and existing SEO tests.
- Avoid adding another abstraction until source-of-truth ownership is decided.

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
