# 🚀 Arquitectura Moderna para SuplementIA

**Objetivo:** Sistema rápido (<5s), económico (<$50/mes), escalable (1000+ req/día)

---

## 📊 Arquitectura Actual vs Propuesta

### ❌ Arquitectura Actual (Problemática)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER REQUEST: "saw palmetto"                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vercel Edge (Next.js API Route)                                 │
│ - Timeout: 60s                                                  │
│ - Cold start: 1-2s                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Abbreviation Expansion (NEW - OPTIMIZED)               │
│ - Claude 3.5 Haiku                                              │
│ - Prompt caching: 4027 tokens                                   │
│ - Duration: 1.8s (first) / 1.4s (cached)                        │
│ - Cost: $0.0001 per request                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Studies Fetcher Lambda                                  │
│ - PubMed API search                                             │
│ - Duration: 2.1s                                                │
│ - Cost: $0.0001 per request                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Content Enricher Lambda ❌ PROBLEMA                     │
│ - Claude 3.5 Sonnet                                             │
│ - Duration: 119s (2 MINUTOS!)                                   │
│ - Tokens: 11,674 input + 4,011 output                           │
│ - Cost: $0.05 per request                                       │
│ - NO prompt caching                                             │
│ - Excede timeout de Vercel (60s)                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
                  ❌ 504 TIMEOUT

Total: 123s (FALLA)
Cost: $0.05 per request
```

---

## ✅ Arquitectura Propuesta (Moderna)

### Opción A: Streaming + Prompt Caching (RECOMENDADO)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER REQUEST: "saw palmetto"                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vercel Edge (Next.js API Route)                                 │
│ - Streaming response (no timeout!)                              │
│ - Server-Sent Events (SSE)                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─────────────────────────────────────────────┐
                     │                                             │
                     ▼                                             ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ PARALLEL STEP 1A:                │  │ PARALLEL STEP 1B:                │
│ Abbreviation Expansion           │  │ Check DynamoDB Cache             │
│ - Claude 3.5 Haiku               │  │ - TTL: 7 days                    │
│ - Prompt caching                 │  │ - Duration: 50ms                 │
│ - Duration: 1.4s (cached)        │  │ - Cost: $0.000001                │
└──────────────┬───────────────────┘  └──────────────┬───────────────────┘
               │                                      │
               │                                      │
               │                      ┌───────────────┘
               │                      │
               │                      ▼
               │              ┌────────────────┐
               │              │ Cache Hit?     │
               │              └───┬────────┬───┘
               │                  │        │
               │              YES │        │ NO
               │                  │        │
               │                  ▼        │
               │          ┌──────────────┐ │
               │          │ Return Cache │ │
               │          │ Duration: 50ms│ │
               │          │ Cost: $0     │ │
               │          └──────────────┘ │
               │                           │
               └───────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Studies Fetcher (Optimized)                             │
│ - PubMed API with retry logic                                   │
│ - Parallel fetch of study details                               │
│ - Duration: 1.5s (optimized)                                    │
│ - Cost: $0.0001                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Smart Content Generation (NUEVO)                        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3A. Summarize Studies (Claude 3.5 Haiku)                    │ │
│ │ - Input: 10 full studies (~8000 tokens)                     │ │
│ │ - Output: Concise summaries (~1500 tokens)                  │ │
│ │ - Duration: 2s                                               │ │
│ │ - Cost: $0.001                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3B. Generate Content (Claude 3.5 Haiku + Prompt Caching)   │ │
│ │ - System prompt: 3000 tokens (CACHED)                       │ │
│ │ - Input: Summaries (~1500 tokens)                           │ │
│ │ - Output: Enriched content (~2000 tokens)                   │ │
│ │ - Duration: 3s (first) / 1.5s (cached)                      │ │
│ │ - Cost: $0.002 (first) / $0.0002 (cached)                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3C. Stream Response to User (Progressive Enhancement)       │ │
│ │ - Stream basic info immediately (1s)                        │ │
│ │ - Stream benefits as they're generated (2s)                 │ │
│ │ - Stream studies as they're processed (3s)                  │ │
│ │ - Complete response (5s total)                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Cache Result in DynamoDB                                │
│ - TTL: 7 days                                                   │
│ - Duration: 100ms                                               │
│ - Cost: $0.000001                                               │
└─────────────────────────────────────────────────────────────────┘

Total: 5-8s (ÉXITO!)
Cost: $0.003 per request (first) / $0.0003 (cached)
Savings: 94% cost reduction vs current
```

