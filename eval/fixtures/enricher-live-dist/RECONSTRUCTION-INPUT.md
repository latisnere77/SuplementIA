# Enricher dist — complete artifact for governed source reconstruction

Este directorio ahora contiene el **dist compilado COMPLETO** del `production-content-enricher`
(13 módulos `.js` + sus `.d.ts`), extraído read-only del artefacto LIVE (cuenta 643942183354,
build 2026-06-08) vía `aws lambda get-function`. Es el INSUMO para reconstruir la fuente TS
oficial del enricher (la fuente original no está en el repo ni es recuperable de AWS — ver
`PROVENANCE.md` y la memoria de gobernanza).

## Módulos (entry: `index.handler`, runtime nodejs22.x)
- `index` — handler / orquestación
- `bedrock`, `bedrockConverse` — invocación Bedrock (Converse API, tool-use)
- `prompts`, `prompts-examine-style` — plantillas + `buildEnrichmentPrompt` + `validateEnrichedContent` + `sanitizeDosageWithPMIDValidation`
- `toolSchema` — `ENRICHED_CONTENT_TOOL_CONFIG` (tool `generate_enriched_content`)
- `config` — defaults (model/maxTokens/temp); en prod se sobreescriben por env vars
- `cache`, `job-store` — cache y store DynamoDB
- `studySummarizer` — fetch/resumen PubMed
- `synergies`, `types`, `retry`

## Objetivo de la reconstrucción
Producir fuente TS fiel + build reproducible, declarada como fuente-de-verdad oficial, para
poder: (1) arreglar el bug del operador `in` en `validateEnrichedContent` (guardas `typeof`
para dosage/safety que vienen como string — 50% de las salidas Haiku 4.5 lo disparan), y
(2) cambiar el modelo a Haiku 4.5. Los `.d.ts` traen las firmas de tipos: úsalos como ancla.

## NO es
No es la fuente original (no hay `sourcesContent` en los `.js.map`). NO redeployar desde aquí
sin revisión. El deploy es un paso gated humano aparte, con validación más amplia que el golden.
