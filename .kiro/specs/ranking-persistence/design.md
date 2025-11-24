# Design: Ranking Persistence

## Arquitectura

### Cambio 1: Endpoint /api/portal/enrich
**Archivo:** `app/api/portal/enrich/route.ts`

```typescript
// Después de obtener studiesData y antes de llamar content-enricher
const rankedData = studiesData?.data?.ranked || null;

// Pasar ranking al content-enricher
const enrichResponse = await fetch(ENRICHER_API_URL, {
  body: JSON.stringify({
    supplementId: supplementName,
    category: category || 'general',
    studies,
    ranking: rankedData,  // ← NUEVO
  }),
});
```

### Cambio 2: Content-Enricher Lambda
**Archivo:** `backend/lambda/content-enricher/src/index.ts`

```typescript
// Recibir ranking del request
const { supplementId, studies, ranking } = event;

// Guardar en cache con ranking
const cacheData = {
  supplementId,
  data: enrichedContent,
  metadata: {
    ...existingMetadata,
    // NUEVO: Agregar estudios con ranking
    ...(ranking ? {
      studies: {
        ranked: ranking,
        all: studies,
        total: studies.length
      }
    } : {})
  },
  timestamp: Date.now(),
  ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 días
};

await dynamodb.put({ TableName, Item: cacheData });
```

## Flujo Corregido

```
┌─────────────────────────────────────────────────────────┐
│ 1. studies-fetcher                                      │
│    → Devuelve: { studies: [...], ranked: {...} }       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. /api/portal/enrich                                   │
│    → Extrae: rankedData = studiesData.data.ranked      │
│    → Pasa a content-enricher: { studies, ranking }     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. content-enricher                                     │
│    → Genera contenido                                   │
│    → Guarda en cache CON ranking ✅                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Próxima búsqueda                                     │
│    → Lee cache                                          │
│    → Tiene ranking ✅                                   │
└─────────────────────────────────────────────────────────┘
```

## Estructura de Cache

```json
{
  "supplementId": "vitamin-d",
  "data": {
    "description": "...",
    "mechanisms": [...],
    "worksFor": [...]
  },
  "metadata": {
    "requestId": "...",
    "tokensUsed": 12000,
    "studies": {
      "ranked": {
        "positive": [
          {
            "pmid": "12345",
            "title": "...",
            "sentiment": "positive",
            "sentimentScore": 0.85
          }
        ],
        "negative": [...],
        "metadata": {
          "consensus": "strong_positive",
          "confidenceScore": 85
        }
      },
      "all": [...],
      "total": 10
    }
  },
  "timestamp": 1732345678,
  "ttl": 1732950478
}
```

## Backward Compatibility

Si no hay ranking (estudios viejos o sin ranking):
```typescript
// En content-enricher
...(ranking ? {
  studies: { ranked: ranking, all: studies, total: studies.length }
} : {})
```

Esto asegura que:
- ✅ Nuevos datos tienen ranking
- ✅ Datos viejos siguen funcionando
- ✅ No rompe nada existente

## Rollback

Si algo falla:
```bash
# Revertir cambios en content-enricher
git revert <commit-hash>
cd backend/lambda/content-enricher
npm run deploy

# Revertir cambios en endpoint
git revert <commit-hash>
git push origin main
```

Cache viejo sigue funcionando sin ranking.
