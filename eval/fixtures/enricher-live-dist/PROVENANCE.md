# Enricher live-dist fixtures — PROVENANCE

**Qué son:** copias READ-ONLY de módulos compilados extraídos del artefacto LIVE de la
Lambda `production-content-enricher` (cuenta AWS 643942183354, us-east-1), build del
2026-06-08, capturado 2026-06-15 vía `aws lambda get-function` (operación de solo lectura).

**Para qué:** fixtures de un A/B fiel de modelos. El instrumento `eval/` importa de aquí el
`buildEnrichmentPrompt(...)` y el `ENRICHED_CONTENT_TOOL_CONFIG` REALES, de modo que el A/B
use el prompt + schema exactos de producción y solo swappee el modelo (Sonnet 4.5 baseline
vs Haiku 4.5 vs Nova Lite). Capturar el comportamiento live como fixture ≠ reconstruir fuente.

**Qué NO son:** NO son la fuente de verdad, NO son para redeploy, NO se deben editar para
"arreglar" nada. La fuente TypeScript original NO es recuperable desde AWS (sin IaC, sin
pipeline, sin puntero de repo; todos los artefactos son `dist` compilado). Si se quiere
intervenir el enricher en producción, primero hay que resolver la procedencia de la fuente TS.

**Módulos incluidos (autocontenidos, sin requires de primera parte):**
- `prompts.js` — `ENRICHMENT_PROMPT_TEMPLATE`, `BENEFIT_SPECIFIC_PROMPT_TEMPLATE`,
  `buildEnrichmentPrompt(supplementName, category='general', studies?, benefitQuery?)`,
  `validateEnrichedContent` (contiene el bug del operador `in` que bloquea Haiku 4.5),
  `sanitizeDosageWithPMIDValidation`.
- `prompts-examine-style.js` — plantilla estilo Examine.
- `toolSchema.js` — `ENRICHED_CONTENT_TOOL_CONFIG` (tool `generate_enriched_content`).
- `config.js` — defaults del código (modelo Haiku 3.5, maxTokens 4500, temp 0.3).
- `types.js` — tipos (vacío en runtime).

**Config LIVE real de producción (baseline del A/B), vía env vars que sobreescriben config.js:**
- `BEDROCK_MODEL_ID = us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `MAX_TOKENS = 16000`
- `USE_TOOL_API = true`
- `TEMPERATURE` (default código 0.3)
