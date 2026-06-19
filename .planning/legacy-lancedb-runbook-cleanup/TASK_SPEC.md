# TASK_SPEC - Legacy LanceDB Runbook Cleanup

Generated: 2026-06-19

## Task

T20 - Legacy LanceDB runbook cleanup: remove main-push and Bedrock-write shortcuts.

## Objective

Update legacy LanceDB/Vitamin scripts and docs so they no longer instruct agents or operators to
push directly to `main`, treat production testing as autonomous, or run LanceDB/Bedrock mutation
steps without a human gate.

## IN SCOPE

- `scripts/README-VITAMIN-B-FIX.md`
- `scripts/add-vitamin-b-complex-to-lancedb.ts`
- `scripts/add-vitamins-c-d-to-lancedb.ts`
- `scripts/enrich-lancedb-autocomplete.ts`
- `.planning/legacy-lancedb-runbook-cleanup/TASK_SPEC.md`
- `.planning/legacy-lancedb-runbook-cleanup/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- Executing scripts.
- LanceDB mutation.
- Bedrock calls.
- AWS reads/writes.
- Deploy, production testing, `production-content-enricher`, catalog changes, embeddings,
  dependency updates.

## Implementation Plan

1. Replace direct `git push origin main` / production deploy instructions with PR-first,
   human-gated language.
2. Update script "next steps" output to classify LanceDB/Bedrock/deploy actions as gated.
3. Update runbook checklist and notes to reflect `AGENTS.md` section 3.1.

## Validation

```bash
npm run lint
npm run type-check
npm test
```

Expected: every command exits 0.

## Risks

- These scripts still contain live mutation logic. This task only changes guidance text; execution
  remains human-gated.
