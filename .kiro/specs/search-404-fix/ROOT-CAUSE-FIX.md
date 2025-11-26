# Root Cause Fix - Search 404 Error

## Problema Identificado

**Error**: `/api/portal/enrichment-status/rec_*` retorna 404

**Causa Raíz**: Mismatch de prefijos de ID
- El sistema genera `jobId` con prefijo `job_*`
- Pero cuando el backend retorna una recomendación sin `recommendation_id`, el frontend generaba uno con prefijo `rec_*`
- El endpoint `enrichment-status` busca por el ID pero no lo encuentra porque usa prefijo diferente

## Flujo del Problema

1. Usuario busca "calcio"
2. Frontend genera `jobId = job_1764163668870_xxx`
3. Llama a `/api/portal/quiz` con ese jobId
4. Backend retorna recomendación sin `recommendation_id`
5. Frontend genera `recommendation_id = rec_1764163668870_xxx` ❌ (PROBLEMA)
6. Página results intenta hacer polling con `rec_*`
7. Endpoint enrichment-status no encuentra el job → 404

## Solución Implementada

**Archivo**: `app/portal/results/page.tsx` línea 1062

**Antes**:
```typescript
if (!data.recommendation.recommendation_id) {
  data.recommendation.recommendation_id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

**Después**:
```typescript
if (!data.recommendation.recommendation_id) {
  data.recommendation.recommendation_id = jobId; // Use existing jobId
}
```

## Impacto

✅ **Consistencia de IDs**: Ahora todos los IDs usan el mismo `jobId` generado al inicio
✅ **Polling funciona**: enrichment-status puede encontrar el job
✅ **Cache funciona**: El cache usa el mismo ID consistente
✅ **No breaking changes**: Solo afecta el caso donde falta recommendation_id

## Validación

Después del fix, el flujo correcto es:

1. Usuario busca "calcio"
2. Frontend genera `jobId = job_1764163668870_xxx`
3. Llama a `/api/portal/quiz` con ese jobId
4. Backend retorna recomendación sin `recommendation_id`
5. Frontend usa el mismo `jobId` como `recommendation_id` ✅
6. Página results hace polling con `job_*`
7. Endpoint enrichment-status encuentra el job → 200 OK ✅

## Testing

Para verificar el fix:
1. Buscar cualquier suplemento (ej: "vitamina d")
2. Verificar en Network tab que NO hay 404 en enrichment-status
3. Verificar que la recomendación se muestra correctamente
4. Verificar en Console que los IDs son consistentes
