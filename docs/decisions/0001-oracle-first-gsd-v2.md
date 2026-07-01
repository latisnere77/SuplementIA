# Decision 0001 — Oracle-first GSD v2

Date: 2026-06-30

## Status

Accepted for repo-local governance.

## Context

SuplementAI already has Agentic SDLC machinery: `AGENTS.md`, `TASK_QUEUE.md`,
`ROADMAP.md`, GSD scripts, invariant ratchets, Playwright/Jest validation, and strict
production gates. The new method should not replace that machinery or start product
features. It should make the oracle stronger and make Codex/Claude interchangeable.

## Decision

Adopt Oracle-first GSD v2 as a retrofit:

- `AGENTS.md` remains authority.
- `CLAUDE.md` references `@AGENTS.md`.
- SDD phases are specified as versioned `.planning/<slug>/` artifacts.
- Product behavior changes require a TDD red/green checkpoint unless explicitly not
  applicable.
- Autonomy level starts at L1 for new proposals and remains L2 for already-approved
  queue/roadmap work.
- The invariant ratchet protects the method's required files and tokens.

## Consequences

- No feature work begins without an oracle-backed spec and validation plan.
- Future agents can reconstruct state from files, not chat.
- Methodology changes are treated as safety-layer changes and must be visible in digests.
