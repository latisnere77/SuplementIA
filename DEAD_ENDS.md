# DEAD_ENDS

Fecha de inicio: 2026-07-01

Este archivo registra callejones sin salida de sesiones agénticas. El objetivo es evitar
reintentos ciegos y preservar aprendizaje operativo despues de cada Context Flush.

## Formato

Cada entrada debe incluir:

- `Contexto`: tarea/slug.
- `Intento`: enfoque probado.
- `Fallo`: error, hook, test o razon concreta.
- `No Repetir`: condicion que prohibe reintentar igual.
- `Alternativa`: siguiente camino seguro.

## Entradas Iniciales

### D1 — AWS STS Bloqueado Por Policy Local

- Contexto: Phase 7 `research-audit-aws-report-only`.
- Intento: ejecutar `aws sts get-caller-identity --profile suplementai-admin --output json`.
- Fallo: la sesion rechazo el comando antes de AWS con `approval required by policy, but AskForApproval is set to Never`.
- No Repetir: no intentar AWS writes, Lambda invoke/update, IAM/S3/EventBridge ni scheduling si STS no confirma cuenta `643942183354`.
- Alternativa: ejecutar STS solo en una sesion donde la policy permita AWS CLI local, o detenerse en `waiting_human_go`.

### D2 — Confiar En Numeros Magicos En Prompt Para Limites De Herramienta

- Contexto: autonomia local con hooks.
- Intento: documentar limites de iteracion/tokens/herramientas solo en `TASKS.md`.
- Fallo: los limites documentales dependen de memoria del agente y no son enforcement duro.
- No Repetir: no considerar DONE la gobernanza de limites hasta que exista hook fisico testeado.
- Alternativa: implementar `DebounceHook`/`LimitToolCounts` como script local conectado a `.codex/hooks.json`.

### D3 — Fan-Out Solo Como Texto Es Insuficiente

- Contexto: DONE oracle y `AUDIT_FANOUT.md`.
- Intento: aceptar PASS tokens escritos por el mismo flujo sin evidencia de aislamiento.
- Fallo: `done-oracle.mjs` valida tokens, pero no distingue aun worktree aislado/verificador independiente.
- No Repetir: no elevar autonomia L3 ni cerrar cambios de oraculo critico sin evidencia de revisor independiente.
- Alternativa: extender DONE oracle o el formato de audit fan-out para exigir evidencia de reviewer/verifier no-writer.

### D4 — Cerrar DONE Con Audit/Manifest Incompletos

- Contexto: `gsd-oracle-script-coverage`.
- Intento: pedir fan-out antes de que `AUDIT_FANOUT.md` y `CHANGE_MANIFEST.md` reflejaran
  el scope real.
- Fallo: reviewer/verifier marcaron FAIL porque audit seguia en `PENDING` y el manifest no
  listaba `PROJECT_CONTEXT.md` ni `OBSERVATIONS.md`.
- No Repetir: no ejecutar `gsd:done` ni pedir cierre final hasta que manifest, spec y audit
  incluyan todos los archivos activos de la tarea.
- Alternativa: actualizar primero TASK_SPEC/CHANGE_MANIFEST/AUDIT_FANOUT y luego revalidar
  con fan-out read-only.

### D5 — Esperar Nombre De Bloque Incorrecto En Reglas Solapadas

- Contexto: `gsd-pre-tool-policy-coverage`.
- Intento: exigir que comandos como `gh pr merge --auto` reportaran `auto-merge` y
  `aws bedrock-runtime invoke-model` reportara `bedrock-or-enricher`.
- Fallo: `pre-tool-policy.mjs` evalua reglas en orden; esos comandos caen primero en
  `merge-main` y `aws-write`.
- No Repetir: no usar comandos con multiples matches para probar el nombre exacto de una
  regla especifica.
- Alternativa: probar cada regla con un comando no solapado, y reservar comandos solapados
  para tests de bloqueo generico.

### D6 — Codificar Allow-Path De Produccion En Tests Local-Only

- Contexto: `gsd-pre-tool-policy-coverage`.
- Intento: crear `.deploy-go` en un directorio temporal y afirmar que `npm run deploy`
  puede pasar con `SUPLEMENTAI_PROD_GO=1`.
- Fallo: el reviewer marco el caso como fuera de scope porque esta tarea debe probar
  comandos locales seguros y bloqueos de comandos peligrosos, no codificar permisos de prod.
- No Repetir: no agregar allow-paths de produccion a tareas local-only del oraculo.
- Alternativa: limitar esta cobertura a comandos seguros/read-only permitidos y comandos
  prod-class bloqueados; cualquier allow de prod requiere task spec y GO-gate separado.

### D7 — Usar `cwd` Como Session Key Del DebounceHook

- Contexto: `gsd-debounce-hook`.
- Intento: usar `process.cwd()` como fallback cuando no existia `GSD_TOOL_BUDGET_SESSION`
  ni session id del runtime.
- Fallo: reviewer marco que eso convierte el estado en repo-global, no session-scoped.
- No Repetir: no usar cwd como session key para presupuestos/hard hooks.
- Alternativa: usar `GSD_TOOL_BUDGET_SESSION`, `CODEX_SESSION_ID`, `CODEX_THREAD_ID` o
  `CLAUDE_SESSION_ID`; si ninguna existe, fallar cerrado.
