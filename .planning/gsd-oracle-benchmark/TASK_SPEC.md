# TASK_SPEC - gsd-oracle-benchmark

Date: 2026-07-01

## Objective

Create a deterministic mini-benchmark for the GSD oracle so agent sessions can evaluate
whether closure evidence is accepted or rejected for explicit reasons.

## Scope

In scope:

- `scripts/gsd/oracle-benchmark.mjs`
- `docs/oracle-benchmark-fixtures.json`
- `.planning/gsd-oracle-benchmark/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Product runtime code.
- Portal/render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.
- Integrating the benchmark into `offline-certify --quick`; that is a separate queued task.

## Harness

```bash
node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json
```

## Substitution Test

If no benchmark exists, agents can only assert that the oracle "seems" correct. The task still
fails because there is no executable pass/fail corpus for expected oracle responses.

## Design

- Load JSON fixtures with named cases.
- Write each case into a temporary isolated directory.
- Evaluate the same audit evidence tokens as `done-oracle.mjs` without invoking production
  actions.
- Compare actual pass/fail and missing-token messages to fixture expectations.
- Exit 0 only when every case matches.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out review for determinism, failure coverage,
fixture clarity, local-only behavior, and no production gate crossing.
