# TASK_QUEUE — SuplementAI

Cola de trabajo autónomo. El agente toma la primera tarea `PENDING` (de arriba a abajo),
la ejecuta bajo `AGENTS.md` (SPEC → LOOP → FLUSH), y la deja en un PR ready-for-review
contra `main`. **El agente nunca mergea**: un humano revisa y mergea cada PR (único gate).

Estados: `PENDING` · `IN_PROGRESS` (transitorio, nunca al cerrar sesión) · `DONE (PR #n)` · `BLOCKED (razón)`

Nota de serialización: las tareas que comparten archivo IN SCOPE llevan etiqueta
`[serial-group: <archivo>]` y se ejecutan encadenadas, no en paralelo.

Nota de reconciliación 2026-06-17: las tareas T2-T14 quedaron implementadas por la PR
de integración #169 (`codex/seo-clusters-integration`), mergeada a `main`. Las PRs
individuales #156-#168 fueron cerradas tras esa consolidación y no representan trabajo
pendiente.

---

## T1 — Discovery: enumerar categorías sin contenido SEO curado  ·  DONE (PR #155)

**Tipo:** discovery (amplía esta cola).
**Objetivo:** producir la lista real de categorías del portal que son candidatas a un
cluster SEO curado, leyendo el código (no grep ingenuo).
**IN SCOPE (solo lectura + edición de esta cola):** `app/[locale]/portal/category/[slug]/seo.ts`,
`app/[locale]/portal/category/[slug]/page.tsx`, `e2e/portal.spec.ts`, `TASK_QUEUE.md`.
**OUT OF SCOPE:** cualquier cambio de producto (no toques seo.ts salvo para leer).
**Pasos:**
1. Identifica todas las categorías del portal que (a) renderizan el grid de cards de
   suplementos (`data-testid="category-supplement-results"` en `page.tsx`) y (b) hoy
   devuelven `null` en `buildCategorySeoContent(slug, locale)`.
2. EXCLUYE `gut-health` (es control negativo en `seo.test.ts`) y cualquier slug usado como
   control negativo o sin grid de cards.
3. Por cada categoría candidata, AÑADE a esta cola una tarea `Tn — SEO cluster: <slug>`
   con estado PENDING, siguiendo la plantilla de abajo.
