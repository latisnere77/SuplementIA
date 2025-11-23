# REPORTE DE TRAZABILIDAD DETALLADA - ERROR EN SUPLEMENTIA
**Fecha**: 2025-11-22
**Analista**: Claude Code
**Tipo de Análisis**: Trazabilidad Completa con Observabilidad

---

## 📋 RESUMEN EJECUTIVO

**Problema Reportado**: El frontend muestra el mensaje "❌ No pudimos encontrar información científica suficiente sobre 'taurina'" para todas las búsquedas de suplementos.

**Causa Raíz Identificada**: El Lambda `content-enricher` está fallando sistemáticamente al parsear el JSON generado por Claude/Bedrock, causando que **TODAS las búsquedas retornen error 404** incluso cuando existen estudios científicos en PubMed.

**Severidad**: **CRÍTICA** - 100% de las búsquedas afectadas
**Impacto en Usuario**: Total - No hay resultados disponibles
**Evidencia**: CloudWatch Logs, X-Ray Traces, Código Fuente

---

## 🔍 METODOLOGÍA DE INVESTIGACIÓN

### Herramientas de Observabilidad Utilizadas:

1. **AWS CloudWatch Logs**
   - `/aws/lambda/suplementia-content-enricher-dev`
   - `/aws/lambda/suplementia-studies-fetcher-dev`
   - Período: Últimas 2 horas

2. **AWS X-Ray**
   - Traces completos del flujo de búsqueda
   - Service Map para entender arquitectura
   - Trace IDs analizados: `1-69212685-05258e2b7961445c128fc151`, `1-69212684-55fbbcf057b940ce03805e48`

3. **Sentry** (Configurado pero no activo en desarrollo)
   - Configuración encontrada en: `sentry.server.config.ts`
   - Estado: No envía eventos en development mode (línea 31-34)

4. **Análisis de Código Fuente**
   - Frontend: `app/portal/results/page.tsx`
   - API Route Quiz: `app/api/portal/quiz/route.ts`
   - API Route Recommend: `app/api/portal/recommend/route.ts`
   - API Route Enrich: `app/api/portal/enrich/route.ts`
   - Lambda bedrock.js (content-enricher)
   - Lambda prompts.js (content-enricher)

---

## 🛤️ FLUJO COMPLETO DE UNA BÚSQUEDA

### Arquitectura del Sistema:

```
┌──────────────┐
│   Frontend   │ app/portal/results/page.tsx
│  (Next.js)   │
└──────┬───────┘
       │ 1. User searches "taurina"
       │
       ▼
┌──────────────────┐
│  /api/portal/quiz│ route.ts (línea 175)
└──────┬───────────┘
       │ 2. POST to /api/portal/recommend
       │
       ▼
┌─────────────────────┐
│ /api/portal/recommend│ route.ts (línea 115)
└──────┬──────────────┘
       │ 3. POST to /api/portal/enrich
       │
       ▼
┌────────────────────┐
│ /api/portal/enrich │ route.ts (línea 252)
└──────┬──────┬──────┘
       │      │
       │      │ 4. POST to studies-fetcher Lambda
       │      │
       │      ▼
       │  ┌──────────────────────────┐
       │  │ suplementia-studies-      │
       │  │ fetcher-dev (Lambda)      │
       │  │                           │
       │  │ Estado: ✅ SUCCESS        │
       │  │ Respuesta: 6 estudios     │
       │  │ Duration: 683ms           │
       │  └───────────┬──────────────┘
       │              │
       │              │ Returns studies[]
       │              │
       │              ▼
       │  5. POST to content-enricher Lambda
       │     (with studies)
       │              │
       ▼              ▼
┌────────────────────────────────────┐
│ suplementia-content-enricher-dev   │
│ (Lambda)                            │
│                                     │
│ ❌ Estado: FAILURE                  │
│ ❌ Error: JSON Parse Failed         │
│ Duration: 31.1s                     │
│                                     │
│ Flujo Interno:                      │
│  ├─ Bedrock Call → ✅ SUCCESS       │
│  ├─ Claude Response → ✅ RECEIVED   │
│  └─ JSON Parsing → ❌ FAILED        │
│                                     │
│ Error en bedrock.js:124             │
│ parseJSONWithFallback()             │
└────────────────────────────────────┘
       │
       │ Returns error 500
       │
       ▼
┌─────────────────────┐
│ /api/portal/enrich  │ Catches error (línea 691)
└──────┬──────────────┘
       │ Returns 500
       ▼
┌─────────────────────────┐
│ /api/portal/recommend   │ Catches error (línea 134)
└──────┬──────────────────┘
       │ Returns 404 "insufficient_data"
       ▼
┌──────────────────┐
│  /api/portal/quiz│ Propagates error
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│   Frontend   │ Displays error message:
│  (Next.js)   │ "❌ No pudimos encontrar información
└──────────────┘  científica suficiente sobre 'taurina'"
```

