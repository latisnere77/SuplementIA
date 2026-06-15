# SEO Category Audit Observations

Generated: 2026-06-15

## Scope

Audited the 18 category pages that currently return curated content from
`buildCategorySeoContent`:

- sleep
- energy
- heart-health
- cholesterol-triglycerides
- common-deficiencies
- anxiety
- muscle-gain
- cognitive-function
- joint-bone-health
- skin-hair-health
- immunity
- mens-health
- womens-health
- blood-sugar
- inflammation
- sports-performance
- hormonal-health
- migraine-headache

## Related Links

Result: no broken or invalid `relatedLinks` detected.

Method:

- Loaded `getAllCategories()` as the valid category slug source.
- Loaded `getUniqueSupplements()` as the valid supplement slug source.
- Parsed every `relatedLinks[].href` for the 18 curated category pages in both `es` and `en`.
- Checked `/portal/category/<slug>` targets against category slugs and
  `/portal/supplement/<slug>` targets against supplement slugs.

Evidence:

- `badCount 0`
- `categoryCount 19`
- `supplementCount 41`

## Sitemap / Metadata Coverage

Result: covered.

Evidence:

- `app/sitemap.ts` emits `/portal/category/${category.slug}` for every `getAllCategories()` item
  in both SEO locales.
- All 18 audited categories have `es` and `en` sitemap entries.
- Each sitemap category entry includes `es`, `en`, and `x-default` alternates.
- `app/[locale]/portal/category/[slug]/page.tsx` `generateMetadata` defines:
  - `alternates.canonical`
  - `alternates.languages.es`
  - `alternates.languages.en`
  - `alternates.languages.x-default`

No sitemap, canonical, or hreflang fix is required from this audit.

## Structured Data

Result: actionable opportunity.

Current state:

- Category pages render `application/ld+json`.
- The JSON-LD includes:
  - `CollectionPage`
  - `BreadcrumbList`
- When curated FAQs exist, questions are nested under `CollectionPage.hasPart`.

Gap:

- There is no standalone `FAQPage` JSON-LD object for category pages with curated FAQs.
- This is a safe SEO enhancement opportunity if implemented without `@type: Product`.

Recommended fix:

- Add a category-page `FAQPage` JSON-LD object only when `seoContent?.faqs.length` is present.
- Keep existing `CollectionPage` and `BreadcrumbList`.
- Add focused test coverage to ensure FAQPage appears for curated categories and no
  Product structured data is emitted.

