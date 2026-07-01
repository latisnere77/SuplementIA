# TASK_SPEC — oracle-first-gsd-v2

Date: 2026-06-30

## Objective

Adapt the user's Software-E2E-Autonomo and AnkoSoft Agentic SDLC method to the existing
SuplementAI repo as Oracle-first GSD v2, without starting product features.

## Context

- Product: Next.js evidence-aware supplement search/recommendation portal.
- User/case: users need prudent, traceable supplement information without unsafe clinical
  claims.
- Stack: Next.js App Router i18n, TypeScript, Jest, Playwright, AWS Amplify, GSD gates.
- First milestone DONE: methodology/oracle retrofit documented and ratcheted without
  weakening existing gates.

## In Scope

- `AGENTS.md`
- `CLAUDE.md`
- `STATE.md`
- `docs/done-criteria.md`
- `docs/invariants-baseline.md`
- `docs/oracle-first-gsd-v2.md`
- `docs/sdd-task-template.md`
- `docs/decisions/0001-oracle-first-gsd-v2.md`
- `scripts/gsd/invariant-ratchet.mjs`
- `jest.config.js`
- `.planning/oracle-first-gsd-v2/**`

## Out Of Scope

- Product features or UI/API behavior changes.
- `ROADMAP.md` edits while PR #194 is open, to avoid branch conflict.
- Deploy or `.deploy-go`.
- AWS reads/writes, Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock,
  LanceDB mutation, checkout/live purchase, real GitHub issues, or
  `production-content-enricher`.

## Substitution Test

If this retrofit is not added, Codex and Claude do not share an explicit repo-local
Oracle-first GSD v2 contract, SDD artifacts are not standardized, TDD checkpoint evidence is
not required, and the invariant ratchet does not protect the new methodology.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `npm test -- --runInBand --runTestsByPath lib/search-service.test.ts`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/oracle-first-gsd-v2/AUDIT_FANOUT.md`

Playwright is not required because this task changes governance/docs/Jest config only and
does not touch portal render/API behavior.

## Stop Rules

- Do not edit `ROADMAP.md` until #194 is merged or explicitly superseded.
- Stop if the invariant ratchet cannot pass without weakening existing gates.
- Do not add dependencies.
- Do not mark any roadmap phase `HECHO`.

## Audit Fan-Out Plan

- Reviewer: scope, gates, and conflict check.
- Verifier: invariant, offline certify, Jest config load, and done oracle check.
- Smoke tester: confirm no product/runtime smoke required for docs-only methodology change.
