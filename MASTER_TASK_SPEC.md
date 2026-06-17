# MASTER_TASK_SPEC

Generated: 2026-06-17

## Checkpoint Status

`TASKS.md` contained active work in `ESTADO: TODO`, so the coordinator has claimed all listed items by moving them to `ESTADO: IN_PROGRESS`.

No implementation, delegation, branch creation, commit, push, PR update, deploy, AWS write, Lambda invoke/update, Terraform/EventBridge action, feature flag change, or `production-content-enricher` edit will start until the human checkpoint word `APPROVED` is received.

## Governance Reconciliation

- Primary repo protocol remains `AGENTS.md`.
- `git fetch origin` has been run before planning.
- Product diffs will be evaluated against `origin/main`, not local `main`.
- `TASKS.md` says these are proposed backlog tasks, not active queue work by default. The current human instruction explicitly assigns them through `TASKS.md`, so they are planned here as the active batch.
- `TASK_QUEUE.md` still contains stale-looking `PENDING` SEO cluster entries while `.planning/queue-idle.md` and `PROJECT_CONTEXT.md` report PRs for those clusters. The first execution task must reconcile this before any product work.
- Production deploy remains a human gate under `AGENTS.md`. The execution loop may prepare validated PRs and run allowed local checks, but it must not merge to `main`, run `npm run deploy`, perform AWS writes, invoke/update Lambda, alter Terraform/EventBridge, flip feature flags, or touch Bedrock without an explicit human gate for that specific action.

## Global Plan

Execution order after `APPROVED`:

1. Reconcile queue and PR state before trusting stale local queue data.
2. Resolve ownership of root audit artifacts so future agents know which files are authoritative.
3. Add the approved context-reset governance rule.
4. Audit duplicate files with ` 2` suffix and make only mechanical, scoped fixes if the audit proves they are unambiguous.
5. Discover database migration source of truth without changing live data or running migrations.
6. Classify portal and API logging without changing runtime logging behavior unless required by the task acceptance evidence.
7. Map search backend contracts as documentation and tests-only work unless defects are directly proven.
8. Plan content-enricher type-safety recovery as planning only; no source edit, deploy, Bedrock, Lambda, or AWS write.
9. Review E2E runtime isolation and patch only proven local test isolation gaps.
10. Review unsafe health claim gates and patch only focused tests/patterns if gaps are proven.
11. Add `.DS_Store` hygiene, limited to ignore/removal policy and repository hygiene files.

Each task will get its own task folder under `.planning/<task-slug>/` with a task-level `TASK_SPEC.md`, `CHANGE_MANIFEST.md`, and optional `OBSERVATIONS.md`. Where tasks touch the same file, execution will be serialized and rebased from the prior branch or consolidated into a single governance PR if the diff cannot be split cleanly.

## Global IN SCOPE

- `TASKS.md`
- `TASK_QUEUE.md`
- `PROJECT_CONTEXT.md`
- `AGENTS.md`
- `OBSERVATIONS.md`
- `.planning/**`
- `.gitignore`
- repository hygiene files directly needed for `.DS_Store`
- `.github/workflows/**` only if needed to confirm validation behavior, not to change CI without task proof
- `package.json` only for reading script definitions, not dependency or script changes unless a task explicitly proves necessity
- `app/[locale]/portal/**` read-only for logging, E2E, search, and health-claim audits unless a task proves a focused fix is required
- `app/api/**` read-only for API logging audit unless a task proves a focused fix is required
- `lib/search-service.ts`, `lib/lancedb-service.ts`, `lib/portal/**` read-only for search contract mapping unless a task proves a focused fix is required
- `infrastructure/migrations/**` read-only for migration source-of-truth discovery unless the task is converted into an approved implementation task
- `e2e/**` for runtime isolation review and focused test fixes
- `services/content-enricher/**` read-only only for type-safety recovery planning

## Global OUT OF SCOPE

- Merge to `main`
- `npm run deploy`, `git push origin main`, or any production deployment
- AWS writes, Lambda invoke/update, Terraform/EventBridge changes, feature flag flips
- Bedrock calls or changes
- Editing `services/content-enricher/**` during the planning task
- Dependency upgrades
- Broad refactors, folder moves, shared utility extraction, formatting churn
- Product SEO cluster implementation from stale `TASK_QUEUE.md` before reconciliation
- Checkout, Stripe, auth, referrals, Cognito, subscriptions, or unrelated portal UX
- Running migrations or changing database state
- Rewriting whole files when a small diff is sufficient