---

## 🔥 EVIDENCIA DETALLADA DE CloudWatch Logs

### Ejemplo de Error Real - Búsqueda: "taurina"

**Timestamp**: 2025-11-22 01:57:09
**Request ID**: `bb8d8c3b-a44a-46d4-bca2-f20a94f806bc`
**Correlation ID**: `e7fe9a79-5c9a-4fdf-b6eb-41e2927e9917`

#### PASO 1: Studies Fetcher - ✅ SUCCESS

```json
{
  "event": "STUDIES_FETCH_SUCCESS",
  "requestId": "661f4e36-e33a-4161-a3a4-dbc013c82343",
  "correlationId": "e7fe9a79-5c9a-4fdf-b6eb-41e2927e9917",
  "supplementName": "taurina",
  "searchQuery": "taurina",
  "studiesFound": 6,
  "duration": 683,
  "searchDuration": 683,
  "studyTypes": ["systematic review", "meta-analysis", "randomized controlled trial"]
}
```

**Conclusión**: ✅ El Lambda `studies-fetcher` funcionó correctamente y encontró 6 estudios científicos.

---

#### PASO 2: Content Enricher - ❌ FAILURE

**Log Sequence**:

1. **Inicio del proceso** (01:57:09.128Z):
```json
{
  "event": "CONTENT_ENRICH_REQUEST",
  "requestId": "bb8d8c3b-a44a-46d4-bca2-f20a94f806bc",
  "correlationId": "e7fe9a79-5c9a-4fdf-b6eb-41e2927e9917",
  "supplementId": "taurina",
  "category": "taurina",
  "forceRefresh": false,
  "studiesProvided": 6,
  "hasRealData": true,
  "studyTypes": ["systematic review", "meta-analysis", "randomized controlled trial"]
}
```

2. **Llamada a Bedrock/Claude** (01:57:09.134Z):
```json
{
  "operation": "BedrockCall",
  "supplementId": "taurina",
  "modelId": "anthropic.claude-3-haiku-20240307-v1:0",
  "maxTokens": 4096,
  "temperature": 0.3
}
```

3. **Respuesta de Bedrock - ✅ SUCCESS** (01:57:40.018Z):
```json
{
  "operation": "BedrockResponse",
  "supplementId": "taurina",
  "duration": 30884,
  "tokensUsed": 9687,
  "inputTokens": 6199,
  "outputTokens": 3488
}
```

4. **❌ ERROR: JSON Parsing Failed** (01:57:40.019Z):
```json
{
  "level": "WARN",
  "message": "Initial JSON parse failed: Unexpected token 'N', ...\"cipants\": N/A,      \"... is not valid JSON"
}
```

```json
{
  "level": "ERROR",
  "message": "Extracted JSON parse failed: Unexpected token 'N', ...\"cipants\": N/A,      \"... is not valid JSON"
}
```

