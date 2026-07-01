# PROJECT_CONTEXT

Fecha de auditoria: 2026-07-01

## Resumen

SuplementAI es un portal Next.js App Router con TypeScript para busqueda y recomendacion
evidence-aware de suplementos. El producto es Spanish-first, tiene gating clinico,
contenido SEO, flujos de portal en `app/[locale]/portal/**`, APIs bajo `app/api/**`,
herramientas offline de research-audit en `lib/research-audit/**` y scripts de soporte en
`scripts/**`.

Este documento organiza contexto para ejecucion autonoma sin debilitar la gobernanza
existente. Las fuentes canonicas no se reemplazan:

- Contrato de agente: `AGENTS.md`
- Estado operacional: `STATE.md`
- Roadmap: `ROADMAP.md`
- Cola historica: `TASK_QUEUE.md`
- Oraculo DONE: `docs/done-criteria.md`
- Baseline de invariants: `docs/invariants-baseline.md`
- Metodo Oracle-first: `docs/oracle-first-gsd-v2.md`
- Plantilla SDD: `docs/sdd-task-template.md`

## Arquitectura Del Repo

- `app/[locale]/portal/**`: UI publica del portal, resultados, categorias, SEO y flujos
  visibles al usuario.
- `app/api/**`: rutas API del App Router para portal, busqueda, enrichment, analytics,
  suscripcion, monitoring, auth y endpoints de diagnostico.
- `lib/portal/**`: catalogo local, presentacion de evidencia, logging, affiliate, jobs,
  normalizacion y servicios de portal.
- `lib/services/**`: busqueda, PubMed, validadores, DynamoDB/cache, vector search,
  botanical identity y servicios remotos.
- `lib/research-audit/**`: auditoria report-only, redaccion, packets, provider runner,
  AWS report runner, Lambda handler, GitHub issue publisher manual/offline y tests.
- `scripts/gsd/**`: invariants, offline certification, done oracle, digest y policy hooks.
- `scripts/research-audit/**`: runners locales/manuales de research-audit.
- `e2e/**`: Playwright para portal y matriz de busquedas reales.
- `infrastructure/**`: plantillas, scripts y runbooks AWS/LanceDB/DB historicos; no estan
  dentro del type-check principal por `tsconfig.json`.
- `.github/workflows/quality-gates.yml`: CI canonica para PRs, `main` y `codex/**`.

## Gobernanza Vigente

- El agente no mergea `main` sin GO humano explicito.
- El agente no crea `.deploy-go`.
- Deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags,
  Bedrock, LanceDB mutation y `production-content-enricher` requieren GO humano y
  TASK_SPEC exacto.
- AWS read-only requiere cuenta confirmada `643942183354` con `--profile suplementai-admin`.
- Cambios de portal/categoria/SEO/render requieren Playwright local ademas de Jest.
- DONE requiere `npm run gsd:invariants`, validacion offline aplicable, fan-out read-only y
  `npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md`.

## Estado Operacional Observado

- `main` local estaba limpio contra `origin/main` durante la auditoria.
- No habia PRs abiertos en la ultima reconstruccion local.
- `ROADMAP.md` reporta `HECHO=7`, `ESPERA_GATE=4`, `ABIERTA_REAL=0`.
- Phase 7 `research-audit-aws-report-only` sigue `ESPERA_GATE` porque STS no pudo
  ejecutarse desde la sesion local anterior.
- `TASK_QUEUE.md` no tiene tareas `PENDING`; el avance actual lo controla `ROADMAP.md`.

## CI Canonica

Workflow: `.github/workflows/quality-gates.yml`

Se ejecuta en:

- `pull_request`
- push a `main`
- push a `codex/**`

Job `Validate`:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run gsd:invariants`
4. `npm run lint`
5. `npm run type-check`
6. `npm run build`
7. `npm test -- --runInBand`
8. `npm audit`
9. `npm run test:e2e`
10. `RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1`

## Verificacion Basada En Ejecucion

Comandos exactos para validar entorno local:

```bash
npm ci
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
npm run lint
npm run type-check
npm run build
npm test -- --runInBand
npm run validate
git diff --check
```

Comandos exactos para Playwright:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1
```

Comandos exactos para portal/render/SEO/categoria cuando aplique:

```bash
npm test -- --runInBand --runTestsByPath app/[locale]/portal/category/[slug]/seo.test.ts
npm run test:e2e -- e2e/portal.spec.ts --workers=1
```

Comandos exactos para estado GSD:

```bash
node scripts/gsd-autonomous.mjs --recon
npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md
```

Comandos exactos para smoke publico/read-only, solo cuando el scope lo autorice:

```bash
npm run smoke:production:portal
PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal
PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal
```

Comando exacto para confirmar identidad AWS antes de cualquier Phase 7 cloud work:

```bash
aws sts get-caller-identity --profile suplementai-admin --output json
```

Debe devolver `Account` igual a `643942183354`. Si no ejecuta o no coincide, no hacer
cambios AWS ni preparar writes.

## Presupuesto De Archivos Por Riesgo

- Bajo: max 200 archivos por tarea. Uso esperado: auditorias read-only, docs, inventarios,
  reportes y cambios de plan.
- Medio: max 50 archivos por tarea. Uso esperado: tests, refuerzos de oraculo, limpieza
  documentada, wiring local sin cloud writes.
- Alto: max 20 archivos por tarea con lote piloto de 10 archivos. Uso esperado: portal
  render/API behavior, infra, AWS, Lambda, IAM/S3, checkout, monetizacion, privacidad,
  analytics persistente o cualquier cambio con efecto productivo.

## Regla Para Fase 2

La Fase 2 puede programar y probar localmente de forma autonoma solo si cada tarea tiene:

- TASK_SPEC con archivos IN/OUT de scope.
- Criterio de arnes con comando exacto que devuelve exit 0.
- Validacion GSD.
- Evidencia independiente en `AUDIT_FANOUT.md`.
- Sin cruce de gates humanos salvo GO explicito para ese gate exacto.
