# Ranking Persistence Fix

## Problema

El sistema de ranking inteligente funciona correctamente:
- ✅ Studies-fetcher devuelve ranking (5 positivos + 5 negativos)
- ✅ Frontend muestra ranking correctamente
- ❌ **El ranking NO se guarda en el cache de DynamoDB**

Cuando un usuario busca un suplemento regenerado, el ranking no aparece porque no está en el cache.

## Causa Raíz

El content-enricher Lambda guarda el contenido enriquecido en DynamoDB, pero NO recibe ni guarda el ranking porque:
1. El ranking viene de studies-fetcher
2. El endpoint `/api/portal/enrich` agrega el ranking a la respuesta
3. Pero el content-enricher ya guardó en cache ANTES de que se agregue el ranking

**Flujo actual:**
```
studies-fetcher → ranking
       ↓
content-enricher → guarda en cache (SIN ranking)
       ↓
/api/portal/enrich → agrega ranking a response (pero ya se guardó)
       ↓
Frontend recibe ranking ✅
       ↓
Próxima búsqueda → lee cache (SIN ranking) ❌
```

## Solución Simple

**Opción 1: Pasar ranking al content-enricher (RECOMENDADA)**

Modificar el endpoint `/api/portal/enrich` para pasar el ranking al content-enricher:

```typescript
// En /api/portal/enrich
const enrichResponse = await fetch(ENRICHER_API_URL, {
  body: JSON.stringify({
    supplementId: supplementName,
    studies,
    ranking: rankedData,  // ← NUEVO: Pasar ranking
  }),
});
```

El content-enricher lo guarda en metadata:
```typescript
// En content-enricher Lambda
const cacheData = {
  supplementId,
  data: enrichedContent,
  metadata: {
    ...metadata,
    studies: {
      ranked: ranking,  // ← NUEVO: Guardar ranking
      all: studies,
      total: studies.length
    }
  }
};
```

## Criterios de Aceptación

1. ✅ Ranking se guarda en DynamoDB cache
2. ✅ Próximas búsquedas devuelven ranking desde cache
3. ✅ No rompe funcionalidad existente
4. ✅ Backward compatible (si no hay ranking, funciona igual)

## No Hacer

- ❌ No crear nueva tabla de DynamoDB
- ❌ No modificar estructura de cache existente
- ❌ No agregar complejidad innecesaria
- ❌ No cambiar flujo de estudios

## Testing

```bash
# 1. Regenerar un suplemento
curl -X POST /api/portal/enrich -d '{"supplementName":"vitamin-d","forceRefresh":true}'

# 2. Verificar que tiene ranking
curl -X POST /api/portal/quiz -d '{"category":"vitamin d"}' | jq '.recommendation._enrichment_metadata.studies.ranked'

# Esperado: { positive: [...], negative: [...], metadata: {...} }
```
