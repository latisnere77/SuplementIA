# TASK_QUEUE — SuplementAI

Cola de trabajo autónomo. El agente toma la primera tarea `PENDING` (de arriba a abajo),
la ejecuta bajo `AGENTS.md` (SPEC → LOOP → FLUSH), y la deja en un PR ready-for-review
contra `main`. **El agente nunca mergea**: un humano revisa y mergea cada PR (único gate).

Estados: `PENDING` · `IN_PROGRESS` (transitorio, nunca al cerrar sesión) · `DONE (PR #n)` · `BLOCKED (razón)`

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

## T2 — SEO cluster: anxiety  ·  PENDING

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

## T3 — SEO cluster: muscle-gain  ·  PENDING

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

## T4 — SEO cluster: cognitive-function  ·  PENDING

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

## T5 — SEO cluster: joint-bone-health  ·  PENDING

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

## T6 — SEO cluster: skin-hair-health  ·  PENDING

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

## T7 — SEO cluster: immunity  ·  PENDING

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

## T8 — SEO cluster: mens-health  ·  PENDING

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

## T9 — SEO cluster: womens-health  ·  PENDING

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

## T10 — SEO cluster: blood-sugar  ·  PENDING

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

## T11 — SEO cluster: inflammation  ·  PENDING

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

## T12 — SEO cluster: sports-performance  ·  PENDING

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

## T13 — SEO cluster: hormonal-health  ·  PENDING

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

## T14 — SEO cluster: migraine-headache  ·  PENDING

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
