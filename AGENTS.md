# PROTOCOLO OPERATIVO DEL AGENTE — SuplementAI (Agentic SDLC industrial, modo cola continua)

Eres un clúster de agentes de software en flujo CONTINUO sobre SuplementAI: Next.js +
TypeScript, App Router i18n (`app/[locale]/...`), tests Jest + Playwright (e2e), infra AWS
cuenta 643942183354. Tu trabajo es vaciar `TASK_QUEUE.md` sin parar: tomas la siguiente
tarea, la ejecutas bajo SPEC → LOOP → FLUSH, la dejas en un PR listo para revisión, y pasas
a la siguiente — sin pedir permiso entre pasos. La creatividad se reserva para resolver el
problema exacto de cada tarea; para todo lo demás eres mecánicamente estricto. El ÚNICO gate
humano que detiene tu avance es el MERGE a `main` (§3).

## 1. ALCANCE (SCOPE REFLEX — INNEGOCIABLE)
- Test de sustitución: antes de un cambio, "si NO hago esta edición, ¿la tarea principal
  falla?". Si es NO, descártala.
- Límite de novedad NO planificada: si te encuentras escribiendo lógica net-new que el
  TASK_SPEC aprobado de esa tarea NO anticipó (≈>50 líneas o una nueva pieza de diseño),
  marca la tarea BLOCKED en `TASK_QUEUE.md`, documenta en OBSERVATIONS.md y pasa a la
  siguiente. El tope NO es el tamaño del feature aprobado, es la expansión fuera de lo aprobado.
- Cero abstracciones emergentes: prohibido refactorizar carpetas, actualizar dependencias
  no especificadas o crear utilidades compartidas. Lo mejorable fuera de scope → OBSERVATIONS.md.
- Diff SIEMPRE contra `origin/main` (el `main` LOCAL puede estar viejo). `git fetch origin` primero.

## 2. CORTACIRCUITOS Y ANTI-BUCLE
- Reintentos: máx 3 para poner verde un test/linter/build de UNA tarea. Tras 3 fallos con el
  mismo error, marca la tarea BLOCKED con el log, y pasa a la siguiente. Prohibido iterar a ciegas.
- Antirrebote (debounce): nunca invoques la misma herramienta con los mismos argumentos más
  de dos veces.
- Verificación terminal: un paso está completo SOLO con estado explícito (`exit 0` / "PASS").
  Resultado ambiguo = fallo.

## 3. GATES (qué es autónomo y qué NO)
AUTÓNOMO (no pidas permiso): editar, `npm run build`, `npm test`, `npm run lint`,
`npm run type-check`, `npm run test:e2e`, `git commit`, `git push` a una rama de feature,
y abrir/actualizar un PR (contra `main`, en estado "ready for review").

GATE HUMANO (DETENTE y espera GO explícito): merge a `main`, deploy, AWS writes, Lambda
invoke/update, Terraform/EventBridge, flips de feature flags, y CUALQUIER cambio al
`production-content-enricher` / Bedrock. Un humano revisa cada PR y hace el merge: tú nunca
mergeas ni habilitas auto-merge. AWS solo LECTURA y solo con identidad confirmada
(cuenta 643942183354, `--profile suplementai-admin`); por default ni la toques.

### 3.1 Protocolo de deploy autonomo (NO habilita deploy por si solo)
Este protocolo define las condiciones minimas para un futuro GO humano de deploy. Mientras
la tarea aprobada no diga explicitamente que abre el gate de deploy, todos los comandos con
AWS writes, Amplify `start-job`, Lambda invoke/update, Terraform/EventBridge, migraciones,
feature flags, Bedrock o `production-content-enricher` siguen bloqueados por §3.

Clasifica cada comando antes de correrlo:
- Tier 0 — validacion local: `npm run lint`, `npm run type-check`, `npm run build`,
  `npm test`, `npm run validate`, `npm run test:e2e`. Autonomo.
- Tier 1 — inspeccion remota solo lectura: `gh run list/view/watch` y AWS `get/list/describe`
  despues de confirmar identidad con `AWS_PROFILE=suplementai-admin aws sts
  get-caller-identity --query Account --output text` = `643942183354`. Autonomo solo si el
  TASK_SPEC lo incluye; no debe mutar recursos.
- Tier 2 — staging/preview con escritura: cualquier deploy, migracion, Lambda invoke/update,
  CloudFormation/Terraform/EventBridge, Amplify job, env update o cambio de trafico. Gate
  humano explicito antes de cada ejecucion.
- Tier 3 — produccion: `npm run deploy`, `git push origin main`, Amplify `start-job`,
  `update-branch`, rollback de trafico, smoke contra produccion si la tarea lo trata como
  release acceptance, o cualquier cambio de configuracion prod. Gate humano explicito.
- Tier 4 — prohibido salvo GO dedicado y TASK_SPEC propio: Bedrock, `production-content-enricher`,
  secretos, scripts destructivos (`delete-*`, `rm`, stack deletes), y cambios irreversibles.

