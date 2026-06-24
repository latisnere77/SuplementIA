# SuplementAI Invariants Baseline

These invariants must not be weakened silently.

## Production And Remote Gates

- The agent never merges `main`.
- The agent never enables auto-merge.
- The agent never creates `.deploy-go`.
- Deploy, production smoke, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation, and `production-content-enricher` require explicit human GO and a task spec for that exact action.
- AWS read-only inspection requires confirmed account `643942183354` and `--profile suplementai-admin` when included by the task spec.

## Execution Safety

- Max 3 repeated failures for the same gate.
- No repeated identical tool calls more than twice.
- One writer per file unless the task spec explicitly serializes ownership.
- No subagent writers nested under writers.
- No broad refactors, dependency updates, or shared abstractions unless explicitly in scope.

## Product Safety

- Health copy must not claim cure, treatment, guarantees, or clinical proof.
- Portal/category/SEO/render changes require local Playwright.
- Negative test controls must not be weakened.
- `COFEPRIS_COSMETIC_ALLOWLIST` is absent, so cosmetic approval/adminApproval must not be forged.

## Autonomy Safety

- The writer never self-approves.
- DONE requires offline validation, read-only fan-out PASS, and invariant ratchet PASS.
- Changes to this file, `docs/done-criteria.md`, `.codex/hooks.json`, `.agents/skills/suplementai-gsd/`, or `scripts/gsd/` must appear in the digest.
