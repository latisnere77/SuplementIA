# Requirements: SuplementAI Stabilization

**Defined:** 2026-03-05
**Core Value:** Users can search for ANY supplement in Spanish and get reliable, science-backed evidence without errors

## v1 Requirements

### Search Backend

- [x] **SRCH-01**: SUPPLEMENT_LEXICON synchronized with SUPPLEMENTS_DATABASE (158 supplements with es/en terms)
- [x] **SRCH-02**: Search for "manzanilla" returns valid evidence results (no 500 error)
- [x] **SRCH-03**: All 158 supplements searchable in Spanish, English, and Latin American variants
- [x] **SRCH-04**: enrich-v2 handles unknown supplements gracefully (friendly 404, not 500)
- [x] **SRCH-05**: recommend/route.ts error handling differentiates "no data" vs "system error" correctly

### Internationalization (i18n)

- [ ] **I18N-01**: Locale stays consistent during search (/es/ does not switch to /en/)
- [ ] **I18N-02**: Nav items localized ("Search" -> "Buscar", "Plans" -> "Planes" in ES)
- [ ] **I18N-03**: Fallback suggestions localized per locale (not hardcoded English)
- [ ] **I18N-04**: Search tips remove "usa terminos en ingles" advice
- [ ] **I18N-05**: All search results render in user's selected locale

### Categories

- [x] **CAT-01**: Health categories expanded and validated against SUPPLEMENTS_DATABASE
- [ ] **CAT-02**: Category pages functional with correct supplement mappings

### Links & Navigation

- [ ] **LINK-01**: All hyperlinks audited and verified functional
- [ ] **LINK-02**: Broken links return proper 404 pages, not blank screens

### SEO & Analytics

- [ ] **SEO-01**: Meta tags, Open Graph, and structured data for supplement pages
- [ ] **SEO-02**: Sitemap.xml generated from SUPPLEMENTS_DATABASE
- [ ] **SEO-03**: Visitor tracking implemented (analytics dashboard)

### PubMed Fallback

- [ ] **PUB-01**: When SupplementsDB lacks data, PubMed API queried as fallback
- [ ] **PUB-02**: PubMed results integrated into evidence display

## v2 Requirements

### Monetization

- **ADS-01**: Amazon Ads integration for supplement product recommendations
- **ADS-02**: Affiliate link tracking and revenue reporting

## Out of Scope

| Feature | Reason |
|---------|--------|
| Amazon Ads | User explicit: deferred to future milestone |
| Mobile app | Web-first strategy |
| Real-time chat | Not core to supplement search |
| OAuth login | Cognito email/password sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRCH-01 | Phase 1 | Complete |
| SRCH-02 | Phase 1 | Complete |
| SRCH-03 | Phase 1 | Complete |
| SRCH-04 | Phase 1 | Complete |
| SRCH-05 | Phase 1 | Complete |
| I18N-01 | Phase 2 | Pending |
| I18N-02 | Phase 2 | Pending |
| I18N-03 | Phase 2 | Pending |
| I18N-04 | Phase 2 | Pending |
| I18N-05 | Phase 2 | Pending |
| CAT-01 | Phase 3 | Complete |
| CAT-02 | Phase 3 | Pending |
| LINK-01 | Phase 3 | Pending |
| LINK-02 | Phase 3 | Pending |
| SEO-01 | Phase 4 | Pending |
| SEO-02 | Phase 4 | Pending |
| SEO-03 | Phase 4 | Pending |
| PUB-01 | Phase 5 | Pending |
| PUB-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-06 after plan 01-01 completion*