```json
{
  "level": "ERROR",
  "message": "JSON snippet around error: {\n  \"whatIsIt\": \"La taurina, también conocida como"
}
```

5. **Error Final**:
```json
{
  "event": "JSON_PARSE_FAILED_ALL_STRATEGIES",
  "supplementId": "taurina",
  "error": "Failed to parse JSON from Bedrock response after all repair strategies. The LLM may have generated severely malformed JSON.",
  "responseLength": 8872,
  "responsePreview": "{\n  \"whatIsIt\": \"La taurina es un...",
  "timestamp": "2025-11-22T01:57:40.019Z"
}
```

```json
{
  "event": "CONTENT_ENRICH_ERROR",
  "requestId": "bb8d8c3b-a44a-46d4-bca2-f20a94f806bc",
  "correlationId": "e7fe9a79-5c9a-4fdf-b6eb-41e2927e9917",
  "supplementId": "taurina",
  "error": "Failed to parse enriched content JSON: Failed to parse JSON from Bedrock response after all repair strategies. The LLM may have generated severely malformed JSON.. This indicates the LLM generated invalid JSON despite repair attempts.",
  "duration": 30896,
  "timestamp": "2025-11-22T01:57:40.019Z"
}
```

---

### Ejemplos Adicionales de Errores (Últimas 2 horas)

| Timestamp | Suplemento | Estudios Encontrados | Error de Parseo | Razón |
|-----------|------------|---------------------|-----------------|-------|
| 01:47:47 | acido hialuronico | 3 | `Expected double-quoted property name in JSON at position 121` | JSON malformado |
| 01:54:21 | dhea | 10 | `Expected double-quoted property name in JSON at position 295` | JSON malformado |
| 01:56:44 | chlorella | 10 | `Expected double-quoted property name in JSON at position 114` | JSON malformado |
| 02:03:19 | fosfatidilserina | 1 | `Expected double-quoted property name in JSON at position 118` | JSON malformado |
| 01:07:48 | niacina | 7 | `Unexpected token '>', ...\"cipants\": >1000,    \"...` | Símbolos en números |
| 01:08:30 | niacina (retry) | 7 | `Unexpected token 'N', ...\"cipants\": N/A,      \"...` | Valor N/A sin comillas |
| 01:17:13 | ginkgo biloba | 10 | `Expected ',' or ']' after array element in JSON at position 11804` | Arrays mal formados |

**Patrón Identificado**: El 100% de las búsquedas fallan por errores de parseo JSON, **NO por falta de datos científicos**.

---

## 📊 EVIDENCIA DE X-RAY TRACES

### Trace ID: `1-69212685-05258e2b7961445c128fc151`

**Análisis del Trace**:

```json
{
  "Id": "1-69212685-05258e2b7961445c128fc151",
  "StartTime": "2025-11-21T20:57:09-06:00",
  "Duration": 31.142,
  "ResponseTime": 31.141,
  "HasFault": false,
  "HasError": false,  // ❗ X-Ray no marca como error porque Lambda no crasheó
  "HasThrottle": false,
  "Annotations": {
    "cacheHit": false,
    "correlationId": "e7fe9a79-5c9a-4fdf-b6eb-41e2927e9917",
    "error": "Failed to parse enriched content JSON...",  // ✅ Error anotado
    "success": false,  // ✅ Marcado como fallo
    "supplementId": "taurina",
    "studiesProvided": 6  // ✅ Estudios proporcionados correctamente
  },
  "ServiceIds": [
    {
      "Name": "BedrockRuntime",
      "Type": "AWS::BedrockRuntime"  // ✅ Bedrock fue llamado
    },
    {
      "Name": "suplementia-content-enricher-dev",
      "Type": "AWS::Lambda::Function"
    }
  ]
}
```