## Delegation Strategy And Context Isolation

Delegation will start only after `APPROVED`. The coordinator will pass each sub-agent only the files listed for that task plus minimal governance excerpts.

| Task | Route / model role dictated by task | Isolated context bundle |
| --- | --- | --- |
| Reconcile Queue State With Open PRs | Senior repo-ops coding agent with GitHub/PR access | `TASK_QUEUE.md`, `.planning/queue-idle.md`, `.planning/seo-clusters-integration/**`, `PROJECT_CONTEXT.md`, git/PR metadata |
| Confirm Root Audit Artifacts Ownership | Documentation and governance agent | `PROJECT_CONTEXT.md`, `OBSERVATIONS.md`, `TASKS.md`, `.planning/queue-idle.md`, `AGENTS.md` |
| Add Context Reset Governance Rule | Documentation and governance agent | `AGENTS.md`, `PROJECT_CONTEXT.md`, current rule text |
| Audit Duplicate Files With Space-Two Suffix | Careful TypeScript maintenance agent | `rg --files` duplicate list, only each duplicate pair, nearest imports/tests |
| Discover Database Migration Source Of Truth | Backend/data platform agent with SQL migration experience | `infrastructure/migrations/**`, migration runner, docs mentioning migrations |
| Classify Portal And API Logging | Observability-focused frontend/full-stack agent | logging call sites in `app/[locale]/portal/**`, `app/api/**`, monitoring helpers |
| Map Search Backend Contracts | Full-stack search/data agent | `lib/search-service.ts`, `lib/lancedb-service.ts`, `lib/portal/**`, related API handlers/tests |
| Plan Content Enricher Type-Safety Recovery | Senior TypeScript/AWS Lambda agent with human supervision | `services/content-enricher/**` read-only, package scripts, build/test output |
| Review E2E Runtime Isolation | QA automation agent familiar with Playwright | `playwright.config.*`, `e2e/**`, test env setup, portal job/search env paths |
| Review Unsafe Health Claim Gates | Health-copy QA agent plus TypeScript test agent | SEO/copy tests, unsafe wording pattern tests, portal/category SEO copy files |
| Add `.DS_Store` Hygiene Rule | Repository hygiene agent | `.gitignore`, git tracked/untracked hygiene state, `TASKS.md` |

If multi-agent tooling is unavailable or a task is narrow, the coordinator will execute directly but preserve the same context-isolation boundaries.

## Validation Harness

Pre-execution state checks:

```bash
git fetch origin
git status --short --branch
git diff --name-only origin/main...HEAD
```

Local dependency and script verification:

```bash
npm ci
npm run lint
npm run type-check
npm run build
npm test -- --passWithNoTests
```

Combined local validation where appropriate:

```bash
npm run validate
```

Browser/runtime validation for portal, category, SEO render, E2E isolation, search UI, or consumer-facing copy changes:

```bash
npm run test:e2e
npm run test:e2e -- e2e/portal.spec.ts
```

Pre-test local environment:

```bash
npm run dev
```

Note: Playwright's configured web server may start its own local test server. If so, `npm run dev` is not a separate required daemon for E2E; the run must still end with explicit `exit 0` or PASS.

Production smoke is read-only intent but still post-production-facing, so it will not be run unless the relevant gate is explicitly opened:

```bash
npm run smoke:production:portal
```

Prohibited without explicit human gate:

```bash
npm run deploy
npm run migrate
```

Retry policy:

- Maximum three attempts for the same failing validation error per task.
- After the third repeated failure, mark that task `BLOCKED`, record the log in `.planning/<task-slug>/OBSERVATIONS.md`, and continue to the next task.
- Ambiguous validation output is treated as failure.

## Branch, Commit, And Handoff Policy

- Create task branches from `origin/main`, using `codex/` branch prefix unless the task requires a stack.
- Use Conventional Commits.
- Push feature branches and open/update ready-for-review PRs against `main`.
- Never merge and never enable auto-merge.
- After each task, update `TASKS.md` to `DONE` with PR metadata or `BLOCKED` with the reason.
- Write `.planning/<task-slug>/CHANGE_MANIFEST.md`.
- Write a handoff file under `.planning/<task-slug>/HANDOFF.md` with physical state, commands run, PR link, and next safe action.
- Reconstruct context from disk before the next task.

## Approval Gate

Required exact word before any implementation or delegation:

`APPROVED`