---

## 🎯 Mejoras Clave

### 1. Streaming Response (Server-Sent Events)

**Problema actual:** Usuario espera 2 minutos sin feedback

**Solución:**
```typescript
// app/api/portal/enrich/route.ts
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send immediate response
      controller.enqueue(encoder.encode('data: {"status":"processing","step":"expansion"}\n\n'));
      
      // Step 1: Expansion
      const expansion = await expandAbbreviation(term);
      controller.enqueue(encoder.encode(`data: {"status":"processing","step":"studies","expansion":${JSON.stringify(expansion)}}\n\n`));
      
      // Step 2: Studies
      const studies = await fetchStudies(term);
      controller.enqueue(encoder.encode(`data: {"status":"processing","step":"enrichment","studiesCount":${studies.length}}\n\n`));
      
      // Step 3: Stream enriched content as it's generated
      await streamEnrichedContent(studies, (chunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      });
      
      controller.enqueue(encoder.encode('data: {"status":"complete"}\n\n'));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Beneficios:**
- ✅ No timeout (streaming mantiene conexión viva)
- ✅ UX mejorada (usuario ve progreso)
- ✅ Percepción de velocidad (primeros datos en 1s)

### 2. Two-Stage LLM Pipeline

**Problema actual:** 11,674 tokens de input → lento y caro

**Solución:**
```typescript
// Stage 1: Summarize studies (Haiku - fast & cheap)
async function summarizeStudies(studies: Study[]): Promise<string[]> {
  const summaries = await Promise.all(
    studies.map(async (study) => {
      const prompt = `Summarize this study in 2-3 sentences:
Title: ${study.title}
Abstract: ${study.abstract}

Focus on: main findings, sample size, key results.`;
      
      const response = await bedrockClient.send(new InvokeModelCommand({
        modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 150,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      }));
      
      return parseResponse(response);
    })
  );
  
  return summaries;
}

// Stage 2: Generate content with summaries (Haiku + caching)
async function generateContent(summaries: string[]): Promise<EnrichedContent> {
  const systemPrompt = `You are a supplement expert. Generate evidence-based content.
  
[... 3000 tokens of instructions and examples ...]`;

  const userPrompt = `Generate content for this supplement based on these study summaries:

${summaries.join('\n\n')}

Return JSON with: name, benefits, dosage, safety, interactions, studies.`;

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 3000,
      temperature: 0.3,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }, // CACHE THIS!
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  }));
  
  return parseResponse(response);
}
```

**Beneficios:**
- ✅ Reduce input de 11,674 → 4,500 tokens (60% reducción)
- ✅ Usa Haiku (10x más rápido que Sonnet)
- ✅ Prompt caching en ambas etapas
- ✅ Costo: $0.003 vs $0.05 (94% reducción)

### 3. Aggressive Caching Strategy

```typescript
// Multi-layer cache
const cacheStrategy = {
  // Layer 1: In-memory cache (fastest)
  memory: new Map<string, CachedContent>(), // TTL: 5 minutes
  
  // Layer 2: DynamoDB (fast)
  dynamodb: {
    table: 'suplementia-content-cache',
    ttl: 7 * 24 * 60 * 60, // 7 days
  },
  
  // Layer 3: CloudFront CDN (fastest for repeated requests)
  cdn: {
    cacheControl: 'public, max-age=3600, s-maxage=86400',
  },
};

