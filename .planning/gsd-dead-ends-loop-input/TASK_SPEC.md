# TASK_SPEC - gsd-dead-ends-loop-input

Date: 2026-07-01

## Objective

Make `DEAD_ENDS.md` a validated loop input so future autonomous sessions cannot ignore or
malform recorded failed approaches.

## Scope

In scope:

- `scripts/gsd/invariant-ratchet.mjs`
- `DEAD_ENDS.md`
- `.planning/gsd-dead-ends-loop-input/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Product runtime code.
- Portal/render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Harness

```bash
npm run gsd:invariants
```

## Substitution Test

If `DEAD_ENDS.md` is not validated by invariants, future sessions can delete or malformedly
append dead-end entries while the loop still reports green.

## Design

- Require `DEAD_ENDS.md` to exist.
- Require each `### Dn` entry to include `Contexto`, `Intento`, `Fallo`, `No Repetir`, and
  `Alternativa`.
- Avoid broader formatting opinions beyond the documented schema.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out for invariant adequacy, documentation
clarity, local-only behavior, and no production gate crossing.
