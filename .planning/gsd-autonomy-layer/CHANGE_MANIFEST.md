# CHANGE_MANIFEST — GSD Autonomy Layer

## Summary

- Added repo-scoped `suplementai-gsd` Codex skill.
- Added read-only Codex agents for reviewer, verifier, and smoke tester.
- Added GSD hooks for command policy and digest visibility.
- Added local scripts for pre-tool policy, digest, invariant ratchet, offline certification, and DONE oracle.
- Added documentation for architecture, DONE-CRITERIA, and invariant baseline.
- Added the reusable Operator Prompt and terminal-state semantics to `docs/gsd-autonomous-sdlc.md`.

## Validation

Completed locally:

```bash
npm run gsd:invariants
npm run gsd:done -- --check-config-only
node --check scripts/gsd/pre-tool-policy.mjs
node --check scripts/gsd/digest.mjs
node --check scripts/gsd/invariant-ratchet.mjs
node --check scripts/gsd/offline-certify.mjs
node --check scripts/gsd/done-oracle.mjs
npm run lint
```

Results:

- `npm run gsd:invariants` -> `GSD_INVARIANTS: PASS`
- `npm run gsd:done -- --check-config-only` -> `GSD_DONE: PASS config-only`
- `node --check scripts/gsd/pre-tool-policy.mjs` -> exit 0
- `node --check scripts/gsd/digest.mjs` -> exit 0
- `node --check scripts/gsd/invariant-ratchet.mjs` -> exit 0
- `node --check scripts/gsd/offline-certify.mjs` -> exit 0
- `node --check scripts/gsd/done-oracle.mjs` -> exit 0
- `npm run gsd:offline-certify -- --quick` -> `GSD_OFFLINE_CERTIFY: PASS quick`
- `npm run gsd:digest` -> `deploy_go=ABSENT`, protected GSD files listed as tamper-visible
- `npm run lint` -> exit 0

## Gates

No merge, deploy, AWS write, Bedrock, LanceDB mutation, live provider, or `production-content-enricher` action performed.