**Conclusiones de X-Ray**:
1. ✅ Bedrock/Claude fue llamado correctamente
2. ✅ El Lambda recibió 6 estudios reales de PubMed
3. ❌ El error ocurrió DESPUÉS de que Bedrock respondió
4. ❌ El error está en el parseo de JSON, NO en la generación de contenido

---

## 💻 ANÁLISIS DEL CÓDIGO FUENTE

### Archivo: `bedrock.js` (Lambda content-enricher)

**Línea 124-127** - Función `parseJSONWithFallback()`:

```javascript
// Strategy 3: Extract JSON between first { and last }
const firstBrace = text.indexOf('{');
const lastBrace = text.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
  const extracted = text.substring(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(sanitizeJSON(extracted));  // ❌ FALLA AQUÍ
  } catch (error3) {
    console.warn(`Strategy 3 failed (extraction): ${error3.message}`);
    // Get error position for debugging
    const errorPos = parseInt(error3.message.match(/\d+/)?.[0] || '0');
    const snippet = extracted.substring(Math.max(0, errorPos - 100), Math.min(extracted.length, errorPos + 100));
    console.error(`JSON error context: ...${snippet}...`);
  }
}
```

**Función `sanitizeJSON()` - Líneas 98-151**:

Tiene reglas de sanitización pero NO es suficiente:

```javascript
const sanitizeJSON = (str) => {
  let cleaned = str;

  // Stage 1: Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (match) => {
    if (match === '\t' || match === '\n' || match === '\r') {
      return ' ';
    }
    return '';
  });

  // Stage 2: Fix invalid number values with symbols
  // >1000 → 1000, <50 → 50, ~100 → 100
  cleaned = cleaned.replace(/:\s*([><~±≈])(\d+)/g, ': $2');  // ✅ Intenta arreglar

  // Stage 3: Fix N/A, null, undefined values → 0 or empty string
  cleaned = cleaned.replace(/:\s*N\/A\s*(,|]|})/g, ': 0$1');  // ✅ Intenta arreglar
  cleaned = cleaned.replace(/:\s*undefined\s*(,|]|})/g, ': 0$1');
  cleaned = cleaned.replace(/:\s*null\s*(,|]|})/g, ': 0$1');

  // ... más reglas de sanitización

  return cleaned;
};
```

**Problema**: Claude está generando JSON con caracteres especiales en español que NO están cubiertos por las reglas de sanitización.

---

### Archivo: `prompts.js` (Lambda content-enricher)

**Líneas 92-106** - Reglas de JSON en el Prompt:

```javascript
🚨 REGLAS CRÍTICAS DE JSON - CUMPLIMIENTO OBLIGATORIO:
1. TODOS los valores numéricos DEBEN ser números válidos (no símbolos como >, <, ~)
   ❌ INCORRECTO: "totalParticipants": >1000
   ✅ CORRECTO: "totalParticipants": 1000

2. NUNCA uses valores no-JSON como N/A, null sin comillas, undefined
   ❌ INCORRECTO: "totalParticipants": N/A
   ❌ INCORRECTO: "totalParticipants": null
   ✅ CORRECTO: "totalParticipants": 0 (y explicar en "notes": "No reportado")

3. TODOS los strings DEBEN estar entre comillas dobles, sin truncar
   ❌ INCORRECTO: "notes": "no reportad
   ✅ CORRECTO: "notes": "no reportado"

// ... más reglas
```

**Problema**: Claude (Haiku) está **IGNORANDO** estas reglas cuando genera JSON en español.

---

### Archivo: `app/api/portal/enrich/route.ts`

**Líneas 691-716** - Manejo de Error del Content-Enricher:

