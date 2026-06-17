# Content Enricher Type-Safety Recovery Plan

Generated: 2026-06-17

## Do Not Edit Without Human Gate

`services/content-enricher/**` is a governed reconstruction of the live `production-content-enricher` artifact. Any source edit, prompt edit, Bedrock behavior change, Lambda packaging change, artifact rewrite, invoke, deploy, or production-state change requires explicit human approval for that specific task.

This document is a plan only. No content-enricher source, dist file, prompt, Lambda, Bedrock setting, or AWS resource was changed.

## Current Baseline

Observed baseline:

- Every `services/content-enricher/src/*.ts` file starts with broad lint/type suppression.
- `tsconfig.json` uses `strict: false` and `noImplicitAny: false`.
- `dist/*.d.ts` exists and should be treated as a public contract anchor.
- `__tests__/reconstruction.test.ts` compares prompt/schema behavior to `eval/fixtures/enricher-live-dist/**`.
- The reconstruction test suite runs a build, which writes `services/content-enricher/dist/**`.

Risk:

- Removing `@ts-nocheck` globally would be too broad and could lead to behavior-preserving uncertainty across Bedrock prompts, DynamoDB cache paths, retry behavior, and Lambda handler shape.

## Phase 0 - Baseline Capture

Goal: capture current generated and behavioral state before any source edit.

Required gates:

- Human approval to work in `services/content-enricher/**`.
- Fresh branch from `origin/main`.
- No AWS calls.

Required evidence:

- `git status --short` before and after build.
- `npm --prefix services/content-enricher run build`.
- `npm --prefix services/content-enricher test`.
- `git diff -- services/content-enricher/dist services/content-enricher/src` after build.
- A saved artifact-diff note in `.planning/<task>/`.

Exit criteria:

- Build/test baseline is reproducible.
- Any generated `dist` churn is understood before source typing begins.

## Phase 1 - Type Contract Inventory

Goal: define interfaces without changing behavior.

Candidate contract anchors:

- `services/content-enricher/dist/*.d.ts`
- `services/content-enricher/src/types.ts`
- `ENRICHED_CONTENT_TOOL_CONFIG`
- Lambda handler event/response shape in `src/index.ts`
- Bedrock request/response types in `src/bedrock.ts` and `src/bedrockConverse.ts`
- DynamoDB job/cache shapes in `src/job-store.ts` and `src/cache.ts`

Allowed work:

- Add task-local notes and type inventory docs.
- Add tests that compare reconstructed public exports to live fixture exports.

Not allowed:

- Prompt text changes.
- Retry timing changes.
- Model ID or Bedrock parameter changes.
- Lambda event shape changes.

## Phase 2 - Low-Risk Modules

Start with modules that have little or no external side effect:

1. `src/types.ts`
2. `src/config.ts`
3. `src/retry.ts`
4. `src/toolSchema.ts`

Per-module rule:

- Remove `@ts-nocheck` from one file at a time.
- Keep emitted JavaScript semantically equivalent.
- Run content-enricher build/test after each module.
- Compare generated `dist/<module>.js` and `.d.ts` to understand drift.

## Phase 3 - Data Shape Modules

Next modules:

1. `src/prompts.ts`
2. `src/prompts-examine-style.ts`
3. `src/synergies.ts`
4. `src/cache.ts`
5. `src/job-store.ts`

Additional checks:

- Golden prompt fixture comparisons.
- Tool schema equality.
- Validation behavior for string/object dosage and safety.
- No cache key or DynamoDB attribute-name changes without explicit approval.

## Phase 4 - Bedrock And Handler Modules

Highest-risk modules:

1. `src/bedrock.ts`
2. `src/bedrockConverse.ts`
3. `src/studySummarizer.ts`
4. `src/index.ts`

Required extra gates:

- Human approval before edits.
- No live Bedrock invocation during local validation.
- Fixture-based response parsing tests.
- Explicit rollback plan.

## Phase 5 - Compiler Tightening

Only after all modules compile without `@ts-nocheck`:

1. Set `noImplicitAny: true`.
2. Resolve remaining explicit `any` uses or document intentional ones.
3. Set `strict: true` only after a full clean pass.

Each compiler flag change should be a separate commit with build/test evidence.

## Required Validation For Future Implementation

Minimum per implementation PR:

```bash
npm --prefix services/content-enricher run build
npm --prefix services/content-enricher test
git diff -- services/content-enricher/src services/content-enricher/dist
```

Recommended additional checks:

- Compare generated prompt strings against golden fixtures.
- Compare exported tool schema to `eval/fixtures/enricher-live-dist/toolSchema.js`.
- Verify no model ID, temperature, max token, tool schema, prompt, or retry timing changed unless explicitly approved.

## Stop Conditions

Mark future implementation task `BLOCKED` if:

- A type fix requires behavior changes outside the approved module.
- Generated `dist` changes cannot be explained.
- A test requires live AWS/Bedrock.
- A prompt/schema/model change appears necessary but was not approved in the task spec.
