# CHANGE_MANIFEST — research-audit-github-issue-publisher

## Summary

- Added an explicit manual authorization phrase for real research-audit GitHub issue
  creation.
- Kept local/default rendering dry-run and report-only.
- Added focused tests for mocked create/update paths and fail-closed behavior without
  manual authorization.
- Updated the publisher docs and roadmap state so Phase 8 is review-bound.

## Files Changed

- `lib/research-audit/github-issue-publisher.ts`
- `scripts/research-audit/render-weekly-issue.ts`
- `lib/research-audit/github-issue-publisher.test.ts`
- `docs/research-audit-github-issue-publisher.md`
- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/research-audit-github-issue-publisher/TASK_SPEC.md`
- `.planning/research-audit-github-issue-publisher/CHANGE_MANIFEST.md`
- `.planning/research-audit-github-issue-publisher/AUDIT_FANOUT.md`

## Validation

- `npm test -- lib/research-audit/github-issue-publisher.test.ts`
- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `npm run lint`
- `npm run type-check`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/research-audit-github-issue-publisher/AUDIT_FANOUT.md`

## Gates

- No real GitHub issue was created or updated.
- No deploy.
- No AWS writes or reads.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flags.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
