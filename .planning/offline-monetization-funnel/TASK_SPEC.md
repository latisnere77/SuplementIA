# TASK_SPEC — offline-monetization-funnel

Date: 2026-07-01

## Objective

Verify the monetization funnel surfaces that can be certified offline without live checkout,
Stripe mutation, production flag changes, or affiliate network calls.

## Scope

In scope:

- `.planning/offline-monetization-funnel/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Runtime code changes.
- Calling `/api/portal/subscription/checkout`.
- Live purchase, Stripe session creation, webhook testing against Stripe, affiliate-network calls,
  production feature flag changes, deploy, `.deploy-go`, AWS reads/writes, Lambda invoke/update,
  Terraform/EventBridge, Bedrock, LanceDB mutation, production-content-enricher, and real GitHub
  issues.

## Existing Oracle

- `lib/portal/iherb-affiliate.test.ts` verifies iHerb alias matching, broad-goal rejection,
  direct Mexico search URLs, safe affiliate template handling, and fallback behavior for unsafe or
  incomplete templates.
- `docs/iherb-affiliate-monetization.md` documents approved affiliate-template behavior and
  disclosure expectations.
- Subscription checkout routes exist but are live Stripe surfaces and are not executed in this
  offline task.

## Harness

```bash
npm test -- --runInBand --runTestsByPath lib/portal/iherb-affiliate.test.ts
```

## Stop Rules

- Stop before any live checkout or Stripe session creation.
- Stop before changing subscription plan prices, Stripe price IDs, or production flags.
- Stop if affiliate verification would require external network credentials or live purchase data.
