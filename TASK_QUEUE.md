# TASK_QUEUE — SuplementAI

Cola de trabajo autónomo. El agente toma la primera tarea `PENDING` (de arriba a abajo),
la ejecuta bajo `AGENTS.md` (SPEC → LOOP → FLUSH), y la deja en un PR ready-for-review
contra `main`. **El agente nunca mergea**: un humano revisa y mergea cada PR (único gate).

Estados: `PENDING` · `IN_PROGRESS` (transitorio, nunca al cerrar sesión) · `DONE (PR #n)` · `BLOCKED (razón)`

---

## T1 — Discovery: enumerar categorías sin contenido SEO curado  ·  PENDING

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
