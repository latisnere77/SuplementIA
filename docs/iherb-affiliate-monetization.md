# iHerb Affiliate Monetization

This page documents how SuplementAI shows iHerb referral links in portal results.

## What The App Does

- Results pages show an iHerb card only when the analyzed ingredient or supplement has a clear catalog match.
- Broad health goals such as sleep, stress, energy, or digestion do not show iHerb links by themselves.
- The UI does not invent product prices, ratings, availability, or specific brand claims.
- The card links to an iHerb Mexico search for the matched ingredient.
- The evidence copy remains ingredient-based. It does not claim that iHerb products or brands are clinically proven.

## Environment Variable

Configure this only after iHerb or the affiliate network gives you a tracking URL template:

```bash
NEXT_PUBLIC_IHERB_AFFILIATE_TEMPLATE=https://your-network.example/click?url={url}&query={query}
```

Supported placeholders:

- `{url}`: URL-encoded iHerb Mexico search URL.
- `{query}`: URL-encoded matched search query.

If the variable is missing, links still open iHerb Mexico but are not monetized.

## Current Clear Matches

The first implementation includes clear ingredient/supplement matches for common and searched supplements such as magnesium, vitamin B complex, vitamin D, omega-3, creatine, collagen, whey protein, ashwagandha, bacopa monnieri, probiotics, vitamin C, zinc, folate, melatonin, caffeine, berberine, turmeric/curcumin, CoQ10, iron, calcium, vitamin B12, L-theanine, psyllium, aloe vera/sabila, lion's mane, milk thistle, valerian, panax ginseng, ginkgo biloba, resveratrol, tongkat ali, fadogia agrestis, sea moss, shilajit, and black seed oil.
