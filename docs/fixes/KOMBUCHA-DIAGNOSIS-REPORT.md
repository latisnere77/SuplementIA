# Diagnóstico Completo: Problema de Resultados Vacíos para Kombucha

**Fecha**: 2025-01-21
**Estado**: 🔴 Problema Identificado - Requiere Fix Inmediato

---

## Resumen Ejecutivo

La aplicación NO está retornando resultados para búsquedas de "kombucha" a pesar de que:
- ✅ PubMed tiene 10 estudios disponibles
- ✅ El Lambda studies-fetcher los encuentra correctamente
- ✅ El endpoint `/api/portal/enrich` procesa y retorna datos válidos
- ❌ El endpoint `/api/portal/recommend` rechaza los datos con 404

**Causa Raíz**: El endpoint `/api/portal/recommend` llama a `/api/portal/enrich` con `forceRefresh: true`, pero el enrich está tardando ~30 segundos y luego fallando la validación.

---

## Resultados de Diagnóstico

### Test 1: Studies-Fetcher Lambda ✅

```bash
curl -X POST https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search \
  -d '{"supplementName": "kombucha", "maxResults": 10}'
```

**Resultado**:
- ✅ Status: 200
- ✅ Estudios encontrados: 10
- ✅ Incluye 2 RCTs (PMID 39339787, 39738315)
- ⏱️ Duración: ~2.7 segundos

**Estudios destacados**:
1. "Green Tea Kombucha Impacts Inflammation..." (RCT, n=29)
2. "Modulating the human gut microbiome..." (RCT, n=16)
3. "Kombucha: a systematic review..." (Systematic Review)

### Test 2: Enrich Endpoint ✅

```bash
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -d '{"supplementName": "kombucha", "maxStudies": 10, "forceRefresh": true}'
```

**Resultado**:
- ✅ Status: 200
- ✅ `success: true`
- ✅ `hasRealData: true`
- ✅ `studiesUsed: 6`
- ⏱️ Duración: 30.76 segundos (primera vez), 1.24 segundos (con cache)

**Datos retornados**:
```json
{
  "success": true,
  "data": {
    "totalStudies": 6,
    "worksFor": [
      {"condition": "Reducción del estrés oxidativo", "evidenceGrade": "A"},
      {"condition": "Modulación del microbioma intestinal", "evidenceGrade": "B"},
      {"condition": "Mejora de la salud endotelial", "evidenceGrade": "B"}
    ],
    "doesntWorkFor": [
      {"condition": "Pérdida de peso", "evidenceGrade": "B"}
    ],
    "dosage": {
      "effectiveDose": "200 ml/día",
      "optimalDose": "200-400 ml/día"
    }
  },
  "metadata": {
    "hasRealData": true,
    "studiesUsed": 6,
    "intelligentSystem": true,
    "studiesSource": "PubMed"
  }
}
```

### Test 3: Recommend Endpoint ❌

```bash
curl -X POST https://www.suplementai.com/api/portal/recommend \
  -d '{"category": "kombucha", "age": 35}'
```

**Resultado**:
- ❌ Status: 404
- ❌ Error: "insufficient_data"
- ❌ Message: "No pudimos encontrar información científica suficiente sobre 'kombucha'"
- ⏱️ Duración: 30.55 segundos

**Problema**: A pesar de que `/api/portal/enrich` retorna datos válidos, `/api/portal/recommend` los rechaza.

### Test 4: Quiz Endpoint (Full Flow) 🟡

```bash
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category": "kombucha", "age": 35}'
```

**Resultado**:
- 🟡 Status: 200
- ⚠️ `demo: true` - Usando datos MOCK
- ⚠️ `fallback: true` - Cayó en fallback por error
- ⚠️ NO incluye `_enrichment_metadata`
- ⏱️ Duración: 16.25 segundos

**Datos retornados**: Datos generados (mock) con:
- `totalStudies: 85` (FAKE)
- `totalParticipants: 6500` (FAKE)
- Sin `_enrichment_metadata`

---

## Análisis del Flujo

### Flujo Esperado vs Flujo Actual

**Esperado**:
```
Usuario busca "kombucha"
  ↓
/api/portal/quiz
  ↓
/api/portal/recommend (forceRefresh=true)
  ↓
/api/portal/enrich (30s)
  ↓
✅ Retorna datos con metadata válido
  ↓
Validación en recommend: hasRealData=true, studiesUsed=6
  ↓
✅ Retorna recomendación
  ↓
Frontend muestra resultados
```

