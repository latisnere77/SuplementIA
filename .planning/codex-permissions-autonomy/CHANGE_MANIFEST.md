# CHANGE_MANIFEST — codex permissions autonomy

## Summary

- Added a planning-only Hands layer TASK_SPEC for Codex permissions and autonomy controls.
- Recorded that Heart (#184), Brain (#185), and Nervous system (#186) are open,
  ready for review, and have `Validate` success.
- Deferred actual permission or hook changes to a future reviewed implementation PR.

## Files Changed

- `.planning/codex-permissions-autonomy/TASK_SPEC.md`
- `.planning/codex-permissions-autonomy/CHANGE_MANIFEST.md`
- `.planning/codex-permissions-autonomy/AUDIT_FANOUT.md`

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/codex-permissions-autonomy/AUDIT_FANOUT.md`

## Gates

No product code, merge, deploy, production action, cloud write, Lambda invoke/update,
Terraform/EventBridge, feature flag, Bedrock, LanceDB mutation, or
`production-content-enricher` action was performed.