**Aceptación:** `TASK_QUEUE.md` actualizado con N tareas de cluster PENDING; PR ready-for-review;
sin cambios de producto. Marca T1 como DONE (PR #n).

---

## T2 — SEO cluster: anxiety  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `anxiety`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `anxiety` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T3 — SEO cluster: muscle-gain  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `muscle-gain`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `muscle-gain` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T4 — SEO cluster: cognitive-function  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `cognitive-function`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `cognitive-function` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T5 — SEO cluster: joint-bone-health  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `joint-bone-health`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `joint-bone-health` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T6 — SEO cluster: skin-hair-health  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `skin-hair-health`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `skin-hair-health` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T7 — SEO cluster: immunity  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `immunity`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `immunity` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T8 — SEO cluster: mens-health  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `mens-health`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `mens-health` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T9 — SEO cluster: womens-health  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `womens-health`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `womens-health` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T10 — SEO cluster: blood-sugar  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `blood-sugar`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `blood-sugar` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T11 — SEO cluster: inflammation  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `inflammation`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `inflammation` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T12 — SEO cluster: sports-performance  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `sports-performance`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `sports-performance` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T13 — SEO cluster: hormonal-health  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `hormonal-health`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `hormonal-health` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T14 — SEO cluster: migraine-headache  ·  DONE (PR #169)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `migraine-headache`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `migraine-headache` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.

---

## T15 — Discovery: global project queue refresh  ·  DONE (PR #181)

**Tipo:** discovery (amplía esta cola).
**Objetivo:** entender el objetivo actual de SuplementAI desde el código y docs del repo, y
sembrar una nueva cola autónoma con tareas pequeñas, accionables y compatibles con `AGENTS.md`.
**IN SCOPE:** `AGENTS.md`, `TASK_QUEUE.md`, `TASKS.md`, `PROJECT_CONTEXT.md`, `OBSERVATIONS.md`,
`package.json`, `app/[locale]/portal/**`, `app/api/portal/**`, `lib/portal/**`,
`lib/search-service.ts`, `docs/portal-api-logging-classification.md`,
`docs/search-backend-contracts.md`, `e2e/portal.spec.ts`,
`.planning/global-project-queue-refresh/TASK_SPEC.md`,
`.planning/global-project-queue-refresh/CHANGE_MANIFEST.md`.
**OUT OF SCOPE:** cambios de producto para esta tarea, merge a `main`, deploy/AWS writes,
AWS reads, Lambda invoke/update, Terraform/EventBridge, migraciones, feature flags, Bedrock,
LanceDB mutation, `production-content-enricher`, upgrades de dependencias, refactors amplios,
ediciones a cambios locales preexistentes de `OBSERVATIONS.md`.
**Aceptación:**
- `TASK_QUEUE.md` queda actualizado con tareas `PENDING` ordenadas y con IN/OUT SCOPE exacto.
- `.planning/global-project-queue-refresh/TASK_SPEC.md` y `CHANGE_MANIFEST.md` existen.
- `git fetch origin`, `git status --short --branch`, y `rg -n "PENDING|DONE|BLOCKED|IN_PROGRESS" TASK_QUEUE.md`
  devuelven exit 0.
- PR ready-for-review contra `main`, SIN merge.

---

## T16 — Portal log hygiene: remove homepage search debug logs  ·  DONE (PR #181)

**Objetivo:** eliminar logs debug de cliente en la búsqueda principal del portal sin cambiar
la UX, navegación, tracking GA ni guardrails de validación.
**IN SCOPE:** `app/[locale]/portal/PortalPageClient.tsx`.
**OUT OF SCOPE:** `app/[locale]/portal/results/page.tsx`, APIs, SEO/category pages,
autocompletado backend, copy visual, estilos, GA event payloads, auth, Stripe, AWS/Lambda,
Bedrock, LanceDB, `production-content-enricher`, dependencias.
**Aceptación:**
- No quedan `console.log` en `PortalPageClient.tsx`.
- `handleSearch`, submit por Enter, selección de sugerencia y `router.push` conservan el
  comportamiento existente.
- `npm run lint`, `npm run type-check`, `npm test`, y
  `npm run test:e2e -- e2e/portal.spec.ts` devuelven exit 0 porque toca render del portal (§4).
- PR ready-for-review contra `main`, SIN merge.

---

## T17 — Search API log accuracy: stop labeling every backend as Lambda  ·  PENDING

**Objetivo:** corregir el log engañoso de `app/api/portal/search/route.ts` que dice siempre
"via Lambda" aunque `lib/search-service.ts` decide entre local, LanceDB o Lambda.
**IN SCOPE:** `app/api/portal/search/route.ts`, `app/api/portal/search/route.test.ts`.
**OUT OF SCOPE:** cambios al contrato de búsqueda, `lib/search-service.ts`, LanceDB, Bedrock,
Lambda invoke/update, env vars, portal render, e2e, dependencias.
**Aceptación:**
- El log ya no afirma que toda búsqueda va por Lambda.
- Test enfocado cubre la intención sin requerir red, AWS ni Next server real.
- `npm run lint`, `npm run type-check`, y `npm test -- app/api/portal/search/route.test.ts`
  devuelven exit 0.
- PR ready-for-review contra `main`, SIN merge.

---

## T18 — Portal log hygiene: gate results-page debug traces  ·  PENDING

**Objetivo:** reducir ruido de consola en `results/page.tsx` manteniendo errores/warnings útiles
y sin alterar estados de carga, cache, async polling, variantes ni render de recomendaciones.
**IN SCOPE:** `app/[locale]/portal/results/page.tsx`, tests existentes bajo
`app/[locale]/portal/results/__tests__/**` solo si requieren ajustes por logs removidos/gateados.
**OUT OF SCOPE:** `PortalPageClient.tsx`, APIs, cambios visuales, algoritmo de recomendación,
cache storage semantics, async job backend, AWS/Lambda, Bedrock, LanceDB, `production-content-enricher`,
dependencias.
**Aceptación:**
- Logs de trazas (`console.log`) quedan eliminados o gateados por una bandera debug local.
- `console.error`/`console.warn` operacionales no exponen payloads amplios nuevos.
- `npm run lint`, `npm run type-check`, `npm test`, y
  `npm run test:e2e -- e2e/portal.spec.ts` devuelven exit 0 porque toca render del portal (§4).
- PR ready-for-review contra `main`, SIN merge.

---

## T19 — Dev/debug route guard: prevent accidental production exposure  ·  PENDING

**Objetivo:** revisar y proteger rutas/páginas de test o debug del portal para que no queden
expuestas en producción por accidente.
**IN SCOPE:** `app/[locale]/portal/debug-enrich/page.tsx`,
`app/[locale]/portal/stream-test/page.tsx`, `app/api/test-lancedb/route.ts`,
`app/api/test-lambda-direct/route.ts`, `app/api/portal/test-config/route.ts`, tests nuevos o
existentes necesarios para comprobar el guard.
**OUT OF SCOPE:** borrar rutas sin prueba de uso, ejecutar LanceDB/Lambda/AWS, Bedrock,
`production-content-enricher`, deploy, env real, migraciones, auth amplio, dependencias.
**Aceptación:**
- Cada ruta/página debug queda bloqueada o no disponible en producción mediante condición local
  verificable por tests.
- No se ejecuta ningún backend externo durante tests.
- `npm run lint`, `npm run type-check`, `npm test`, y si toca render de portal
  `npm run test:e2e -- e2e/portal.spec.ts` devuelven exit 0.
- PR ready-for-review contra `main`, SIN merge.

---

## T20 — Legacy LanceDB runbook cleanup: remove main-push and Bedrock-write shortcuts  ·  PENDING

**Objetivo:** actualizar docs/scripts de corrección LanceDB/Vitamin B para que no instruyan
`git push origin main`, pruebas directas en producción, o mutaciones LanceDB/Bedrock sin gate
humano.
**IN SCOPE:** `scripts/README-VITAMIN-B-FIX.md`, `scripts/add-vitamin-b-complex-to-lancedb.ts`,
`scripts/add-vitamins-c-d-to-lancedb.ts`, `scripts/enrich-lancedb-autocomplete.ts`.
**OUT OF SCOPE:** ejecutar scripts, LanceDB mutation, Bedrock calls, AWS reads/writes, deploy,
producción, `production-content-enricher`, cambios de catálogo o embeddings, dependencias.
**Aceptación:**
- Los textos de "next steps" y warnings clasifican estas acciones como human-gated bajo
  `AGENTS.md` §3.1.
- Ningún script recomienda `git push origin main` ni testing manual de producción como paso
  autónomo.
- `npm run lint`, `npm run type-check`, y `npm test` devuelven exit 0.
- PR ready-for-review contra `main`, SIN merge.

---

## T21 — Autocomplete backend contract: align debug docs with SEARCH_BACKEND  ·  PENDING

**Objetivo:** cerrar la brecha documentada entre autocompletado y búsqueda: el autocompletado
solo mira `USE_LANCEDB`, mientras búsqueda principal usa `SEARCH_BACKEND`; decidir e implementar
un ajuste mínimo o documentar BLOCKED si requiere diseño de backend.
**IN SCOPE:** `lib/portal/autocomplete-suggestions-fuzzy.ts`,
`app/api/portal/autocomplete/route.ts`, tests existentes o nuevos de autocompletado,
`docs/search-backend-contracts.md`.
**OUT OF SCOPE:** cambios a `lib/lancedb-service.ts`, Bedrock, LanceDB mutation, Lambda,
AWS reads/writes, portal render, producción, `production-content-enricher`, dependencias.
**Aceptación:**
- El comportamiento de autocompletado queda consistente con `SEARCH_BACKEND=local` y
  `USE_LANCEDB=false` para e2e local, o la tarea queda `BLOCKED` con razón técnica concreta.
- No se invoca LanceDB/Bedrock en tests.
- `npm run lint`, `npm run type-check`, `npm test`, y si toca render de portal
  `npm run test:e2e -- e2e/portal.spec.ts` devuelven exit 0.
- PR ready-for-review contra `main`, SIN merge.

---

## Plantilla para tareas "SEO cluster: <slug>" (que T1 generará)

**Objetivo:** añadir un cluster SEO curado en español-first para la categoría `<slug>`,
replicando EXACTAMENTE el patrón ya validado de `energy` (#153) y `common-deficiencies` (#147).
**IN SCOPE:** `app/[locale]/portal/category/[slug]/seo.ts` (copy + content ES/EN),
`app/[locale]/portal/category/[slug]/seo.test.ts` (test enfocado).
**OUT OF SCOPE:** `page.tsx` (ya tiene el `data-testid`), enricher/AWS/Lambda/Terraform,
checkout/Stripe, auth, referrals, `package.json`, CI/CD, `.DS_Store`, `.claude/`, y cualquier
otro slug/categoría.
**Requisitos de contenido (mismo molde que energy):**
- `buildCategorySeoCopy` y `buildCategorySeoContent` para `<slug>` en `es` y `en`.
- 3 `priorityTopics` con `supplementSlug` reales del catálogo.
- `relatedLinks`, `highlights`, y 3–4 `faqs` por locale.
- Copy comparativa/educativa, SIN claims clínicos (cura/trata/garantiza/clinically proven);
  remite a labs / profesional cuando aplique.
**Aceptación (criterio de éxito estricto):**
- Test enfocado nuevo en `seo.test.ts` que serializa el contenido y exige
  `not.toMatch(unsafePattern)` y `not.toContain('"@type":"Product"')`.
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde (chromium + mobile-chrome) — render de portal (§4).
- El control negativo `gut-health` sigue devolviendo null.
- Un PR por cluster, ready-for-review, base `main`, SIN merge.
