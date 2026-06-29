# SuplementAI ROADMAP

Canonical phase roadmap for autonomous SDLC loops. The driver reads this file and classifies phases as `HECHO`, `ESPERA_GATE`, or `ABIERTA_REAL`.

Last recon: 2026-06-29

## Product Snapshot

SuplementAI is a Next.js App Router product for evidence-aware supplement search and recommendations. It has:

- Public portal pages in `app/[locale]/portal/**` with Spanish-first i18n and SEO category content.
- Supplement search, quiz, recommendation, enrichment, studies, analytics, subscription, referral, and monitoring APIs under `app/api/**`.
- Clinical gating around PubMed profiles, human-clinical filtering, insufficient-data handling, botanical identity, and unsafe wording tests.
- Local catalog and evidence data in `lib/portal/**`, plus search/vector/cache services in `lib/services/**` and `lib/cache/**`.
- Offline research-audit tooling in `lib/research-audit/**` and `scripts/research-audit/**`.
- AWS production deployment through Amplify app `d2yn3faih4ykom` in account `643942183354`.
- GSD governance docs/scripts/hooks under `.agents/**`, `.codex/**`, `docs/*criteria*`, `docs/*invariants*`, and `scripts/gsd/**`.

## Recon Evidence

- GitHub merged PRs: PR #184, `Harden GSD SDLC gates`; PR #186, `Fix GSD stop hook JSON output`; PR #185, `Add roadmap autonomy driver`; PR #188, `Refresh Codex permissions planning`.
- GitHub PR #187, `Plan Codex permissions autonomy layer`, was closed as superseded after PR #188 replaced it from current `ROADMAP.md`.
- `TASK_QUEUE.md`: T1-T14 are `DONE`; no `PENDING` task headers.
- PR #188 closed the Hands planning replacement on `main`.
- AWS STS read-only identity: account `643942183354`, assumed role `CrossAccountAdminRole`.
- AWS Amplify read-only: app `SuplementAI` (`d2yn3faih4ykom`), production branch `main`, status `SUCCEED`, last deploy `2026-06-24T08:00:58-06:00`.
- Amplify `main` env has production site/search/studies/enricher URLs configured.
- No `scripts/autonomy-loop.sh`, `scripts/gsd-autonomous`, or prior `ROADMAP.md` existed before this task.

## Anatomical SDLC Order

This is the canonical execution order while product work is paused. Do not start product
features until heart, brain, nervous system, and hands are closed or review-bound with evidence.

1. Heart: PR #184, `Harden GSD SDLC gates` — merged.
2. Brain: PR #185, `Add roadmap autonomy driver` — merged.
3. Nervous system: PR #186, `Fix GSD stop hook JSON output` — merged.
4. Hands: Codex permissions and autonomy controls — merged.
5. Legs: release and production verification runbooks.
6. Muscles: research-audit local and report-only execution capacity.
7. Fingers: narrow cleanup, observability, and monetization verification work.

## Phase Index

### Phase 1 — gsd-gate-hardening — HECHO

Layer: Heart.

Objective: harden GSD command policy, add invariant CI gate, normalize audit evidence, and refresh queue-idle state.

Evidence:

- PR #184 merged to `main`.
- GitHub `Validate` check was successful before merge.

Closure gate:

- Closed by human-approved merge.

Next action:

- No action.

### Phase 2 — roadmap-autonomy-driver — HECHO

Layer: Brain.

Objective: create this `ROADMAP.md` and a real local driver for phase classification and batch execution.

Evidence:

- PR #185 merged to `main`.
- GitHub `Validate` check was successful before merge.
- This roadmap branch records the anatomical execution order before product work resumes.
- Driver must parse this roadmap and support `--recon`, `--only N`, and dry-run batch mode.

Closure gate:

- Closed by human-approved merge.

Next action:

- No action.

### Phase 3 — stop-hook-json-output — HECHO

Layer: Nervous system.

Objective: fix the Stop hook integration so `node scripts/gsd/digest.mjs --hook` emits hook-compatible output while preserving human CLI output for `npm run gsd:digest`.

Evidence:

- PR #186 merged to `main`.
- GitHub `Validate` check was successful before merge.
- `scripts/gsd/digest.mjs --hook` emits hook-compatible output while preserving human CLI output.

In scope:

- `scripts/gsd/digest.mjs`
- focused planning/audit files

Closure gate:

- Closed by human-approved merge.

### Phase 4 — codex-permissions-autonomy — HECHO

Layer: Hands.

Objective: tighten Codex permission/autonomy controls after the heart, brain, and nervous system are review-bound, without weakening GSD gates or granting broad destructive permissions.

Evidence:

- PR #188 merged to `main`.
- GitHub `Validate` check was successful before merge.
- PR #187 was closed as superseded/stale after PR #188 replaced it.
- Hands planning is current with `ROADMAP.md` and preserves the no-deploy/no-AWS/no-destructive-gate posture.

In scope:

- Minimal repo-local policy/docs/scripts needed to make Codex autonomy predictable.
- Focused planning/audit files.

Out of scope:

- Broad permission grants.
- Destructive command approvals.
- Merge, deploy, AWS writes, Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation, or `production-content-enricher`.

Closure gate:

- Closed by human-approved merge of PR #188.

Next action:

- No action.

### Phase 5 — portal-production-verification — ESPERA_GATE

Layer: Legs.

Objective: verify current production behavior against the portal release hardening checklist and canary matrix.

Why gated:

- Production smoke and release acceptance are human-owned production actions.
- AWS Amplify read-only confirms production `main` is deployed and green, but smoke acceptance is not implied.

Evidence available:

