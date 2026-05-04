# iHerb Affiliate Monetization

This page documents how SuplementAI shows iHerb referral links in portal results.

## What The App Does

- Results pages show an iHerb card only when the analyzed ingredient or supplement has a clear catalog match.
- Broad health goals such as sleep, stress, energy, or digestion do not show iHerb links by themselves.
- The UI does not invent product prices, ratings, availability, or specific brand claims.
- The card links to an iHerb Mexico search for the matched ingredient.
- The evidence copy remains ingredient-based. It does not claim that iHerb products or brands are clinically proven.

## Environment Variable

Configure this only after iHerb or the approved affiliate network gives you a tracking URL template. Do not invent tracking query parameters manually.

```bash
NEXT_PUBLIC_IHERB_AFFILIATE_TEMPLATE=https://your-network.example/click?url={url}&query={query}
```

Supported placeholders:

- `{url}`: URL-encoded iHerb Mexico search URL.
- `{query}`: URL-encoded matched search query.

The app only applies the template when it is a valid `https` URL and includes `{url}`. If the variable is missing, incomplete, invalid, or not `https`, links still open iHerb Mexico but are not monetized.

## Official iHerb Affiliate Requirements Checked

The implementation is based on iHerb's official affiliate materials:

- Official program page: `https://www.iherb.com/info/affiliates`
- Official affiliate terms: `https://www.iherb.com/lp/affiliate-terms-and-conditions`

Operational implications:

- iHerb runs the affiliate program through approved third-party platforms listed by iHerb, including Impact, Partnerize, CJ, and Awin.
- Affiliate URLs must come from the affiliate program account or the approved platform's deep-link tools.
- iHerb allows deep links to any product or page on iHerb, so the app can deep-link to a search page when the match is ingredient-level rather than brand/product-level.
- iHerb states commissions are based on qualified purchases after the affiliate link click, subject to last-click attribution and program terms.
- iHerb states affiliate cookies last 7 days unless overwritten by another affiliate or rewards link/code.
- Publishers and commercial/content sites should use the Affiliate Program rather than the consumer Rewards Program.
- Keep the disclosure visible near affiliate recommendations because SuplementAI may earn commissions from qualifying purchases.

## Current Clear Matches

The first implementation includes clear ingredient/supplement matches for common and searched supplements such as magnesium, vitamin B complex, vitamin D, omega-3, creatine, collagen, whey protein, ashwagandha, bacopa monnieri, probiotics, vitamin C, zinc, folate, melatonin, caffeine, berberine, turmeric/curcumin, CoQ10, iron, calcium, vitamin B12, L-theanine, psyllium, aloe vera/sabila, lion's mane, milk thistle, valerian, panax ginseng, ginkgo biloba, resveratrol, tongkat ali, fadogia agrestis, sea moss, shilajit, and black seed oil.