```typescript
if (!enrichResponse.ok) {
  const error = await enrichResponse.text();
  console.error(
    JSON.stringify({
      event: 'CONTENT_ENRICH_ERROR',
      requestId,
      correlationId,
      originalQuery: supplementName,
      translatedQuery: searchTerm,
      supplementId: supplementName,
      statusCode: enrichResponse.status,
      error,
      duration: enrichDuration,
      timestamp: new Date().toISOString(),
    })
  );
  return NextResponse.json(
    {
      success: false,
      error: 'Failed to enrich content',
      details: error,
      requestId,
      correlationId,
    },
    { status: enrichResponse.status }  // ❌ Propaga status 500
  );
}
```

**Flujo de Error**:
1. Content-enricher Lambda retorna status 500
2. `/api/portal/enrich` propaga el status 500
3. `/api/portal/recommend` (línea 134-169) atrapa el error y retorna **404 con mensaje "insufficient_data"**
4. Frontend muestra: "❌ No pudimos encontrar información científica suficiente"

**Problema**: El error es engañoso - dice "datos insuficientes" cuando el problema real es parseo de JSON.

---

## 🎯 CAUSA RAÍZ CONFIRMADA

### Evidencia Concluyente:

1. **Studies-Fetcher funciona correctamente**:
   - ✅ Encuentra estudios en PubMed (6 estudios para "taurina")
   - ✅ Responde en <1 segundo
   - ✅ Devuelve datos estructurados válidos

2. **Content-Enricher recibe datos correctos**:
   - ✅ Recibe los 6 estudios de PubMed
   - ✅ Llama a Bedrock/Claude correctamente
   - ✅ Claude genera respuesta (3,488 tokens de salida)

3. **Bedrock/Claude genera JSON malformado**:
   - ❌ Claude Haiku en español ignora las reglas de formato JSON
   - ❌ Genera valores como `N/A`, `>1000`, strings truncados
   - ❌ La sanitización actual NO es suficiente

4. **El error se propaga incorrectamente**:
   - ❌ El frontend recibe 404 "insufficient_data"
   - ❌ El mensaje dice "no hay datos científicos"
   - ❌ El usuario cree que no existen estudios cuando SÍ EXISTEN

---

## 📈 IMPACTO MEDIDO

### Métricas del Problema:

- **Tasa de Fallo**: 100% de búsquedas fallan
- **Tiempo desperdiciado por búsqueda**: ~30 segundos
- **Tokens desperdiciados**: ~10,000 tokens por búsqueda
- **Costo por búsqueda fallida**: ~$0.015 USD
- **Estudios encontrados pero no utilizados**: 6-10 por búsqueda

### Impacto en Usuario:

- **Experiencia**: Totalmente rota
- **Confianza**: Pérdida de confianza en la plataforma
- **Mensaje confuso**: Dice "no hay datos" cuando SÍ hay datos
- **Falsos negativos**: 100% de búsquedas válidas son rechazadas

---

## 🔧 SOLUCIONES PROPUESTAS (PRIORIDAD)

### ⚠️ IMPORTANTE: NO SE HAN APLICADO CAMBIOS AÚN

Este reporte es de **INVESTIGACIÓN Y DIAGNÓSTICO** únicamente. No se han hecho modificaciones al código.

### SOLUCIÓN 1: Mejorar Prompt y Usar JSON Prefilling Más Agresivo ⭐⭐⭐

**Prioridad**: ALTA
**Esfuerzo**: Bajo (2-4 horas)
**Impacto**: Alto (puede resolver 70-80% de casos)

**Cambios en `bedrock.js`**:

```javascript
// Actual (línea 33-44)
const bedrockRequest = {
  messages: [
    { role: 'user', content: prompt },
    { role: 'assistant', content: '{' }  // ❌ Muy genérico
  ]
};

// Propuesto
const bedrockRequest = {
  messages: [
    { role: 'user', content: prompt },
    {
      role: 'assistant',
      content: '{\n  "whatIsIt": "' // ✅ Más específico, fuerza estructura
    }
  ]
};
```

**Cambios en `prompts.js`**:

```javascript
// Agregar EJEMPLOS de JSON válido ANTES de las reglas:

EJEMPLO DE JSON VÁLIDO (SIGUE ESTE FORMATO EXACTO):
{
  "whatIsIt": "La taurina es un aminoácido que se encuentra naturalmente en el cuerpo.",
  "totalStudies": 6,
  "primaryUses": [
    "Mejora del rendimiento deportivo - Aumenta resistencia 5-10%",
    "Salud cardiovascular - Reduce presión arterial 3-5 mmHg"
  ],
  "worksFor": [
    {
      "condition": "Rendimiento físico",
      "evidenceGrade": "B",
      "effectSize": "Small",
      "magnitude": "Aumenta resistencia 5-10%",
      "studyCount": 15,
      "rctCount": 12,
      "metaAnalysis": true,
      "totalParticipants": 800,
      "notes": "Efectivo en dosis de 1-3g antes del ejercicio"
    }
  ]
}

AHORA TU RESPUESTA (USA EL FORMATO EXACTO DEL EJEMPLO):
```

### SOLUCIÓN 2: Mejorar Sanitización de JSON ⭐⭐

**Prioridad**: MEDIA-ALTA
**Esfuerzo**: Medio (4-6 horas)
**Impacto**: Medio (resuelve casos edge que Solución 1 no cubre)

**Nuevas reglas de sanitización** para agregar en `bedrock.js`:

```javascript
// AGREGAR: Manejo de caracteres especiales en español
cleaned = cleaned.replace(/[""](\w)/g, '"$1'); // Comillas curvas → rectas
cleaned = cleaned.replace(/(\w)[""](\s*[,}\]])/g, '$1"$2');

// AGREGAR: Manejo de valores en español
cleaned = cleaned.replace(/:\s*"No\s+disponible"\s*(,|]|})/g, ': 0$1');
cleaned = cleaned.replace(/:\s*"Sin\s+datos"\s*(,|]|})/g, ': 0$1');
cleaned = cleaned.replace(/:\s*"Desconocido"\s*(,|]|})/g, ': 0$1');

// MEJORAR: Detectar strings truncados y completarlos
cleaned = cleaned.replace(/"([^"]{1,500})$/m, '"$1"'); // Añadir comilla final si falta

// AGREGAR: Validación de balance de braces/brackets antes de parsear
const braceBalance = (cleaned.match(/{/g) || []).length - (cleaned.match(/}/g) || []).length;
const bracketBalance = (cleaned.match(/\[/g) || []).length - (cleaned.match(/]/g) || []).length;
if (braceBalance > 0) cleaned += '}'.repeat(braceBalance);
if (bracketBalance > 0) cleaned += ']'.repeat(bracketBalance);
```

### SOLUCIÓN 3: Cambiar a Claude Sonnet 3.5 (Mejor con JSON) ⭐⭐⭐

**Prioridad**: ALTA
**Esfuerzo**: Muy Bajo (15 minutos)
**Impacto**: Muy Alto (Sonnet es mucho mejor con JSON estructurado)

**Cambio en `bedrock.js` o variable de entorno**:

```javascript
// Actual
modelId: 'anthropic.claude-3-haiku-20240307-v1:0'  // Rápido pero malo con JSON

// Propuesto
modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'  // Mejor con JSON
```

**Trade-offs**:
- ❌ Mayor costo (~5x más caro)
- ❌ Puede ser más lento (~2-3x)
- ✅ Mucho mejor con JSON estructurado
- ✅ Sigue instrucciones más fielmente
- ✅ Menos errores de parseo

### SOLUCIÓN 4: Usar JSON Schema Validation con Retry ⭐

**Prioridad**: MEDIA
**Esfuerzo**: Alto (8-12 horas)
**Impacto**: Alto (garantiza JSON válido con retry automático)

**Implementación**:

1. Definir JSON Schema completo
2. Validar response de Bedrock con `ajv` o similar
3. Si falla validación, hacer retry con prompt mejorado
4. Máximo 2 retries

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

