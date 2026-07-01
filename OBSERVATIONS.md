# OBSERVATIONS

Fecha de auditoria: 2026-07-01

Este registro captura deuda tecnica y riesgos observados. No intenta corregirlos.

## O1 — Phase 7 Bloqueada Por STS Local

- Severidad: Alta.
- Evidencia: `ROADMAP.md` mantiene Phase 7 `research-audit-aws-report-only` en
  `ESPERA_GATE`; `.planning/phase7-aws-report-only-spec/VERIFY.md` registra que
  `aws sts get-caller-identity --profile suplementai-admin --output json` fue bloqueado
  por politica local antes de ejecutar AWS.
- Riesgo: no se puede confirmar cuenta `643942183354`, por lo tanto no es seguro hacer
  AWS writes, Lambda invoke/update, IAM/S3/EventBridge ni smoke manual cloud.
- Proxima accion segura: resolver permiso local de AWS CLI o ejecutar STS fuera de Codex y
  versionar evidencia antes de cualquier write.

## O2 — Rutas Debug/Test Expuestas En App Router

- Severidad: Alta.
- Evidencia: existen `app/api/test-env/**`, `app/api/test-lancedb/**`,
  `app/api/test-lambda-direct/**`, `app/api/portal/test-config/**`,
  `app/[locale]/portal/debug-enrich/**` y `app/[locale]/portal/stream-test/**`.
- Riesgo: endpoints de diagnostico pueden ser alcanzables en produccion si no estan
  protegidos por runtime guards fuertes.
- Proxima accion segura: inventario read-only, confirmar reachability local/public y
  preparar cleanup minimo con Playwright si toca portal.

## O3 — Archivos Duplicados Con Sufijo ` 2`

- Severidad: Media.
- Evidencia: `app/api/supplements/route 2.ts`, `app/api/test-env/route 2.ts`,
  `app/api/supplements/__tests__ 2`, `components/portal/VariantSelectorModal 2.tsx`,
  `lib/cache/simple-cache 2.ts`, `lib/portal/variant-detector 2.ts`.
- Riesgo: confusion de ownership, falsos positivos en busquedas, drift semantico y
  potencial inclusion accidental en tooling.
- Proxima accion segura: comparar contra originales, confirmar si el framework los ignora
  y borrar/quarantinar solo con prueba local.

## O4 — Scripts De Mutacion LanceDB/Bedrock Fuera Del Camino Seguro

- Severidad: Alta.
- Evidencia: `scripts/add-vitamin-b-complex-to-lancedb.ts`,
  `scripts/add-vitamins-c-d-to-lancedb.ts` y `scripts/enrich-lancedb-autocomplete.ts`
  describen mutaciones LanceDB y/o Bedrock.
- Riesgo: pueden ejecutar writes o llamadas proveedor fuera de GSD si se corren manualmente.
- Proxima accion segura: etiquetar como gated/manual en docs o mover a runbook con guardas
  explicitas; no ejecutarlos sin GO.

## O5 — Infraestructura Historica Amplia Y No Unificada

- Severidad: Media.
- Evidencia: `infrastructure/**` contiene CloudFormation, scripts de deploy, rollback,
  monitoreo, migraciones, zips Lambda y runbooks varios. `tsconfig.json` excluye
  `infrastructure` y `scripts` del type-check principal.
- Riesgo: la autonomia puede confundir scripts historicos con caminos oficiales de deploy.
- Proxima accion segura: crear inventario de scripts infra permitidos/prohibidos y mapear
  cada uno a gate humano, rollback y arnes.

## O6 — Coverage Threshold Es Deliberadamente Bajo

- Severidad: Media.
- Evidencia: `jest.config.js` define coverage global en `1` para statements, branches,
  functions y lines.
- Riesgo: el threshold cumple el piso Oracle-first inicial, pero no protege regresiones
  de cobertura de forma significativa.
- Proxima accion segura: ratchet incremental por area despues de estabilizar tareas
  pendientes, sin bloquear fixes urgentes.

## O7 — Analytics Persistente Sigue Gated

- Severidad: Media.
- Evidencia: `ROADMAP.md` Phase 10 indica que analytics actual registra summaries, pero
  falta persistencia durable y privacy-safe.
- Riesgo: research-audit necesita inputs agregados/redactados; sin persistencia puede
  depender de exportaciones manuales.
- Proxima accion segura: disenar storage agregado sin PII y con tests de redaccion antes
  de cualquier write.

## O8 — Monetizacion Requiere Verificacion Offline Separada

- Severidad: Media.
- Evidencia: `ROADMAP.md` Phase 11 mantiene iHerb/subscription/Stripe en `ESPERA_GATE`.
- Riesgo: checkout y afiliados son flujos de negocio sensibles; pruebas live pueden mutar
  datos o crear compras.
- Proxima accion segura: verificar docs y tests offline primero; no hacer compra live sin
  GO explicito.

## O9 — CI Usa `npm audit` Como Gate

- Severidad: Baja.
- Evidencia: `.github/workflows/quality-gates.yml` ejecuta `npm audit` despues de Jest.
- Riesgo: cambios no relacionados pueden quedar bloqueados por advisories transitorios.
- Proxima accion segura: mantenerlo como gate, pero registrar evidencia exacta si falla y
  no mezclar fixes de dependencias con tareas de producto.

## O10 — Runtime Remoto Y Provider Paths Requieren Identidad Confirmada

- Severidad: Alta.
- Evidencia: `AGENTS.md` y `docs/invariants-baseline.md` exigen cuenta AWS confirmada
  para AWS read-only y GO especifico para writes; `production-content-enricher`,
  Bedrock y LanceDB estan protegidos.
- Riesgo: autonomia total sin identidad y rollback abre posibilidad de cambios irreversibles.
- Proxima accion segura: toda tarea remota debe empezar con STS, TASK_SPEC, rollback,
  presupuesto de costo, limites de PII y audit fan-out.

## O11 — Fixtures Eval Emiten Warnings De Source Map En Coverage

- Severidad: Baja.
- Evidencia: `npm test -- --runInBand --coverage` pasa, pero SWC advierte que faltan
  `eval/fixtures/enricher-live-dist/prompts.js.map` y
  `eval/fixtures/enricher-live-dist/toolSchema.js.map`.
- Riesgo: ruido en runs de coverage y posible confusion al leer reportes de cobertura.
- Proxima accion segura: tratarlo en tarea separada; no mezclar fixture/source-map cleanup
  con ratchets de coverage o producto.
