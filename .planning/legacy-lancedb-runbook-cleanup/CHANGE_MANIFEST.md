# CHANGE_MANIFEST - Legacy LanceDB Runbook Cleanup

Generated: 2026-06-19

## Summary

Updated legacy LanceDB/Vitamin runbook guidance and script output so they no longer recommend
direct `main` pushes, autonomous deploys, production testing, or LanceDB/Bedrock mutations without
a human gate.

## Files Changed

- `scripts/README-VITAMIN-B-FIX.md`
  - Reclassified LanceDB update, Bedrock embeddings, CloudFront invalidation, deploy, and
    production smoke as human-gated actions.
  - Replaced direct `main` push instructions with feature branch + PR guidance.
  - Updated checklist to require human GO for LanceDB/Bedrock and deploy/smoke/rollback.
- `scripts/add-vitamin-b-complex-to-lancedb.ts`
  - Updated post-run next steps to require human GO and PR workflow.
- `scripts/add-vitamins-c-d-to-lancedb.ts`
  - Updated post-run next steps to require human GO and PR workflow.
- `scripts/enrich-lancedb-autocomplete.ts`
  - Clarified manual LanceDB reload requires human GO and audit details.
- `.planning/legacy-lancedb-runbook-cleanup/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/legacy-lancedb-runbook-cleanup/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T20 done after PR handoff.

## Validation

- `rg -n "git push origin main|Push to deploy|Pushed to production|Test on production|production site" ...` -> exit 1, expected no matches.
- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test` -> exit 0; 114 passed suites, 2 skipped.

## Gates

- No scripts executed.
- No LanceDB mutation.
- No Bedrock call.
- No AWS read/write.
- No merge to `main`.
- No deploy.
- No Lambda invoke/update, Terraform/EventBridge, feature flag, or `production-content-enricher` action.