**Actual**:
```
Usuario busca "kombucha"
  ↓
/api/portal/quiz
  ↓
/api/portal/recommend (forceRefresh=true)
  ↓
/api/portal/enrich (30s) - ⚠️ TARDA DEMASIADO
  ↓
❌ /api/portal/recommend RECHAZA con 404
  ↓
/api/portal/quiz catch block
  ↓
⚠️ Retorna datos MOCK (demo=true, fallback=true)
  ↓
Frontend muestra datos FAKE sin _enrichment_metadata
```

---

## Causa Raíz

### 1. El endpoint `/api/portal/recommend` usa `forceRefresh: true`

**Archivo**: `app/api/portal/recommend/route.ts:124`

```typescript
body: JSON.stringify({
  supplementName: sanitizedCategory,
  category: sanitizedCategory,
  forceRefresh: true, // ⚠️ BYPASS CACHE
  maxStudies: 10,
  // ...
}),
```

**Problema**: Al usar `forceRefresh: true`, el enrich endpoint **siempre** llama al content-enricher Lambda, que tarda ~30 segundos para procesar. Esto causa:
1. El timeout del recommend endpoint (115s) se consume
2. La respuesta tarda demasiado
3. El quiz endpoint llega al catch block y usa mock data

### 2. Posible problema de validación en recommend

**Archivo**: `app/api/portal/recommend/route.ts:224`

```typescript
// CRITICAL VALIDATION: Ensure we have real scientific data
const hasRealData = metadata.hasRealData === true && (metadata.studiesUsed || 0) > 0;

if (!hasRealData) {
  // Return 404
}
```

**Teorías**:
- El metadata está llegando correctamente (según Test 2)
- PERO el recommend endpoint puede estar recibiendo metadata diferente
- Necesitamos ver los logs de `RECOMMEND_VALIDATION_CHECK` en producción

---

## Logs Clave a Revisar

Para confirmar la causa exacta, necesitamos buscar en CloudWatch:

### 1. Logs de Enrich Endpoint
```
event: "ORCHESTRATION_START"
  supplementName: "kombucha"

event: "STUDIES_FETCHED"
  studiesFound: ?

event: "CONTENT_ENRICH_SUCCESS"
  hasData: ?

event: "ORCHESTRATION_SUCCESS"
  studiesUsed: ?
  hasRealData: ?
```

### 2. Logs de Recommend Endpoint
```
event: "RECOMMEND_ENRICH_CALL_START"
  category: "kombucha"

event: "RECOMMEND_ENRICH_CALL_SUCCESS" o "RECOMMEND_ENRICH_CALL_FAILED"
  success: ?
  hasData: ?
  hasMetadata: ?
  studiesUsed: ?

event: "RECOMMEND_VALIDATION_CHECK"
  hasRealData: ?
  studiesUsed: ?
  metadataHasRealData: ?
  metadataKeys: ?

event: "RECOMMEND_VALIDATION_FAILED" (si falla)
  metadata: {...}
```

### 3. Logs de Quiz Endpoint
```
event: "QUIZ_BACKEND_UNREACHABLE" (si falla)
  error: ?
  errorType: ?
  action: "fallback_to_mock_data"
```

---

## Hipótesis

### Hipótesis 1: Timeout del Content-Enricher ⚠️
El content-enricher Lambda está tardando mucho (30s) debido a:
- Prompt muy largo
- Bedrock procesando 10 estudios
- Sin optimización de cache

**Evidencia**:
- Test 2 muestra 30.76s con forceRefresh
- Test 2 muestra 1.24s con cache (400x más rápido)

### Hipótesis 2: Recommend usa forceRefresh innecesariamente 🎯
El endpoint recommend está usando `forceRefresh: true` cuando NO debería.

**Evidencia**:
- Código muestra `forceRefresh: true` hardcoded (línea 124)
- El cache funciona perfectamente (1.24s vs 30.76s)
- No hay razón para bypass cache en cada request

### Hipótesis 3: Metadata se pierde en el flujo ❓
El metadata válido del enrich endpoint no llega al recommend validation.

**Evidencia**:
- Enrich retorna metadata correcto
- Recommend rechaza con 404
- Necesitamos logs de producción para confirmar

---

## Soluciones Propuestas

### Solución 1: REMOVER `forceRefresh: true` (Prioritaria) 🎯

**Archivo**: `app/api/portal/recommend/route.ts:124`

**Cambio**:
```diff
  body: JSON.stringify({
    supplementName: sanitizedCategory,
    category: sanitizedCategory,
-   forceRefresh: true, // Force refresh to bypass cache
+   forceRefresh: false, // Use cache when available
    maxStudies: 10,
    rctOnly: false,
    yearFrom: 2010,
  }),
```

