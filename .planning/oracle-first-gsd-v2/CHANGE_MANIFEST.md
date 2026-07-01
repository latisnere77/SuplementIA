# CHANGE_MANIFEST — oracle-first-gsd-v2

Date: 2026-06-30

## Summary

Adapted the user's Software-E2E-Autonomo and AnkoSoft Agentic SDLC method to SuplementAI
as Oracle-first GSD v2. This is a governance/oracle retrofit only; no product feature,
portal render, API behavior, deploy, or AWS action was changed.

## Files Changed

- `AGENTS.md`
  - Adds the Oracle-first GSD v2 section with SDD, TDD checkpoint, shared Codex/Claude
    contract, and L0-L4 autonomy posture.
- `CLAUDE.md`
  - References `@AGENTS.md` so Claude Code follows the same repo contract.
- `STATE.md`
  - Captures current repo posture without replacing `ROADMAP.md`.
- `docs/oracle-first-gsd-v2.md`
  - Defines Phase 0 retrofit, SDD cycle, TDD contract, L0-L4 autonomy ladder,
    mini-benchmark, and context engineering.
- `docs/sdd-task-template.md`
  - Provides the specify → plan → tasks → implement → verify template.
- `docs/decisions/0001-oracle-first-gsd-v2.md`
  - Records the architecture/governance decision.
- `docs/done-criteria.md`
  - Adds SDD and TDD evidence to DONE.
- `docs/invariants-baseline.md`
  - Adds non-weakenable Oracle-first GSD v2 invariants.
- `scripts/gsd/invariant-ratchet.mjs`
  - Ratchets required files/tokens for the new method.
- `jest.config.js`
  - Adds a positive global `coverageThreshold`.
- `.planning/oracle-first-gsd-v2/**`
  - Adds spec, change manifest, and audit evidence.

## Validation

- `npm run gsd:invariants` — PASS.
- `npm run gsd:offline-certify -- --quick` — PASS.
- `npm test -- --runInBand --runTestsByPath lib/search-service.test.ts` — PASS, 25/25.
- `git diff --check` — PASS.
- `npm run gsd:done -- --audit-pass-file .planning/oracle-first-gsd-v2/AUDIT_FANOUT.md` — PASS.

## Playwright / TDD Applicability

- Playwright is not applicable because no portal render, category, SEO, or runtime API
  behavior changed.
- TDD red/green checkpoint is not applicable because this task is governance/docs plus
  oracle ratchet configuration, not product behavior.

## Gates

- No deploy.
- No `.deploy-go`.
- No AWS reads/writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flags.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
- No checkout/live purchase.
- No real GitHub issues.

## Notes

- `ROADMAP.md` was intentionally not edited because PR #194 is open and already touches
  Phase 5 evidence there.
- This change strengthens `scripts/gsd/invariant-ratchet.mjs`; it does not weaken any
  existing GSD gate.
