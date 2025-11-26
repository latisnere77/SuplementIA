# Root Cause Analysis: Search 404 Errors

## Problem Summary
Búsquedas directas (sin pasar por quiz) están fallando con errores 404 al intentar consultar el estado de enriquecimiento.

## Observed Behavior

### User Flow
1. Usuario busca "calcio" (español)
2. Autocomplete devuelve "Calcium" (inglés)
3. Usuario selecciona "Calcium"
4. Navegación a `/portal/results?q=Calcium&supplement=Calcium`
5. **ERROR**: Múltiples 404 en `/api/portal/enrichment-status/job_*`

### Error Logs
```
GET /api/portal/enrichment-status/job_1764164034180_kfdd7oxx9?supplement=Calcium 404
GET /api/portal/enrichment-status/job_1764164034188_xf4g0ejkm?supplement=Calcium 404
GET /api/portal/enrichment-status/job_1764164035189_02vchrk76?supplement=Calcium 404
```

## Root Cause

### Issue 1: JobId Generation Mismatch
**Location**: `app/portal/results/page.tsx` línea ~520

```typescript
// ❌ PROBLEMA: Se genera jobId en el cliente
const jobId = searchParams.get('id') || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Problema**: 
- Cuando no hay `id` en searchParams (búsqueda directa), se genera un jobId en el cliente
- Este jobId **nunca se registra en el servidor** (job-store)
- Cuando se intenta hacer polling a `/api/portal/enrichment-status/${jobId}`, el servidor devuelve 404 porque el job no existe

### Issue 2: Missing Job Creation for Direct Searches
**Location**: `app/portal/results/page.tsx` función `generateRecommendation`

**Flujo actual**:
1. Usuario hace búsqueda directa → `results?q=Calcium`
2. Cliente genera jobId local
3. Cliente llama a `/api/portal/quiz` con el jobId
4. **PERO**: `/api/portal/quiz` no usa el jobId del cliente, genera uno nuevo
5. Cliente intenta hacer polling con su jobId local (que no existe en servidor)
6. Servidor devuelve 404

### Issue 3: Async Enrichment Not Triggered
**Location**: `app/portal/results/page.tsx`

El código tiene lógica para `AsyncEnrichmentLoader` pero no se está usando para búsquedas directas:

```typescript
const [useAsyncEnrichment, setUseAsyncEnrichment] = useState(false);
const [asyncSupplementName, setAsyncSupplementName] = useState<string | null>(null);
```

Estos estados nunca se actualizan en el flujo de búsqueda directa.

## Impact

### Severity: HIGH
- **100% de búsquedas directas fallan**
- Usuario ve pantalla de carga infinita seguida de error 404
- Experiencia de usuario completamente rota para este flujo

### Affected Flows
1. ✅ Quiz flow → Funciona (usa jobId del servidor)
2. ❌ Direct search → Falla (genera jobId local que no existe)
3. ❌ Autocomplete selection → Falla (mismo problema)

## Solution Requirements

### Must Have
1. **Unified Job Creation**: Todas las búsquedas deben crear job en servidor ANTES de polling
2. **Consistent JobId**: Cliente debe usar jobId devuelto por servidor, no generar uno local
3. **Async Enrichment**: Búsquedas directas deben usar `/api/portal/enrich-async` para crear job

### Should Have
1. **Better Error Handling**: Distinguir entre "job no existe" vs "job expiró"
2. **Retry Logic**: Reintentar con nuevo job si el actual falla
3. **Loading States**: Mostrar progreso durante enriquecimiento

## Proposed Solution

### Option A: Use Async Enrichment for Direct Searches (RECOMMENDED)
**Pros**:
- Reutiliza infraestructura existente (`AsyncEnrichmentLoader`)
- Consistente con arquitectura async
- Mejor UX con estados de progreso

**Cons**:
- Requiere cambios en `results/page.tsx`

**Implementation**:
```typescript
// En generateRecommendation(), detectar búsqueda directa
if (query && !jobId) {
  // Activar async enrichment
  setUseAsyncEnrichment(true);
  setAsyncSupplementName(searchTerm);
  setIsLoading(false); // AsyncEnrichmentLoader maneja su propio loading
  return;
}
```

### Option B: Sync Job Creation Before Polling
**Pros**:
- Cambio mínimo
- Mantiene flujo actual

**Cons**:
- Duplica lógica de creación de jobs
- No aprovecha async infrastructure

## Next Steps

1. ✅ Documentar root cause
2. ⏳ Implementar Option A (async enrichment)
3. ⏳ Agregar tests para búsqueda directa
4. ⏳ Validar en staging
5. ⏳ Deploy a producción

## Related Files
- `app/portal/results/page.tsx` - Main results page
- `components/portal/AsyncEnrichmentLoader.tsx` - Async enrichment component
- `app/api/portal/enrich-async/route.ts` - Job creation endpoint
- `app/api/portal/enrichment-status/[id]/route.ts` - Status polling endpoint
- `lib/portal/job-store.ts` - In-memory job storage

## Timeline
- **Discovery**: 2024-11-26 (hoy)
- **Fix**: 2024-11-26 (hoy)
- **Testing**: 2024-11-26 (hoy)
- **Deploy**: 2024-11-26 (hoy)
