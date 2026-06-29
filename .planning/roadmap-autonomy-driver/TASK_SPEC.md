# TASK_SPEC — roadmap autonomy driver

## Work Order

Generate the real SuplementAI ROADMAP and a local autonomy driver so future SDLC loops can classify roadmap phases, select the next open phase, and run closure-oriented orchestration without relying on missing artifacts.

## Mode

Governance/tooling and documentation only. No product runtime edits, no deploy, no merge, no cloud writes, no Lambda invoke/update, no Terraform/EventBridge, no feature flags, no Bedrock, no LanceDB mutation, and no `production-content-enricher` edits.

## In Scope

- `ROADMAP.md`
- `scripts/autonomy-loop.sh`
- `scripts/gsd-autonomous`
- `scripts/gsd-autonomous.mjs`
- `.planning/roadmap-autonomy-driver/TASK_SPEC.md`
- `.planning/roadmap-autonomy-driver/CHANGE_MANIFEST.md`
- `.planning/roadmap-autonomy-driver/AUDIT_FANOUT.md`

## Out Of Scope

- Product code under `app/**`, `components/**`, `lib/**`, `services/**`, and `infrastructure/**`.
- Any AWS write, production smoke, deployment, merge, or runtime provider call.
- Changing `TASK_QUEUE.md`; this roadmap is a separate canonical queue for phase-level work.
- Fixing existing open PR #184 or merging it.

## Recon Inputs

- Git tree and open PRs.
- Existing docs under `docs/**`.
- Existing scripts under `scripts/**`.
- Existing portal, research-audit, and infrastructure code paths.
- AWS read-only checks:
  - `aws sts get-caller-identity --profile suplementai-admin`
  - `aws amplify get-app --app-id d2yn3faih4ykom --profile suplementai-admin --region us-east-1`
  - `aws amplify list-branches --app-id d2yn3faih4ykom --profile suplementai-admin --region us-east-1`

## Substitution Test

If this task is not done, future prompts that ask for ROADMAP execution fail because no `ROADMAP.md`, `scripts/autonomy-loop.sh`, or `gsd-autonomous --only N` driver exists in the repo.

## Validation

Required local validation:

```bash
node --check scripts/gsd-autonomous.mjs
scripts/gsd-autonomous --recon
scripts/gsd-autonomous --only 1 --dry-run
scripts/autonomy-loop.sh --dry-run --max-phases 3
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
```

Then read-only fan-out must record PASS evidence and:

```bash
npm run gsd:done -- --audit-pass-file .planning/roadmap-autonomy-driver/AUDIT_FANOUT.md
```

## Stop Rules

- Stop if the driver would perform product changes or production/cloud writes by itself.
- Stop if roadmap classification requires unverified production behavior.
- Stop if invariant ratchet fails.
- Stop if the driver cannot parse its own roadmap.

## Human Gates

Human still owns merge to `main`, deploy/production GO, `.deploy-go`, AWS writes, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and `production-content-enricher`.
