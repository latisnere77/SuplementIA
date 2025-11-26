# Fix Plan: Search 404 Errors

## Executive Summary
Implementar async enrichment para búsquedas directas, reutilizando la infraestructura existente de `AsyncEnrichmentLoader`.

## Implementation Strategy

### Phase 1: Enable Async Enrichment for Direct Searches
**File**: `app/portal/results/page.tsx`

**Changes**:
1. Detectar búsqueda directa (query sin jobId)
2. Activar `AsyncEnrichmentLoader` en lugar de llamar a `/api/portal/quiz`
3. Manejar resultado de enrichment

**Code Changes**:
```typescript
// En generateRecommendation(), después de searchSupplement
if (isIngredientSearch) {
  const searchResult = await searchSupplement(normalizedQuery);
  if (searchResult.found) {
    searchTerm = searchResult.supplementName;
    console.log(`✅ Supplement found: "${normalizedQuery}" → "${searchTerm}"`);
    
    // ✅ NEW: Activar async enrichment para búsquedas directas
    console.log('[Direct Search] Activating async enrichment for:', searchTerm);
    setAsyncSupplementName(searchTerm);
    setUseAsyncEnrichment(true);
    setIsLoading(false); // AsyncEnrichmentLoader maneja su propio loading
    return; // Exit early - AsyncEnrichmentLoader tomará el control
  }
}
```

### Phase 2: Handle Enrichment Completion
**File**: `app/portal/results/page.tsx`

**Changes**:
1. Implementar `handleEnrichmentComplete` callback
2. Guardar recommendation en estado
3. Actualizar URL con jobId

**Code Changes**:
```typescript
// Callback para cuando async enrichment completa
const handleEnrichmentComplete = (enrichmentData: any) => {
  console.log('[Async Enrichment] Completed:', enrichmentData);
  
  if (enrichmentData.success && enrichmentData.data) {
    // Guardar recommendation
    setRecommendation(enrichmentData.data);
    setError(null);
    setUseAsyncEnrichment(false);
    
    // Actualizar URL con jobId para compartir
    if (enrichmentData.data.recommendation_id) {
      const newUrl = `/portal/results?id=${enrichmentData.data.recommendation_id}&supplement=${encodeURIComponent(asyncSupplementName || '')}`;
      window.history.replaceState({}, '', newUrl);
    }
  }
};

const handleEnrichmentError = (error: string) => {
  console.error('[Async Enrichment] Error:', error);
  setError(error);
  setUseAsyncEnrichment(false);
  setIsLoading(false);
};
```

### Phase 3: Update Render Logic
**File**: `app/portal/results/page.tsx`

**Changes**:
1. Mostrar `AsyncEnrichmentLoader` cuando `useAsyncEnrichment === true`
2. Mantener lógica existente para otros casos

**Code Changes**:
```typescript
// En el return del componente, ANTES del loading spinner
if (useAsyncEnrichment && asyncSupplementName) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <AsyncEnrichmentLoader
          supplementName={asyncSupplementName}
          onComplete={handleEnrichmentComplete}
          onError={handleEnrichmentError}
        />
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
1. Test direct search flow
2. Test async enrichment activation
3. Test enrichment completion handling

### Integration Tests
1. Test full flow: search → enrichment → results
2. Test error handling
3. Test retry logic

### Manual Testing
1. ✅ Búsqueda directa: "calcio" → "Calcium"
2. ✅ Búsqueda con autocomplete
3. ✅ Búsqueda con categoría
4. ✅ Error handling (supplement no encontrado)
5. ✅ Retry después de error

## Rollout Plan

### Stage 1: Development
- [ ] Implementar cambios en `results/page.tsx`
- [ ] Agregar logging detallado
- [ ] Test local

### Stage 2: Staging
- [ ] Deploy a staging
- [ ] Smoke tests
- [ ] Performance tests

### Stage 3: Production
- [ ] Deploy a producción
- [ ] Monitor logs
- [ ] Validate metrics

## Success Criteria

### Functional
- ✅ Búsquedas directas completan sin 404
- ✅ AsyncEnrichmentLoader se activa correctamente
- ✅ Recommendation se guarda en estado
- ✅ URL se actualiza con jobId

### Performance
- ✅ Tiempo de respuesta < 5s para enrichment
- ✅ No memory leaks en polling
- ✅ Proper cleanup on unmount

### User Experience
- ✅ Loading states claros
- ✅ Error messages útiles
- ✅ Retry funciona correctamente

## Rollback Plan

### If Issues Detected
1. Revert cambios en `results/page.tsx`
2. Restaurar flujo anterior (quiz endpoint)
3. Investigar root cause

### Monitoring
- CloudWatch logs para errores
- Sentry para exceptions
- Analytics para success rate

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Analysis | 30 min | ✅ Complete |
| Implementation | 1 hour | ⏳ In Progress |
| Testing | 30 min | ⏳ Pending |
| Staging Deploy | 15 min | ⏳ Pending |
| Production Deploy | 15 min | ⏳ Pending |
| **Total** | **2.5 hours** | |

## Risk Assessment

### Low Risk
- Cambios aislados a un flujo específico
- Reutiliza infraestructura existente y probada
- Fácil rollback

### Mitigation
- Feature flag para activar/desactivar
- Extensive logging
- Gradual rollout

## Dependencies

### Code
- ✅ `AsyncEnrichmentLoader` - Ya existe y funciona
- ✅ `/api/portal/enrich-async` - Ya existe y funciona
- ✅ `/api/portal/enrichment-status/[id]` - Ya existe y funciona

### Infrastructure
- ✅ job-store - Ya implementado
- ✅ Lambda enrichment - Ya desplegado
- ✅ Caching - Ya configurado

## Notes

### Why This Approach?
1. **Reutiliza código existente**: `AsyncEnrichmentLoader` ya maneja polling, retry, errors
2. **Consistente con arquitectura**: Todas las búsquedas usan async pattern
3. **Mejor UX**: Loading states, progress, retry
4. **Fácil de mantener**: Un solo flujo para todas las búsquedas

### Alternative Considered
- Sync job creation before polling → Rechazado (duplica lógica)
- Fix jobId generation → Rechazado (no aprovecha async infrastructure)

## Next Actions
1. ✅ Documentar root cause
2. ✅ Crear fix plan
3. ⏳ Implementar cambios
4. ⏳ Test local
5. ⏳ Deploy staging
6. ⏳ Deploy production
