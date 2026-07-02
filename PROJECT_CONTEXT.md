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

## Jurisdiccion De Autonomia Local

Para este repo, "autonomia" significa autonomia local de desarrollo: los agentes pueden
programar, probar, documentar, commitear, empujar ramas y abrir PRs sin aprobacion humana
intermedia cuando la tarea ya esta definida y tiene arnes local. La autonomia termina en
la barrera de produccion.

Todo pase a produccion requiere GO-gate humano con token air-gapped. El agente no debe
crear, simular ni inferir ese token. Sin ese token, estos gates quedan fuera de la
jurisdiccion autonoma:

- merge a `main`;
- deploy o creacion de `.deploy-go`;
- AWS reads/writes sin identidad confirmada;
- Lambda invoke/update;
- Terraform/EventBridge;
- feature flags;
- Bedrock;
- LanceDB mutation;
- `production-content-enricher`;
- checkout/live purchase;
- issues reales de GitHub.

Los ejecutores de Fase 2 deben detenerse en `review_bound` para merge/review humano y en
`waiting_human_go` para produccion. La infraestructura, no el agente, debe inyectar limites
deterministas de herramientas mediante hooks como `LimitToolCounts` y `DebounceHook`.

## Tipos De Tarea Y Parametros Base

- `REFACTOR`: cambios sobre comportamiento existente sin cambiar contrato de producto.
  Hooks base: max 3 iteraciones, max 2 llamadas identicas, max 25k tokens, max 45 min.
- `BUGFIX`: correccion de fallo observable por test, CI, smoke o auditoria. Iteraciones
  Hooks base: max 3 iteraciones por mismo error, max 2 llamadas identicas, max 35k tokens,
  max 60 min.
- `GREEN-FIELD`: capacidad nueva aislada, con SPEC/PLAN/TASKS antes de implementacion.
  Hooks base: max 5 iteraciones si los fallos son distintos y explicados, max 2 llamadas
  identicas, max 60k tokens, max 120 min.

## Estado Operacional Observado

- Rama local activa: `codex/autonomous-edo-task-loop`.
- PR abierto: #198, `Phase 2 EDO autonomous audit handoff`, ready-for-review, con `Validate`
  en progreso durante esta auditoria.
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
- Criterio de arnes local con comando exacto que devuelve exit 0.
- Tipo de tarea (`REFACTOR`, `BUGFIX` o `GREEN-FIELD`).
- Gobernanza por hooks (`LimitToolCounts` / `DebounceHook`) con topes de iteracion,
  tokens y tiempo.
- Validacion GSD.
- Evidencia independiente en `AUDIT_FANOUT.md`.
- Sin cruce de produccion salvo GO-gate humano con token air-gapped.

## El Oraculo Real

El oraculo real de autonomia local es el conjunto de artefactos ejecutables que decide si
una tarea puede cerrarse sin juicio subjetivo del agente:

- `scripts/gsd/invariant-ratchet.mjs`: verifica archivos/tokens no debilitables y ausencia
  de `.deploy-go`.
- `scripts/gsd/done-oracle.mjs`: exige invariants y evidencia `AUDIT_FANOUT: PASS`,
  `REVIEWER: PASS`, `VERIFIER: PASS`, `SMOKE_TESTER: PASS`, `WRITER_SELF_APPROVAL: NO`.
- `scripts/gsd/pre-tool-policy.mjs`: bloquea comandos de merge/deploy/AWS-write/Terraform/
  Bedrock/LanceDB/destructivos salvo gate explicito.
- `.codex/hooks.json`: conecta policy pre-tool y digest stop hook.
- `docs/done-criteria.md` y `docs/invariants-baseline.md`: contrato humano-legible que el
  codigo debe preservar.
- Tests criticos en `lib/research-audit/**`, `app/api/**`, `lib/portal/**` y Playwright.

La Fase 2 del Oraculo Real debe priorizar:

1. Cobertura en caminos criticos del oraculo.
2. Mini-benchmark determinista para evaluar respuestas/cierres del oraculo.
3. Implementacion fisica de limites de herramientas tipo `DebounceHook` y
   `LimitToolCounts`, sin confiar en memoria del agente.

## Fan-Out Verification

Una tarea local queda DONE solo si pasan dos capas:

1. Arnes local de la tarea con exit 0.
2. Fan-out independiente en worktree aislado o revisor read-only equivalente.

El fan-out debe producir `.planning/<slug>/AUDIT_FANOUT.md` con:

- `AUDIT_FANOUT: PASS`
- `REVIEWER: PASS` para scope, diffs y no-regresion de contrato.
- `VERIFIER: PASS` para arnes ejecutado, evidencia reproducible y no weakened tests.
- `SMOKE_TESTER: PASS` para smoke local aplicable o justificacion de no aplicabilidad.
- `WRITER_SELF_APPROVAL: NO`

El revisor fan-out no puede escribir archivos de producto ni arreglar el cambio que revisa.
Si falla, la tarea vuelve al loop del escritor o queda `BLOCKED`.
