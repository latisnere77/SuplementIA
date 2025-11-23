# Diagnóstico Completo: "saw palmetto" 404 Error

**Fecha:** November 22, 2024  
**Status:** 🔴 Problema identificado - Timeout en content-enricher Lambda

---

## 🔍 Síntomas

Usuario busca "saw palmetto" y recibe:
```
❌ No pudimos encontrar información científica suficiente sobre "saw palmetto"
```

---

## 📊 Traza Completa

### 1. Frontend → Vercel API Route
```
Request: POST /api/portal/enrich
Body: { supplementName: "saw palmetto" }
Timeout: 30 segundos (Vercel limit)
```

### 2. API Route → Abbreviation Expander (NUEVO CÓDIGO)
```
✅ SUCCESS
Duration: 1.8s (primera llamada con cache write)
Result: ["saw palmetto", "serenoa repens"]
Cache: 4027 tokens escritos
```

**Nota:** El código nuevo de Prompt Caching funciona perfectamente ✅

### 3. API Route → Studies Fetcher Lambda
```
✅ SUCCESS
Duration: 2.1s
Studies Found: 10
Query: (saw[tiab] AND palmetto[tiab]) AND ("randomized controlled trial"[Publication Type] OR "meta-analysis"[Publication Type] OR "systematic review"[Publication Type]) AND 2010:2025[Date - Publication] AND "humans"[MeSH Terms]
```

**Logs:**
```json
{
  "event": "STUDIES_FETCH_SUCCESS",
  "supplementName": "saw palmetto",
  "studiesFound": 10,
  "duration": 2104,
  "timestamp": "2025-11-22T17:19:23.893Z"
}
```

### 4. API Route → Content Enricher Lambda
```
❌ TIMEOUT
Duration: 119 segundos (2 minutos!)
Model: Claude 3.5 Sonnet
Tokens: 15,685 total (11,674 input + 4,011 output)
```

**Logs:**
```json
{
  "operation": "ConverseAPICall",
  "supplementId": "saw palmetto",
  "modelId": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "timestamp": "2025-11-22T17:19:24.925Z"
}

{
  "operation": "ConverseAPIResponse",
  "duration": 119789,  // ← 119 SEGUNDOS!
  "tokensUsed": 15685,
  "timestamp": "2025-11-22T17:21:24.713Z"
}
```

### 5. Vercel Timeout
```
❌ 504 Gateway Timeout
Duration: 31.5 segundos
Error: "Endpoint request timed out"
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to enrich content",
  "details": "{\"message\": \"Endpoint request timed out\"}"
}
```

---

## 🎯 Root Cause

**Content Enricher Lambda tarda 2 minutos** en generar contenido con Claude 3.5 Sonnet, pero:
- Vercel Free tier: 10s timeout
- Vercel Pro tier: 60s timeout  
- Vercel Enterprise: 900s timeout

**Nuestro caso:** Probablemente Pro tier (60s), pero el Lambda tarda 119s.

---

## ✅ Lo que SÍ funciona

1. ✅ **Abbreviation Expander** - Prompt caching funcionando perfectamente
2. ✅ **Studies Fetcher** - Encuentra 10 estudios en 2 segundos
3. ✅ **Scientific Names** - Sugiere "serenoa repens" correctamente
4. ✅ **PubMed Search** - 380 estudios disponibles

---

## ❌ Lo que NO funciona

1. ❌ **Content Enricher Lambda** - Tarda 119 segundos (2 minutos)
2. ❌ **Vercel Timeout** - Solo permite 60 segundos máximo
3. ❌ **User Experience** - Usuario recibe 504 timeout

---

## 🔧 Soluciones Propuestas

### Opción 1: Optimizar Content Enricher (RECOMENDADO)
**Objetivo:** Reducir tiempo de 119s a <30s

**Acciones:**
1. Implementar Prompt Caching en content-enricher
   - System prompt cacheado (>2048 tokens)
   - Reducir latencia de 119s a ~20-30s en cache hits
   
2. Reducir tamaño del prompt
   - Actualmente: 11,674 input tokens
   - Objetivo: <5,000 input tokens
   - Método: Resumir estudios antes de enviar a Claude

3. Usar modelo más rápido
   - Actual: Claude 3.5 Sonnet (lento pero preciso)
   - Alternativa: Claude 3.5 Haiku (rápido pero menos preciso)
   - Compromiso: Claude 3 Haiku para primera generación, Sonnet para refinamiento

**Estimación:** 2-3 horas de trabajo

### Opción 2: Arquitectura Asíncrona
**Objetivo:** Retornar inmediatamente, procesar en background

**Flujo:**
```
1. User request → API Route
2. API Route → Start async job
3. Return 202 Accepted + job ID
4. Frontend polls for completion
5. Lambda completes → Update DynamoDB
6. Frontend retrieves result
```

**Pros:**
- No timeout issues
- Better UX con loading states
- Escalable

**Cons:**
- Más complejo
- Requiere polling o WebSockets
- Cambios en frontend

**Estimación:** 4-6 horas de trabajo

### Opción 3: Aumentar Vercel Tier
**Objetivo:** Permitir más tiempo de ejecución

**Requisitos:**
- Vercel Enterprise: 900s timeout
- Costo: ~$150/mes

**Pros:**
- Sin cambios de código
- Solución inmediata

**Cons:**
- Caro
- No resuelve el problema de fondo
- Mala UX (2 minutos de espera)

**Recomendación:** ❌ No recomendado

---

## 📝 Recomendación Final

**Implementar Opción 1: Optimizar Content Enricher**

**Prioridad 1 - Quick Win (30 min):**
1. Reducir maxTokens de 8192 a 4096
2. Resumir estudios antes de enviar (solo abstract + conclusión)
3. Objetivo: Reducir de 11,674 a ~5,000 input tokens

**Prioridad 2 - Prompt Caching (1-2 horas):**
1. Implementar system prompt cacheado en content-enricher
2. Similar a lo que hicimos en abbreviation-expander
3. Objetivo: 90% reducción en latencia en cache hits

**Prioridad 3 - Modelo Híbrido (1 hora):**
1. Usar Claude 3.5 Haiku para generación inicial
2. Cache el resultado
3. Usar Sonnet solo si se requiere refinamiento

**Resultado esperado:**
- Primera llamada: 30-40s (dentro del timeout de Vercel)
- Llamadas siguientes: 5-10s (con cache)
- Costo: 70-80% reducción

---

## 🧪 Testing

### Validar que el problema persiste:
```bash
npx tsx scripts/test-saw-palmetto-production.ts
```

### Después de implementar fix:
```bash
# Test 1: Primera llamada (sin cache)
time curl -X POST https://suplementia.vercel.app/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"saw palmetto"}'

# Test 2: Segunda llamada (con cache)
time curl -X POST https://suplementia.vercel.app/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"saw palmetto"}'
```

**Objetivo:** Ambas llamadas deben completar en <30s

---

## 📚 Referencias

1. **Vercel Timeouts**
   - https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
   - Free: 10s, Pro: 60s, Enterprise: 900s

2. **AWS Bedrock Prompt Caching**
   - https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
   - 90% cost reduction, 75-90% latency reduction

3. **Claude Model Comparison**
   - Haiku: Fast, cheap, good for simple tasks
   - Sonnet: Balanced, best for most use cases
   - Opus: Slow, expensive, best quality

---

**Status:** 🔴 Bloqueado por timeout  
**Código nuevo:** ✅ Funcionando correctamente  
**Próximo paso:** Optimizar content-enricher Lambda  
**ETA:** 2-3 horas de trabajo

