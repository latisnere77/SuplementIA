# SuplementAI STATE

Current operating mode: Oracle-first GSD v2 on top of the existing SuplementAI GSD loop.

## Product

SuplementAI is a Next.js App Router portal for evidence-aware supplement search and
recommendations, Spanish-first, with clinical copy gating, SEO content, and public
production verification gates.

## Canonical Sources

- Agent contract: `AGENTS.md`
- Phase roadmap: `ROADMAP.md`
- Legacy queue: `TASK_QUEUE.md`
- DONE oracle: `docs/done-criteria.md`
- Invariant baseline: `docs/invariants-baseline.md`
- Oracle-first method: `docs/oracle-first-gsd-v2.md`

## Current Queue Posture

`TASK_QUEUE.md` has no active `PENDING` items. `ROADMAP.md` controls post-queue phases.
Phase 5 production verification is documentally closed from already-merged public/read-only
evidence after explicit human GO. Open PRs must be reviewed/merged by a human before their
evidence is considered part of `main`.

## Current Evidence

- PR #193 merged scoped 504 hardening to `main`.
- PR #194 merged post-merge public/read-only Phase 5 smoke evidence to `main`.
- PR #195 merged Oracle-first GSD v2 governance to `main`.
- Phase 5 closure used no deploy, `.deploy-go`, AWS reads/writes, Lambda,
  Terraform/EventBridge, feature flags, Bedrock, LanceDB, checkout/live purchase, real
  GitHub issues, or `production-content-enricher`.

## Gates

No deploy, `.deploy-go`, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature
flags, Bedrock, LanceDB mutation, checkout/live purchase, real GitHub issues, or
`production-content-enricher` work without explicit human GO for that exact action.
