# TASK_QUEUE — SuplementAI

Cola de trabajo autónomo. El agente toma la primera tarea `PENDING` (de arriba a abajo),
la ejecuta bajo `AGENTS.md` (SPEC → LOOP → FLUSH), y la deja en un PR ready-for-review
contra `main`. **El agente nunca mergea**: un humano revisa y mergea cada PR (único gate).

Estados: `PENDING` · `IN_PROGRESS` (transitorio, nunca al cerrar sesión) · `DONE (PR #n)` · `BLOCKED (razón)`

Nota de serialización: las tareas que comparten archivo IN SCOPE llevan etiqueta
`[serial-group: <archivo>]` y se ejecutan encadenadas, no en paralelo.

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

## T-AUDIT — Auditar 18 categorías con contenido SEO curado  ·  DONE

**Tipo:** discovery/audit.
**Objetivo:** auditar las 18 páginas de categoría con contenido en `buildCategorySeoContent`
para detectar enlaces internos inválidos, cobertura sitemap/metadata y oportunidades de
structured data.
**Resultado:** observaciones documentadas en `.planning/seo-audit/OBSERVATIONS.md`.
**Hallazgos:**
- Sin `relatedLinks` rotos o incoherentes.
- Las 18 categorías están cubiertas por sitemap, canonical y hreflang.
- Oportunidad accionable: añadir `FAQPage` JSON-LD para páginas de categoría con FAQs.

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

## T15 — Category FAQPage JSON-LD  ·  PENDING

**Objetivo:** añadir `FAQPage` JSON-LD explícito para páginas de categoría que ya tienen
FAQs curadas en `buildCategorySeoContent`, sin emitir `@type: Product`.
**IN SCOPE:** `app/[locale]/portal/category/[slug]/page.tsx`,
`e2e/portal.spec.ts` o test focalizado existente si cubre structured data de categoría.
**OUT OF SCOPE:** `seo.ts`, copy SEO, sitemap, robots, canonical/hreflang, enricher/AWS/Lambda/
Terraform, checkout/Stripe, auth, referrals, `.DS_Store`, `.claude/`.
**Requisitos:**
- Conservar `CollectionPage` y `BreadcrumbList`.
- Añadir un objeto `FAQPage` solo cuando `seoContent?.faqs.length` exista.
- Mapear cada FAQ a `Question` + `acceptedAnswer`.
- Añadir cobertura que verifique `FAQPage` en una categoría curada y ausencia de
  `@type: Product`.
**Aceptación:**
- `npm test`, `npm run type-check`, `npm run lint` verdes.
- `npm run test:e2e -- e2e/portal.spec.ts` verde porque toca render del portal (§4).
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
