# Tasks: Ranking Persistence Fix

## Task 1: Modificar /api/portal/enrich
**Archivo:** `app/api/portal/enrich/route.ts`
**Tiempo:** 5 minutos

```typescript
// Encontrar donde se llama al content-enricher (línea ~750)
const enrichResponse = await fetch(ENRICHER_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': correlationId,
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    supplementId: supplementName,
    category: category || 'general',
    forceRefresh: forceRefresh || false,
    studies, // CRITICAL: Pass real PubMed studies to Claude
    ranking: rankedData, // ← AGREGAR ESTA LÍNEA
    jobId,
  }),
  signal: AbortSignal.timeout(60000),
});
```

**Verificar:**
- ✅ `rankedData` ya está definido antes (línea ~810)
- ✅ Solo agregar una línea al body

## Task 2: Modificar content-enricher Lambda
**Archivo:** `backend/lambda/content-enricher/src/index.ts`
**Tiempo:** 10 minutos

### 2.1: Recibir ranking del request
```typescript
// Línea ~50 - Extraer del event
export const handler = async (event: any) => {
  const {
    supplementId,
    category = 'general',
    forceRefresh = false,
    studies = [],
    ranking = null,  // ← AGREGAR
    jobId,
  } = event;
```

### 2.2: Guardar ranking en cache
```typescript
// Línea ~200 - Donde se guarda en DynamoDB
const cacheData = {
  supplementId,
  data: enrichedData,
  metadata: {
    requestId,
    correlationId,
    tokensUsed: usage.totalTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    duration: Date.now() - startTime,
    hasRealData: true,
    studiesUsed: studies.length,
    // AGREGAR: Estudios con ranking
    ...(ranking ? {
      studies: {
        ranked: ranking,
        all: studies,
        total: studies.length,
      },
    } : {}),
  },
  timestamp: Date.now(),
  ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
};

await dynamodb.put({
  TableName: TABLE_NAME,
  Item: cacheData,
}).promise();
```

### 2.3: Deploy Lambda
```bash
cd backend/lambda/content-enricher
npm run build
npm run deploy
```

## Task 3: Testing
**Tiempo:** 10 minutos

### 3.1: Test con nuevo suplemento
```bash
# Invalidar cache
npx tsx scripts/invalidate-l-carnitine-cache.ts

# Regenerar
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"l-carnitine","forceRefresh":true}' \
  -s | jq '.data.studies.ranked.metadata'

# Esperado: { consensus: "...", confidenceScore: 85 }
```

### 3.2: Test desde frontend
```bash
# Buscar desde quiz
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category":"l-carnitina"}' \
  -s | jq '.recommendation._enrichment_metadata.studies.ranked'

# Esperado: { positive: [...], negative: [...], metadata: {...} }
```

### 3.3: Test de cache
```bash
# Segunda búsqueda (debe venir de cache)
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category":"l-carnitina"}' \
  -s | jq '{
    hasRanking: (.recommendation._enrichment_metadata.studies.ranked != null),
    positiveCount: (.recommendation._enrichment_metadata.studies.ranked.positive | length)
  }'

# Esperado: { hasRanking: true, positiveCount: 5 }
```

## Task 4: Regenerar Top 5
**Tiempo:** 10 minutos

```bash
# Ejecutar script de test
npx tsx scripts/test-regenerate-5.ts

# Verificar que todos tienen ranking
```

## Checklist

- [ ] Task 1: Modificar endpoint enrich
- [ ] Task 2.1: Recibir ranking en Lambda
- [ ] Task 2.2: Guardar ranking en cache
- [ ] Task 2.3: Deploy Lambda
- [ ] Task 3.1: Test nuevo suplemento
- [ ] Task 3.2: Test desde frontend
- [ ] Task 3.3: Test de cache
- [ ] Task 4: Regenerar top 5
- [ ] Commit y push

**Tiempo total estimado: 35 minutos**
