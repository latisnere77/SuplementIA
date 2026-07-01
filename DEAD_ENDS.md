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
