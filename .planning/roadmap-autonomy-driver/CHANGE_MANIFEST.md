# CHANGE_MANIFEST — roadmap autonomy driver

## Summary

- Added `ROADMAP.md` as the canonical phase roadmap for SuplementAI.
- Added `scripts/gsd-autonomous.mjs` to parse and classify roadmap phases.
- Added `scripts/gsd-autonomous` wrapper so future prompts can run `scripts/gsd-autonomous --only N`.
- Added `scripts/autonomy-loop.sh` to run a bounded phase batch in dry-run or spec-prep mode.
- Recorded read-only recon evidence from GitHub, local code/docs, and AWS Amplify.
- Updated `ROADMAP.md` with the anatomical Agentic SDLC order: heart, brain, nervous system, hands, legs, muscles, and fingers.
- Classified PR #184 as heart, PR #185 as brain, `stop-hook-json-output` as nervous system, and Codex permissions/autonomy as the posterior hands task.
- Paused product-facing roadmap phases behind infra gates so only the nervous-system fix remains `ABIERTA_REAL`.

## Product Understanding Captured

- SuplementAI is an evidence-aware supplement search and recommendation portal.
- The core portal includes search, quiz, recommendations, enrichment, studies, analytics, subscription, referral, and monitoring APIs.
- Clinical safety depends on PubMed profile classification, human-clinical filtering, insufficient-data handling, botanical identity, and unsafe wording gates.
- Research-audit tooling exists locally and is report-only by design.
- AWS production is Amplify app `d2yn3faih4ykom` in account `643942183354`; read-only checks confirmed production branch `main` status `SUCCEED`.

## Current Roadmap State

- `HECHO`: 1 phase.
- `ESPERA_GATE`: 9 phases.
- `ABIERTA_REAL`: 1 phase.
- Next open phase: Phase 3, `stop-hook-json-output`.
- PR #184 remains heart/review-bound waiting for human review/merge and was not reimplemented.
- PR #185 is brain/review-bound once this update is pushed and checks remain green.

## Local Validation

- `node --check scripts/gsd-autonomous.mjs` -> exit 0
- `bash -n scripts/autonomy-loop.sh` -> exit 0
- `bash -n scripts/gsd-autonomous` -> exit 0
- `scripts/gsd-autonomous --recon` -> parsed 11 phases with counts `HECHO: 1`, `ESPERA_GATE: 9`, `ABIERTA_REAL: 1`
- `scripts/gsd-autonomous --only 3 --dry-run` -> selected Phase 3 as `ABIERTA_REAL`
- `scripts/autonomy-loop.sh --dry-run --max-phases 3` -> selected only Phase 3 after anatomy gating
- `scripts/gsd-autonomous --next-open --max 3` -> printed `3`
- `npm run gsd:invariants` -> `GSD_INVARIANTS: PASS`
- `npm run gsd:offline-certify -- --quick` -> `GSD_OFFLINE_CERTIFY: PASS quick`
- `git diff --check` -> exit 0

## Gates

No merge, deploy, AWS write, Lambda invoke/update, Terraform/EventBridge, feature flag, Bedrock, LanceDB mutation, live provider, production smoke, or `production-content-enricher` action was performed.
