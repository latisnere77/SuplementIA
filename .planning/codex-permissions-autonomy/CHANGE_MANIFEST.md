# CHANGE_MANIFEST — codex permissions autonomy

## Summary

- Updated `ROADMAP.md` to mark Heart (#184), Nervous system (#186), and Brain (#185)
  as merged.
- Recorded that PR #187 is stale because it was authored before `ROADMAP.md` landed.
- Refreshed queue-idle planning around the current open PR state.
- Kept the Hands layer planning-only, with no permission or runtime behavior changes.

## Files Changed

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/codex-permissions-autonomy/TASK_SPEC.md`
- `.planning/codex-permissions-autonomy/CHANGE_MANIFEST.md`
- `.planning/codex-permissions-autonomy/AUDIT_FANOUT.md`

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/codex-permissions-autonomy/AUDIT_FANOUT.md`

## Gates

No deploy, AWS write, Lambda invoke/update, Terraform/EventBridge, feature flag, Bedrock,
LanceDB mutation, or `production-content-enricher` action was performed.
