# SuplementAI GSD Autonomous SDLC

This is the repo-local autonomy layer for SuplementAI. It keeps humans out of routine quality approval while preserving the gates that protect `main`, production, AWS, Bedrock, LanceDB, and the content enricher.

## Map

The loop is:

`preflight -> select task -> spec -> execute -> offline certify -> read-only audit fan-out -> DONE oracle -> PR -> reset context`

The human only gates:

- merge to `main`;
- deploy/production or `.deploy-go`;
- AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags;
- Bedrock, LanceDB mutation, `production-content-enricher`;
- executive scope decisions and milestone closure.

## Six Capabilities

1. **GO-gate**
   - Blocks outward/prod actions unless a human explicitly authorizes the exact action.
   - The agent never creates `.deploy-go`.

2. **Guard**
   - Enforces scope reflex, exact in-scope files, one writer per file, max 3 repeated failures, and no unplanned refactors.

3. **Invariant ratchet**
   - Checks baseline safety invariants before DONE.
   - Any edit to this layer is tamper-visible in the digest.

4. **Offline correctness harness**
   - Runs real local validation without live providers or production side effects.
   - Includes Playwright when portal/category/SEO/render behavior changes.

5. **Audit fan-out**
   - Uses read-only reviewers that are not the writer: `gsd_reviewer`, `gsd_verifier`, and `gsd_smoke_tester`.
   - The writer cannot mark DONE without their PASS evidence.

6. **DONE-CRITERIA oracle**
   - Closes work only when validation, independent audit, and invariants pass.
   - Build success alone is not DONE.

## What Exists Now

- `AGENTS.md` has the core Agentic SDLC and production gates.
- `.agents/skills/suplementai-gsd/` provides the reusable GSD workflow.
- `.codex/agents/` defines read-only reviewer/verifier/smoke roles.
- `.codex/hooks.json` wires command-policy and stop-digest hooks.
- `scripts/gsd/` provides deterministic local checks.
- `docs/done-criteria.md` and `docs/invariants-baseline.md` define the closure oracle.

## What Still Requires Future Work

- A domain-specific formula correctness fixture harness can be added when the formula pipeline source of truth is identified.
- CI can add `npm run gsd:invariants` after this PR is merged.
- A repo or org plugin can package this skill after the workflow stabilizes.