async function getCachedOrGenerate(term: string): Promise<EnrichedContent> {
  // Check memory cache
  if (cacheStrategy.memory.has(term)) {
    return cacheStrategy.memory.get(term)!;
  }
  
  // Check DynamoDB
  const cached = await dynamodb.get({ supplementName: term });
  if (cached && !isExpired(cached)) {
    cacheStrategy.memory.set(term, cached);
    return cached;
  }
  
  // Generate new content
  const content = await generateContent(term);
  
  // Save to all cache layers
  cacheStrategy.memory.set(term, content);
  await dynamodb.put({ supplementName: term, ...content, ttl: Date.now() + cacheStrategy.dynamodb.ttl });
  
  return content;
}
```

**Beneficios:**
- ✅ Memory cache: 0ms latency
- ✅ DynamoDB cache: 50ms latency
- ✅ CDN cache: 10ms latency (para requests repetidos)
- ✅ 90%+ cache hit rate esperado

### 4. Parallel Processing

```typescript
async function enrichSupplement(term: string): Promise<EnrichedContent> {
  // Execute in parallel
  const [expansion, cachedContent] = await Promise.all([
    expandAbbreviation(term),
    checkCache(term),
  ]);
  
  // If cached, return immediately
  if (cachedContent) {
    return cachedContent;
  }
  
  // Fetch studies with expanded terms
  const searchTerms = [term, ...expansion.alternatives];
  const studiesResults = await Promise.all(
    searchTerms.map(t => fetchStudies(t))
  );
  
  // Merge and deduplicate studies
  const allStudies = deduplicateStudies(studiesResults.flat());
  
  // Summarize studies in parallel
  const summaries = await Promise.all(
    allStudies.map(s => summarizeStudy(s))
  );
  
  // Generate final content
  const content = await generateContent(summaries);
  
  // Cache result
  await saveToCache(term, content);
  
  return content;
}
```

**Beneficios:**
- ✅ Reduce tiempo total de 123s → 8s
- ✅ Mejor utilización de recursos
- ✅ Más resiliente a fallos individuales

---

## 💰 Análisis de Costos

### Arquitectura Actual
```
Por request (sin cache):
- Abbreviation expansion: $0.0001
- Studies fetcher: $0.0001
- Content enricher (Sonnet): $0.05
Total: $0.0502 per request

1000 requests/día = $50/día = $1,500/mes
```

### Arquitectura Propuesta
```
Por request (primera vez):
- Abbreviation expansion (Haiku + cache): $0.0001
- Studies fetcher: $0.0001
- Study summarization (Haiku): $0.001
- Content generation (Haiku + cache): $0.002
- DynamoDB write: $0.000001
Total: $0.0032 per request

Por request (cached - 90% de requests):
- DynamoDB read: $0.000001
Total: $0.000001 per request

1000 requests/día:
- 100 nuevos: 100 × $0.0032 = $0.32
- 900 cached: 900 × $0.000001 = $0.0009
Total: $0.32/día = $9.60/mes

Ahorro: $1,490/mes (99.4% reducción!)
```

---

## ⚡ Análisis de Performance

### Latencia por Componente

| Componente | Actual | Propuesta | Mejora |
|------------|--------|-----------|--------|
| Abbreviation expansion | 1.8s | 1.4s (cached) | 22% |
| Studies fetcher | 2.1s | 1.5s (parallel) | 29% |
| Content generation | 119s | 3s (Haiku + cache) | 97% |
| **Total (first request)** | **123s** | **6s** | **95%** |
| **Total (cached)** | **123s** | **0.05s** | **99.96%** |

### Throughput

| Métrica | Actual | Propuesta | Mejora |
|---------|--------|-----------|--------|
| Requests/segundo | 0.008 | 10 | 1250x |
| Concurrent users | 1 | 100+ | 100x |
| Cold start | 2s | 0.5s | 75% |

---

## 🏗️ Plan de Implementación

### Fase 1: Quick Wins (1-2 días)
```
✅ Prioridad Alta - Impacto Inmediato

1. Implementar DynamoDB cache check
   - Antes de generar, check cache
   - TTL: 7 días
   - Estimación: 2 horas

2. Reducir tokens en content-enricher
   - Resumir estudios antes de enviar
   - Reducir de 11,674 → 4,500 tokens
   - Estimación: 3 horas

3. Cambiar Sonnet → Haiku en content-enricher
   - 10x más rápido
   - 5x más barato
   - Estimación: 1 hora

Resultado: 119s → 15-20s (dentro de timeout)
Costo: $0.05 → $0.01 (80% reducción)
```

### Fase 2: Prompt Caching (2-3 días)
```
✅ Prioridad Alta - Máximo ROI

