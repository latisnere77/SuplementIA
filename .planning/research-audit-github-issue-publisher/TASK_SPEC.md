# TASK_SPEC — research-audit-github-issue-publisher

## Objective

Certify Phase 8 by making the research-audit GitHub issue publisher manual/offline safe:
the local renderer must remain dry-run by default, and real GitHub issue creation must
require explicit human-controlled CLI authorization beyond ordinary execution.

## Substitution Test

If this work is not done, the roadmap still has Phase 8 open and the CLI can attempt real
issue creation with a single `--create-github-issue` flag. That is too easy to trigger from
automation and does not prove the publisher cannot open issues automatically.

## In Scope

- `scripts/research-audit/render-weekly-issue.ts`
- `lib/research-audit/github-issue-publisher.test.ts`
- `docs/research-audit-github-issue-publisher.md`
- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/research-audit-github-issue-publisher/TASK_SPEC.md`
- `.planning/research-audit-github-issue-publisher/CHANGE_MANIFEST.md`
- `.planning/research-audit-github-issue-publisher/AUDIT_FANOUT.md`

## Out of Scope

- Creating or updating real GitHub issues.
- Deploy, `.deploy-go`, AWS writes or reads, Lambda invoke/update, Terraform/EventBridge.
- Feature flags, Bedrock, LanceDB mutation, provider calls, PubMed calls, or
  `production-content-enricher`.
- Product/runtime route changes.
- Portal/category/SEO/render changes.

## Planned Change

- Require a second explicit confirmation phrase when `--create-github-issue` is used.
- Keep default CLI behavior local/dry-run only.
- Add focused tests proving:
  - `--create-github-issue` without confirmation fails closed before token/AWS/GitHub calls.
  - default/local mode cannot call GitHub.
  - mocked real issue creation still works only when the explicit confirmation is present.
- Update docs and roadmap state to reflect the certification PR.

## Validation

- `npm test -- lib/research-audit/github-issue-publisher.test.ts`
- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/research-audit-github-issue-publisher/AUDIT_FANOUT.md`

## Risks

- Breaking manual publisher usage. Mitigation: keep the original flag and add only a
  confirmation phrase for the real-issue path.
- Accidentally invoking GitHub or AWS during validation. Mitigation: tests use mocks and
  the CLI is not run with real create flags or credentials.

## Stop Rules

- Stop after three repeated failures of the same validation command.
- Stop if closure requires real GitHub issues, AWS access, deploy, provider calls, PubMed
  calls, Bedrock, LanceDB, or `production-content-enricher`.
- Stop if the required change expands beyond the listed files.

## Audit Fan-Out Plan

Record read-only reviewer/verifier/smoke evidence for:

- Guardrail behavior in CLI and tests.
- No production/AWS/GitHub real issue side effects.
- Roadmap classification after Phase 8 enters review-bound.