const schema = {
  type: 'object',
  required: ['whatIsIt', 'totalStudies', 'worksFor'],
  properties: {
    totalStudies: { type: 'number', minimum: 0 },
    totalParticipants: { type: 'number', minimum: 0 },
    // ... resto del schema
  }
};

const validate = ajv.compile(schema);
const valid = validate(parsedJSON);

if (!valid) {
  // Retry con error details en prompt
  console.error('Validation errors:', validate.errors);
  // ... retry logic
}
```

### SOLUCIÓN 5: Dividir Prompt en Llamadas Más Pequeñas ⭐

**Prioridad**: BAJA
**Esfuerzo**: Alto (12-16 horas)
**Impacto**: Medio (reduce complejidad pero aumenta latencia y costo)

**Concepto**: En lugar de un JSON gigante, hacer 3-4 llamadas pequeñas:

1. Llamada 1: Información básica (`whatIsIt`, `totalStudies`)
2. Llamada 2: Evidencia (`worksFor`, `doesntWorkFor`)
3. Llamada 3: Seguridad (`dosage`, `sideEffects`)
4. Llamada 4: Estudios clave (`keyStudies`)

**Trade-offs**:
- ❌ 4x más llamadas = 4x más costo
- ❌ 4x más latencia
- ✅ JSON más simple = menos errores
- ✅ Mejor cache (partes individuales)

---

## 🚀 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### FASE 1: Quick Win (Misma Semana)

1. **Cambiar a Claude Sonnet 3.5** (Solución 3)
   - Esfuerzo: 15 minutos
   - Puede resolver 80-90% del problema inmediatamente

2. **Mejorar JSON Prefilling** (Solución 1 - Parte 1)
   - Esfuerzo: 1 hora
   - Hacer prefilling más específico
   - Agregar ejemplo de JSON al prompt

### FASE 2: Robustez (1-2 Semanas)

3. **Mejorar Sanitización** (Solución 2)
   - Esfuerzo: 4-6 horas
   - Agregar reglas para español
   - Agregar validación de balance de braces

4. **Mejorar Prompt** (Solución 1 - Parte 2)
   - Esfuerzo: 2-3 horas
   - Simplificar schema si es posible
   - Agregar más ejemplos

### FASE 3: Garantías (1 Mes)

5. **JSON Schema Validation** (Solución 4)
   - Esfuerzo: 8-12 horas
   - Implementar validación estricta
   - Agregar retry logic

---

## 📊 MÉTRICAS PARA MONITOREAR POST-FIX

### CloudWatch Dashboards:

1. **Tasa de Éxito de Content-Enricher**
   - Métrica: `COUNT(event="CONTENT_ENRICH_SUCCESS") / COUNT(event="CONTENT_ENRICH_REQUEST")`
   - Target: >95%

2. **Tasa de Error de JSON Parsing**
   - Métrica: `COUNT(event="JSON_PARSE_FAILED_ALL_STRATEGIES")`
   - Target: <2%

3. **Duración de Enrichment**
   - Métrica: `AVG(duration)` donde `event="CONTENT_ENRICH_SUCCESS"`
   - Target: <35s (Haiku), <50s (Sonnet)

4. **Costo por Request**
   - Métrica: `SUM(tokensUsed) * $0.0015 per 1K tokens`
   - Haiku: ~$0.015 por request
   - Sonnet: ~$0.075 por request

### X-Ray Metrics:

1. **Error Rate**
   - Annotation: `success=false`
   - Target: <5%

2. **Response Time p99**
   - Target: <60s

### Alertas Propuestas:

1. **Critical**: JSON Parse Error Rate >10% en 5 minutos
2. **Warning**: Enrichment Duration >60s (p95) por 10 minutos
3. **Info**: Cache Hit Rate <50% por 1 hora

---

## 🎓 LECCIONES APRENDIDAS

### 1. El LLM NO siempre sigue instrucciones

**Evidencia**: A pesar de reglas EXPLÍCITAS en el prompt (líneas 92-151 de prompts.js), Claude Haiku genera JSON inválido.

**Aprendizaje**: No confiar ciegamente en que el LLM seguirá las reglas. Siempre tener validación robusta.

### 2. El JSON Prefilling es poderoso pero limitado

**Actual**: Usamos `{ role: 'assistant', content: '{' }`

**Problema**: Demasiado genérico. Claude tiene libertad para escribir cualquier cosa después.

**Solución**: Hacer prefilling más específico: `'{\n  "whatIsIt": "'`

### 3. Los errores deben propagarse con contexto

**Problema Actual**:
- Lambda falla con JSON parse error
- API retorna 404 "insufficient_data"
- Usuario ve "no hay datos científicos"

**Realidad**: SÍ hay 6 estudios científicos válidos

**Solución**: Retornar código de error específico (500 = sistema, 404 = sin datos)

### 4. El Prompt es DEMASIADO largo y complejo

**Actual**: >15,000 caracteres con schema JSON gigante

**Problema**: Claude se confunde con tantas instrucciones

**Solución**: Simplificar prompt o dividir en llamadas más pequeñas

### 5. Haiku vs Sonnet para JSON

**Haiku**:
- ✅ Rápido (~20-30s)
- ✅ Económico ($0.015/request)
- ❌ Malo con JSON estructurado
- ❌ Ignora instrucciones complejas

**Sonnet 3.5**:
- ✅ Excelente con JSON estructurado
- ✅ Sigue instrucciones fielmente
- ❌ Más lento (~30-50s)
- ❌ Más caro ($0.075/request)

**Recomendación**: Usar Sonnet para JSON estructurado, Haiku para texto libre.

---

## 📋 CHECKLIST PRE-IMPLEMENTACIÓN

Antes de hacer CUALQUIER cambio, validar:

- [ ] ¿Se ha creado un branch de feature?
- [ ] ¿Se han escrito tests para validar el fix?
- [ ] ¿Se ha configurado monitoreo adicional?
- [ ] ¿Se ha creado un plan de rollback?
- [ ] ¿Se ha documentado el cambio?
- [ ] ¿Se ha validado en ambiente de staging?
- [ ] ¿Se tiene aprobación para incrementar costos (si aplica)?

---

## 📞 CONTACTO Y SEGUIMIENTO

**Documento creado por**: Claude Code
**Fecha de creación**: 2025-11-22
**Última actualización**: 2025-11-22

**Próximos pasos**:
1. Revisar este documento con el equipo
2. Decidir qué solución implementar primero
3. Crear tickets en sistema de tracking
4. Asignar responsables
5. Establecer deadlines

---

## 🔗 REFERENCIAS

### Código Analizado:
- `/Users/latisnere/Documents/suplementia/app/api/portal/enrich/route.ts`
- `/Users/latisnere/Documents/suplementia/app/api/portal/recommend/route.ts`
- `/Users/latisnere/Documents/suplementia/app/api/portal/quiz/route.ts`
- `/Users/latisnere/Documents/suplementia/app/portal/results/page.tsx`
- Lambda: `bedrock.js` (content-enricher)
- Lambda: `prompts.js` (content-enricher)

### Logs Analizados:
- CloudWatch: `/aws/lambda/suplementia-content-enricher-dev` (últimas 2 horas)
- CloudWatch: `/aws/lambda/suplementia-studies-fetcher-dev` (últimas 2 horas)
- X-Ray Traces: `1-69212685-*`, `1-69212684-*`

### Documentación de Referencia:
- AWS Bedrock Claude API
- Anthropic Claude JSON Mode
- AWS X-Ray Developer Guide
- AWS CloudWatch Logs Insights Query Syntax

---

**FIN DEL REPORTE**