- `docs/portal-release-hardening-checklist.md`
- `docs/portal-critical-supplement-smoke-matrix.md`
- `scripts/portal-production-smoke.mjs`
- E2E suites in `e2e/portal.spec.ts` and `e2e/portal-real-search.spec.ts`

Next action:

- Prepare `.deploy-go` pre-list/checklist only after human GO. Never create `.deploy-go` autonomously.

### Phase 6 — research-audit-local-reporting — HECHO

Layer: Muscles.

Objective: provide local, report-only research-audit tooling for aggregate events and provider simulation.

Evidence:

- `lib/research-audit/**` includes config, schema, packets, provider runner, simulator, redaction, PMID verifier, and GitHub issue publisher modules.
- `scripts/research-audit/run-fixture-audit.ts`, `run-event-audit.ts`, `run-provider-audit.ts`, `import-seo-export.ts`, and `render-weekly-issue.ts` exist.
- Docs define report-only architecture and safety rules.

Remaining edge:

- AWS report-only deployment is a separate gated phase.

### Phase 7 — research-audit-aws-report-only — ESPERA_GATE

Layer: Muscles.

Objective: deploy or wire the AWS report-only research-audit workflow for aggregate inputs and human-reviewable S3 reports.

Why gated:

- Requires AWS writes, IAM/S3/Lambda configuration, and possibly schedule setup.

Evidence available:

- `docs/research-audit-aws-report-only.md`
- `docs/research-audit-manual-infra-runbook.md`
- `lib/research-audit/aws-report-runner.ts`
- `lib/research-audit/aws-lambda-handler.ts`

Next action:

- Prepare an exact GO block when requested; do not run cloud writes autonomously.

### Phase 8 — research-audit-github-issue-publisher — ABIERTA_REAL

Layer: Muscles.

Objective: certify the report-to-issue publisher as a manual/offline communication layer and decide whether it is ready for gated use.

Why open:

- Code and tests exist, but roadmap closure evidence is not recorded as a phase.
- The phase must verify it cannot open issues automatically without explicit human-controlled invocation.

In scope:

- `docs/research-audit-github-issue-publisher.md`
- `lib/research-audit/github-issue-publisher.ts`
- `lib/research-audit/github-issue-publisher.test.ts`
- relevant scripts/docs only

Closure gate:

- focused Jest test
- `npm run gsd:invariants`
- read-only fan-out PASS

Next action:

- Create a focused GSD task to certify the manual/offline issue publisher without opening
  issues automatically and without using AWS, Bedrock, LanceDB, or production-content-enricher.

### Phase 9 — portal-debug-and-duplicate-route-cleanup — ESPERA_GATE

Layer: Fingers.

Objective: audit and remove or quarantine obvious debug/duplicate artifacts that increase release risk.

Why open:

- Duplicate-looking files exist, including `app/api/test-env/route 2.ts`, `app/api/supplements/route 2.ts`, duplicate `__tests__ 2` paths, `lib/cache/simple-cache 2.ts`, and `components/portal/VariantSelectorModal 2.tsx`.
- Debug/test routes exist under production app paths, including `app/api/test-env/**`, `app/api/test-lancedb/**`, `app/[locale]/portal/debug-enrich/**`, and `app/[locale]/portal/stream-test/**`.

Closure gate:

- Inventory first, then smallest safe cleanup PR.
- If any route is production-reachable and removal is ambiguous, mark blocked with exact ask.
- Run lint/type-check/Jest and Playwright if portal render changes.

Next action:

- Product cleanup is paused until the infra anatomy gates ahead of fingers are closed or REVIEW_BOUND.

### Phase 10 — analytics-persistence-and-observability — ESPERA_GATE

Layer: Fingers.

Objective: turn portal analytics and structured outcomes into durable, privacy-safe observability inputs.

Why open:

- Existing analytics route logs summaries, while docs identify long-term storage as TODO.
- Research-audit inputs need aggregate, redacted events rather than raw request payloads.

In scope:

- `app/api/portal/analytics/route.ts`
- `lib/portal/structured-logger.ts`
- `docs/portal-observability.md`
- research-audit event docs/tests if needed

Closure gate:

- No PII storage.
- No provider calls.
- Unit tests for redaction/aggregation behavior.

Next action:

- Product/observability work is paused until the infra anatomy gates ahead of fingers are closed or REVIEW_BOUND.

### Phase 11 — monetization-funnel-verification — ESPERA_GATE

Layer: Fingers.

Objective: verify iHerb affiliate and subscription/Stripe funnel behavior without changing checkout or production settings.

Why open:

- Monetization docs and UI exist, but roadmap-level closure evidence is absent.
- Checkout and affiliate behavior are high-risk business flows.

In scope:

- `docs/iherb-affiliate-monetization.md`
- `components/portal/ProductRecommendationsGrid.tsx`
- `app/api/portal/subscribe/route.ts`
- relevant tests

Closure gate:

- Offline tests only unless human GO permits live/payment checks.
- No checkout mutation, production flag change, or live purchase.

Next action:

- Product funnel work is paused until the infra anatomy gates ahead of fingers are closed or REVIEW_BOUND.

## Driver Contract

The canonical driver is:

```bash
scripts/autonomy-loop.sh --max-phases 3
scripts/gsd-autonomous --only 3 --dry-run
```

Rules:

- `HECHO`: never reimplement; report evidence.
- `ESPERA_GATE`: report required human gate and continue to another `ABIERTA_REAL` phase if batch mode allows.
- `ABIERTA_REAL`: create a phase task plan or execute only inside the Codex/GSD writer loop; the shell driver itself must not mutate product code or cross gates.
- Driver output must be machine-readable enough for closure tooling and human-readable enough for the final digest.