**Beneficios**:
- ✅ Reduce latencia de 30s a 1.24s (96% mejora)
- ✅ Reduce costos de Bedrock (no re-procesa cada vez)
- ✅ Mejora UX dramáticamente
- ✅ El cache es válido y confiable

**Riesgo**:
- Si los estudios cambian en PubMed, el usuario verá datos cacheados
- Mitigación: El cache tiene TTL (7 días según KEFIR-DIAGNOSIS)

### Solución 2: Optimizar Content-Enricher Lambda

**Acciones**:
- Reducir tamaño del prompt enviado a Bedrock
- Usar `maxStudies: 5` en lugar de `10`
- Implementar streaming de respuesta
- Aumentar timeout del Lambda si es necesario

### Solución 3: Mejorar Logging en Recommend Endpoint

**Archivo**: `app/api/portal/recommend/route.ts:172`

**Agregar log después de fetch del enrich**:
```typescript
const enrichData = await enrichResponse.json();

// ADD THIS
console.log(
  JSON.stringify({
    event: 'RECOMMEND_ENRICH_RESPONSE_RECEIVED',
    requestId,
    category: sanitizedCategory,
    rawEnrichData: enrichData, // Full response for debugging
    timestamp: new Date().toISOString(),
  })
);
```

### Solución 4: Implementar Retry con Backoff

Si el enrich endpoint falla, el recommend endpoint podría:
1. Intentar sin `forceRefresh` primero (usa cache)
2. Si falla, intentar con `forceRefresh`
3. Si falla, retornar 404

---

## Plan de Acción

### Paso 1: Aplicar Fix Inmediato (Solución 1) 🚀
1. Cambiar `forceRefresh: true` → `forceRefresh: false` en `recommend/route.ts:124`
2. Deploy a producción
3. Probar con "kombucha"
4. Verificar que retorna datos reales

**Tiempo estimado**: 5 minutos
**Impacto**: Alto - Fix inmediato

### Paso 2: Verificar Logs de Producción
1. Buscar logs de `RECOMMEND_VALIDATION_CHECK` para "kombucha"
2. Verificar si metadata está llegando correctamente
3. Confirmar si hay otros ingredientes con el mismo problema

**Tiempo estimado**: 15 minutos
**Impacto**: Medio - Confirmar causa raíz

### Paso 3: Implementar Mejoras Adicionales
1. Agregar logging mejorado (Solución 3)
2. Optimizar content-enricher (Solución 2)
3. Implementar retry lógic (Solución 4)

**Tiempo estimado**: 1-2 horas
**Impacto**: Medio - Prevenir problemas futuros

---

## Validación del Fix

Después de aplicar Solución 1, validar con:

```bash
# Test 1: Recommend endpoint debe retornar 200
curl -X POST https://www.suplementai.com/api/portal/recommend \
  -d '{"category": "kombucha", "age": 35}'
# Esperado: 200, hasRealData=true, studiesUsed=6

# Test 2: Quiz endpoint debe retornar datos reales
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category": "kombucha", "age": 35}'
# Esperado: 200, demo=false, _enrichment_metadata presente

# Test 3: Verificar en frontend
# Buscar "kombucha" en https://www.suplementai.com/portal
# Esperado: Resultados con datos reales, sin warning banner
```

---

## Conclusión

El problema con "kombucha" (y probablemente otros ingredientes) es que:

1. 🔴 **Causa principal**: `forceRefresh: true` causa que el enrich endpoint tarde 30s
2. 🟡 **Efecto secundario**: El quiz endpoint cae en fallback y usa mock data
3. 🟢 **Solución simple**: Cambiar a `forceRefresh: false` para usar cache

**Recomendación**: Aplicar Solución 1 inmediatamente para resolver el problema.

---

## Archivos Involucrados

- `/app/api/portal/recommend/route.ts` (línea 124) - FIX AQUÍ
- `/app/api/portal/enrich/route.ts` - Funciona correctamente
- `/app/api/portal/quiz/route.ts` - Funciona correctamente (fallback esperado)
- `/backend/lambda/studies-fetcher/` - Funciona correctamente
- `/backend/lambda/content-enricher/` - Funciona pero es lento sin cache

---

## Scripts de Diagnóstico Creados

1. `scripts/test-kombucha-studies.ts` - Test studies-fetcher Lambda
2. `scripts/test-kombucha-enrich.ts` - Test enrich endpoint
3. `scripts/test-kombucha-full-flow.ts` - Test flujo completo