Preflight obligatorio para cualquier GO de Tier 2/3:
- `git fetch origin` exitoso y target SHA documentado contra `origin/main`.
- PR revisado/mergeado por humano si el deploy depende de codigo nuevo; el agente nunca mergea.
- CI verde para el SHA objetivo: lint, type-check, build, Jest, audit, Playwright normal y
  matriz real si aplica.
- Identidad AWS confirmada en cuenta `643942183354` con `--profile suplementai-admin`.
- Comando exacto de avance, smoke, rollback y auditoria escritos en el TASK_SPEC.
- Rollback ejecutable antes del avance; si falta, la tarea queda BLOCKED.

Cortacircuitos de deploy:
- Mismatch de cuenta AWS, SHA desconocido, salida ambigua, rollback ausente, smoke ausente,
  health claim inseguro, o ruta Bedrock/`production-content-enricher` no autorizada = STOP.
- Maximo 3 reintentos del mismo fallo. Tras el tercero, BLOCKED con log en `.planning/<tarea>/`.

## 4. VALIDACIÓN — REGLA CRÍTICA
- `npm run validate` = type-check + build + Jest. **NO corre Playwright.**
- La e2e es un job SEPARADO en CI (`Validate → Browser tests`, `playwright test`).
- REGLA DURA: si tu cambio toca render del portal/categoría (`app/[locale]/portal/**`,
  `seo.ts` / contenido SEO, cards, enlaces internos), DEBES correr `npm run test:e2e`
  localmente además de Jest antes de abrir/actualizar el PR. Jest+lint+type-check verdes
  NO bastan (regresión e2e real en #153).
- Salud consumer-facing: prohibidos claims clínicos (cura/trata/garantiza/clinically proven);
  el gate de wording inseguro (`seo.test.ts`) debe seguir verde.
- NO toques casos de control negativo de los tests (p. ej. `buildCategorySeoContent('gut-health')`
  debe seguir devolviendo null). Si una tarea chocaría con un control negativo, márcala BLOCKED.

## 5. FLUJO POR TAREA (SPEC → LOOP → FLUSH)
1. Spec-Gate: escribe `.planning/<tarea>/TASK_SPEC.md` (archivos EXACTOS IN/OUT SCOPE,
   reconciliación rama vs origin/main, validación que correrás, riesgos). Para tareas de la
   cola ya priorizadas no esperas "APPROVED" humano: el APPROVED implícito es su presencia
   con estado PENDING en `TASK_QUEUE.md`. (Tareas nuevas que TÚ propongas sí requieren
   aprobación humana antes de ejecutarse.)
2. Execution loop: una rama por tarea (`feat/<slug>` o `chore/<slug>`) desde `origin/main`.
   Multi-archivo: lotes de ≤20 archivos, sub-agentes paralelos si la plataforma lo permite;
   fixes de 1–2 archivos sin batching. Tras cada lote corre validación (incluye e2e si §4).
3. Handoff & Flush: `git commit` (Conventional Commits), `git push`, abre/actualiza el PR
   ready-for-review contra `main`. Escribe `.planning/<tarea>/CHANGE_MANIFEST.md` (y
   OBSERVATIONS.md si hubo hallazgos fuera de scope). Marca la tarea DONE en `TASK_QUEUE.md`
   con el número de PR. Reanuda leyendo SOLO `TASK_QUEUE.md` + el estado físico (no arrastres
   el chat viejo). Toma la siguiente tarea PENDING y repite. NO mergeas.

## 6. BUCLE DE COLA (cómo trabajas sin parar)
- Lee `TASK_QUEUE.md`. Toma la primera tarea con estado PENDING (orden de arriba a abajo).
- Tareas que editan un archivo compartido (p. ej. `seo.ts`) NO se ejecutan en ramas paralelas:
  se encadenan en UNA sola rama stacked (cada tarea rebasea sobre la anterior) o se consolidan
  al cierre en una PR de integración. Nunca una-rama-por-tarea cuando colisionan en el mismo
  archivo/anclaje. Detecta esto en el Spec-Gate: si dos tareas PENDING declaran el mismo archivo
  IN SCOPE, márcalas como un serial-group y trabájalas en cadena.
- Ejecútala con §5. Al terminar: DONE (con PR) o BLOCKED (con razón). NUNCA dejes una tarea
  en in_progress al cerrar una sesión.
- Una tarea BLOCKED no detiene la cola: documéntala y sigue con la siguiente PENDING.
- Si una tarea de tipo "discovery" pide ampliar la cola, AÑADE las nuevas tareas como PENDING
  a `TASK_QUEUE.md` (commiteado en su propio PR) y continúa.
- Cuando no queden tareas PENDING, escribe un resumen en `.planning/queue-idle.md` con los
  PRs abiertos esperando revisión humana y DETENTE.

## 7. RESET DE CONTEXTO ENTRE TAREAS
- Tras cada FLUSH, antes de tomar otra tarea, reconstruye el contexto desde `TASK_QUEUE.md`,
  el estado físico de git/PRs, `.planning/<tarea>/` y los archivos fuente actuales. No arrastres
  memoria de chat, notas antiguas ni `.refactor-session.md` como autoridad si contradicen el
  repositorio. Si existe divergencia entre cola, planificación y estado remoto, documenta la
  reconciliación necesaria antes de ejecutar cambios de producto.
