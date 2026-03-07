# Requirements: SuplementAI

**Defined:** 2026-03-06
**Milestone:** v2.0 PubMed Expansion
**Core Value:** Users can search for ANY supplement in Spanish and get reliable, science-backed evidence without errors

## v2.0 Requirements

### PubMed Fallback

- [x] **PUB-01**: Cuando el usuario busca un suplemento no en SUPPLEMENTS_DATABASE, el sistema lo detecta como "unknown" y enruta a PubMed en vez de retornar error
- [x] **PUB-02**: El término en español se traduce a nombre científico/inglés via Haiku antes de consultar PubMed
- [x] **PUB-03**: Los estudios de PubMed se analizan con Bedrock — el usuario ve análisis de evidencia completo (misma calidad que suplementos curados)
- [x] **PUB-04**: Cuando PubMed tampoco tiene datos, el usuario ve mensaje amigable "no encontramos datos científicos" (no 500)
- [ ] **PUB-05**: Bug fix del catch block en quiz/route.ts ya aplicado — el `return` de debug que causaba 500 fue eliminado (commit previo al milestone)

### Category Slugs

- [ ] **SLUG-01**: knowledge-base.ts incluye entradas para los 6 slugs faltantes: lavender, caffeine, beta-alanine, bacopa-monnieri, fiber-psyllium, echinacea

## Deferred (v3.0+)

### Amazon Ads

- **ADS-01**: Amazon Ads integration for supplement product recommendations
- **ADS-02**: Affiliate link tracking and revenue reporting

### UX Diferenciada

- **UX-01**: Diferenciación visual entre resultados de DB curada vs resultados de PubMed fallback (esperar a tener PubMed funcionando)

### Expansión de DB

- **DB-01**: Agregar suplementos LATAM (tejocote, damiana, etc.) a SUPPLEMENTS_DATABASE manualmente — PubMed fallback elimina urgencia

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first strategy |
| Real-time chat | Not core to supplement search |
| OAuth login | Cognito email/password sufficient |
| Tabla de traducción ES→EN manual | No escala; mismo anti-pattern que el LEXICON pre-v1.0. Haiku traduce dinámicamente. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUB-05 | Phase 5 | Pending |
| PUB-02 | Phase 5 | Complete |
| PUB-01 | Phase 5 | Complete |
| PUB-03 | Phase 5 | Complete |
| PUB-04 | Phase 5 | Complete |
| SLUG-01 | Phase 6 | Pending |

**Coverage:**
- v2.0 requirements: 6 total
- Mapped to phases: 6/6
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 — traceability populated by roadmapper*
