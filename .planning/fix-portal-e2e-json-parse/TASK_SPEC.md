# TASK_SPEC: Fix Portal E2E JSON Parse Failure

Estado: EN CURSO
Fecha: 2026-06-18

## Objetivo

Restaurar la suite local de Playwright corrigiendo la causa compartida que hace que rutas `/[locale]/portal/**` devuelvan `Internal Server Error` y provoquen 41 fallos e2e.

## Reconciliacion

- `git fetch origin`: exit 0.
- `origin/main`: `283316e41091bf4fac153458570f3dfacd6f99ae`.
- `HEAD`: `00a4795f66e44b38956f0f1d0f7d15920c4f41f0` en `chore/autonomous-deploy-gate-protocol`.
- Worktree previo: `OBSERVATIONS.md` modificado antes de esta tarea; se preserva fuera de scope.

## In Scope

- `TASKS.md`
- `.planning/fix-portal-e2e-json-parse/TASK_SPEC.md`
- `.planning/fix-portal-e2e-json-parse/CHANGE_MANIFEST.md`
- `.planning/fix-portal-e2e-json-parse/OBSERVATIONS.md` solo si hay hallazgos fuera de scope
- `app/[locale]/portal/**`
- `components/portal/**`
- `lib/portal/**`
- `e2e/portal.spec.ts`
- `e2e/portal-real-search.spec.ts`
- `playwright.config.ts`
- `app/api/portal/**` solo si la reproduccion demuestra que el fallo e2e nace en una API local de portal

## Out Of Scope

- Merge a `main`, deploys, AWS writes, Terraform/EventBridge, Lambda invoke/update, feature flags.
- Bedrock y cualquier cambio en `production-content-enricher`.
- Refactors amplios, utilidades compartidas nuevas, actualizaciones de dependencias.
- Cambios de claims clinicos o relajacion de gates de wording.
- Modificar `OBSERVATIONS.md` raiz salvo que sea estrictamente necesario para documentar esta tarea.

## Hipotesis Inicial

Los reportes de Playwright muestran `Internal Server Error` al abrir `/en/portal` antes de renderizar el boton `SuplementAI`. El patron apunta a una excepcion de render/server compartida en portal, no a 41 regresiones independientes. La mencion previa de `JSON.parse` se debe validar contra logs actuales antes de editar.

## Validacion

1. Reproducir: `npm run test:e2e` debe fallar inicialmente o confirmar el fallo actual.
2. Validacion final obligatoria:
   - `npm run validate` -> exit 0
   - `npm run test:e2e` -> exit 0

## Riesgos

- La suite e2e es consumer-facing y toca render de portal, por lo que Playwright local es obligatorio.
- Si el arreglo exige AWS writes, deploy, Bedrock o `production-content-enricher`, la tarea queda BLOCKED.
- Maximo 3 reintentos con el mismo error antes de BLOCKED con log.