1. Implementar prompt caching en content-enricher
   - System prompt >3000 tokens
   - Cache TTL: 5 minutos
   - Estimación: 4 horas

2. Implementar two-stage pipeline
   - Stage 1: Summarize (Haiku)
   - Stage 2: Generate (Haiku + cache)
   - Estimación: 6 horas

Resultado: 15-20s → 5-8s (excelente UX)
Costo: $0.01 → $0.003 (70% reducción adicional)
```

### Fase 3: Streaming (3-4 días)
```
✅ Prioridad Media - Mejor UX

1. Implementar Server-Sent Events
   - Streaming response
   - Progressive enhancement
   - Estimación: 8 horas

2. Frontend updates
   - Handle SSE events
   - Show progress indicators
   - Estimación: 6 horas

Resultado: Percepción de velocidad (primeros datos en 1s)
UX: Excelente (usuario ve progreso)
```

### Fase 4: Optimizaciones Avanzadas (1 semana)
```
✅ Prioridad Baja - Optimización Final

1. Parallel processing
   - Parallel study fetching
   - Parallel summarization
   - Estimación: 6 horas

2. Memory cache layer
   - In-memory LRU cache
   - 5 min TTL
   - Estimación: 3 horas

3. CloudFront CDN
   - Cache static responses
   - Edge caching
   - Estimación: 4 horas

Resultado: 5-8s → 2-3s (primera vez) / 50ms (cached)
Costo: $0.003 → $0.001 (66% reducción adicional)
```

---

## 📊 Comparación Final

### Arquitectura Actual
```
❌ Latencia: 123s (TIMEOUT)
❌ Costo: $1,500/mes
❌ Throughput: 0.008 req/s
❌ UX: Mala (timeout, sin feedback)
❌ Escalabilidad: Limitada
```

### Arquitectura Propuesta (Fase 1)
```
✅ Latencia: 15-20s (dentro de timeout)
✅ Costo: $300/mes (80% reducción)
✅ Throughput: 3 req/s
✅ UX: Aceptable
✅ Escalabilidad: Buena
```

### Arquitectura Propuesta (Fase 2)
```
✅ Latencia: 5-8s (excelente)
✅ Costo: $90/mes (94% reducción)
✅ Throughput: 10 req/s
✅ UX: Buena
✅ Escalabilidad: Excelente
```

### Arquitectura Propuesta (Fase 3+4)
```
✅ Latencia: 2-3s primera vez / 50ms cached
✅ Costo: $30/mes (98% reducción)
✅ Throughput: 50+ req/s
✅ UX: Excelente (streaming, progreso)
✅ Escalabilidad: Ilimitada
```

---

## 🎯 Recomendación

**Implementar en orden:**

1. **Fase 1 (URGENTE)** - Resolver timeout inmediato
   - Tiempo: 1-2 días
   - Impacto: Sistema funcional
   
2. **Fase 2 (ALTA PRIORIDAD)** - Optimizar costos y velocidad
   - Tiempo: 2-3 días
   - Impacto: 94% reducción de costos, 5-8s latencia

3. **Fase 3 (MEDIA PRIORIDAD)** - Mejorar UX
   - Tiempo: 3-4 días
   - Impacto: Mejor experiencia de usuario

4. **Fase 4 (BAJA PRIORIDAD)** - Optimizaciones finales
   - Tiempo: 1 semana
   - Impacto: Sistema de clase mundial

**Total: 2-3 semanas para arquitectura completa**

---

## 📚 Stack Tecnológico Recomendado

```yaml
Frontend:
  - Next.js 14 (App Router)
  - Server-Sent Events (SSE)
  - React Suspense + Streaming

Backend:
  - Vercel Edge Functions (streaming)
  - AWS Lambda (compute)
  - DynamoDB (cache)
  - CloudFront (CDN)

LLM:
  - Claude 3.5 Haiku (primary)
  - Prompt Caching (90% cost reduction)
  - Two-stage pipeline

Monitoring:
  - CloudWatch Logs
  - X-Ray tracing
  - Custom metrics dashboard
```

---

**Autor:** Kiro AI  
**Fecha:** November 22, 2024  
**Status:** 📋 Propuesta lista para implementación
