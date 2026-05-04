# Amazon Mexico Affiliate Monetization

This page documents how SuplementAI shows Amazon Mexico referral links in portal results.

## What The App Does

- Results pages show product recommendation cards when the recommendation includes products.
- If the backend returns no product matches, the page now shows three Amazon Mexico search options for the analyzed ingredient: budget, value, and premium.
- Amazon links are tagged with `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` when the environment variable is configured.
- The UI does not invent product prices. Affiliate cards show "See price on Amazon" / "Ver precio en Amazon".
- The UI shows an affiliate disclosure near the product cards.
- Amazon affiliate links do not trigger the premium paywall; only ANKONERE direct premium products remain paywall-gated.

## Environment Variable

Configure this in the deployment environment:

```bash
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=your-amazon-mx-tracking-id
```

If the variable is missing, links still open Amazon Mexico but will not be monetized.

## Compliance Notes

- Do not display Amazon prices, availability, star ratings, or review counts unless they come from Amazon's approved tools/API and comply with Amazon's current policies.
- Do not cloak or shorten Amazon links in a way that hides that the destination is Amazon.
- Keep the affiliate disclosure visible anywhere Amazon affiliate links appear.
- Keep product recommendations framed as shopping searches for the ingredient. The clinical evidence supports ingredients, not specific Amazon brands.

## Amazon Mexico Account Setup

Start at the official Amazon Mexico Associates portal:

- https://afiliados.amazon.com.mx/

As of the latest official page checked during this change, Amazon Mexico says it is not accepting new applicants at that moment. If registration is available again, use the official "Regístrate" flow and add `https://suplementai.com` as the website.
