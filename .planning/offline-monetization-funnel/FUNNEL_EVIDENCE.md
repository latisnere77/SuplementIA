# Offline Monetization Funnel Evidence

Date: 2026-07-01

## Decision

Only the iHerb affiliate matching/link-generation path is certified in this offline task. Stripe
subscription checkout is classified as a live mutation surface and must not be invoked without a
separate checkout-specific GO and harness.

## Certified Offline Surfaces

| Surface | Evidence | Offline Boundary |
| --- | --- | --- |
| iHerb match selection | `findIHerbAffiliateMatch` matches English, Spanish, and scientific supplement names. | Pure function; no network and no purchase. |
| Broad-goal rejection | Tests reject `sleep`, `energy`, and `stress` as affiliate matches. | Prevents monetization from generic health goals. |
| Direct iHerb search URL | `buildIHerbSearchUrl` builds `https://mx.iherb.com/search?kw=...`. | No tracking template required. |
| Affiliate template safety | `buildIHerbAffiliateUrl` accepts only valid `https` templates containing `{url}`. | Unsafe, incomplete, or non-HTTPS templates fall back to direct search URLs. |
| Disclosure/docs | `docs/iherb-affiliate-monetization.md` states affiliate disclosures and forbids invented tracking params. | Documentation only; no affiliate network call. |

## Live/Gated Surfaces

| Surface | Classification | Reason |
| --- | --- | --- |
| `/api/portal/subscription/checkout` | GATED live checkout | Creates Stripe Checkout sessions when `STRIPE_SECRET_KEY` is present. |
| `/api/portal/subscribe` | GATED live checkout | Creates Stripe subscription checkout sessions. |
| `/api/portal/subscription/webhook` | GATED live webhook | Processes Stripe webhook events and forwards audit payload. |
| Affiliate network tracking template provisioning | GATED external account action | Must come from approved affiliate platform tools; do not invent tracking params. |

## Acceptance Boundary

This task confirms:

- Affiliate matching and URL generation are covered by offline tests.
- Broad health goals do not produce affiliate matches.
- Unsafe affiliate templates fall back to direct iHerb URLs.
- Subscription checkout remains excluded from offline execution.

This task does not confirm:

- Live Stripe checkout success.
- Stripe webhook correctness against production or test Stripe.
- Real affiliate attribution, cookie behavior, or commission tracking.
- Live purchase conversion.

## Harness

```bash
npm test -- --runInBand --runTestsByPath lib/portal/iherb-affiliate.test.ts
```
