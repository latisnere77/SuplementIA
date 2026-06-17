# TASK_SPEC - Plan Content Enricher Type-Safety Recovery

Generated: 2026-06-17

## Objective

Plan a safe, human-gated path to recover TypeScript type-safety in the governed reconstructed `services/content-enricher/**` source tree.

## Reconciliation Against `origin/main`

- `services/content-enricher/src/*.ts` has `/* eslint-disable */` and `// @ts-nocheck` headers.
- `services/content-enricher/tsconfig.json` sets `strict: false` and `noImplicitAny: false`.
- The reconstruction tests compare selected prompt/schema behavior to `eval/fixtures/enricher-live-dist/**`.
- `services/content-enricher/__tests__/reconstruction.test.ts` runs `npm --prefix services/content-enricher run build`, which writes `dist/`.

## IN SCOPE

- `docs/content-enricher-type-safety-recovery-plan.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/content-enricher-type-safety-recovery/**`

## OUT OF SCOPE

- Editing `services/content-enricher/**`
- Running build/test commands that rewrite `services/content-enricher/dist/**`
- Bedrock calls
- Lambda invoke/update
- Deployment or artifact packaging
- AWS writes, Terraform, EventBridge, feature flags

## Implementation Plan

1. Document current type-safety baseline.
2. Define a phased recovery plan with contract anchors and validation gates.
3. Explicitly require human approval before any future content-enricher source edit.
4. Update observations and task state.

## Validation Harness

```bash
git diff --check
rg -n "Human Gate|Phase 0|Phase 1|Do Not Edit" docs/content-enricher-type-safety-recovery-plan.md OBSERVATIONS.md
```

Full content-enricher build/test is out of scope because this task is planning-only and build rewrites `dist/`.

## Risks

- Risk: type cleanup changes prompt/Bedrock behavior.
- Mitigation: future implementation must use artifact diffing, golden fixtures, and human gates before source edits.
