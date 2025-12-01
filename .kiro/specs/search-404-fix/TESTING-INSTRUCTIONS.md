# Testing Instructions: Search 404 Fix

## Quick Test (2 minutos)

### Test 1: Búsqueda Directa con Autocomplete
1. Ir a `/portal`
2. Escribir "calcio" en el buscador
3. Seleccionar "Calcium" del autocomplete
4. **Verificar**:
   - ✅ Se muestra `AsyncEnrichmentLoader` (spinner con mensaje)
   - ✅ NO hay errores 404 en la consola
   - ✅ Después de ~3-5s, se muestra la recomendación
   - ✅ URL se actualiza a `/portal/results?id=job_*&supplement=Calcium`

### Test 2: Búsqueda Directa Manual
1. Ir directamente a `/portal/results?q=Calcium&supplement=Calcium`
2. **Verificar**:
   - ✅ Se muestra `AsyncEnrichmentLoader`
   - ✅ NO hay errores 404 en la consola
   - ✅ Se muestra la recomendación

## Detailed Testing (10 minutos)

### Scenario 1: Happy Path - Búsqueda Exitosa
**Steps**:
1. Abrir DevTools → Console
2. Ir a `/portal`
3. Buscar "magnesium"
4. Seleccionar del autocomplete

**Expected Console Logs**:
```
✅ Supplement found: "magnesium" → "Magnesium"
[Direct Search] Activating async enrichment for: Magnesium
[Render] Branch: ASYNC_ENRICHMENT
🚀 Starting async enrichment for: Magnesium
✅ Enrichment started - Job ID: job_*
🔍 Polling status...
✅ Enrichment completed!
[Async Enrichment] Completed
```

**Expected UI**:
- Loading spinner con mensaje "Analizando Magnesium..."
- Después de 3-5s: Recomendación completa
- URL actualizada con jobId

**Expected Network**:
- POST `/api/portal/enrich-async` → 202
- GET `/api/portal/enrichment-status/job_*` → 202 (processing)
- GET `/api/portal/enrichment-status/job_*` → 200 (completed)

### Scenario 2: Error Handling - Supplement No Encontrado
**Steps**:
1. Buscar "xyz123invalid"
2. Presionar Enter

**Expected**:
- Error message: "No encontramos estudios científicos..."
- Sugerencias de supplements alternativos
- Botón para nueva búsqueda

### Scenario 3: Retry After Error
**Steps**:
1. Simular error (desconectar internet)
2. Buscar "vitamin d"
3. Esperar error
4. Reconectar internet
5. Click en "Reintentar"

**Expected**:
- Error message con botón "Reintentar"
- Al hacer click: Nuevo intento de enrichment
- Éxito en segundo intento

### Scenario 4: Multiple Searches
**Steps**:
1. Buscar "omega 3"
2. Esperar resultado
3. Buscar "vitamin c"
4. Esperar resultado

**Expected**:
- Cada búsqueda crea nuevo job
- No hay memory leaks
- Polling anterior se cancela

## Console Checks

### ✅ Good Signs
```
[Direct Search] Activating async enrichment for: Calcium
🚀 Starting async enrichment for: Calcium
✅ Enrichment started - Job ID: job_1764164034180_abc123
🔍 Polling status (1/60)...
📊 Status: processing (HTTP 202)
🔍 Polling status (2/60)...
✅ Enrichment completed!
[Async Enrichment] Completed
```

### ❌ Bad Signs (Should NOT See)
```
❌ GET /api/portal/enrichment-status/job_* 404
❌ Job not found
❌ Invalid response: {status: 404}
❌ Polling error
```

## Network Tab Checks

### Expected Requests
1. **POST** `/api/portal/enrich-async`
   - Status: 202 Accepted
   - Response: `{ jobId: "job_*", pollUrl: "/api/portal/enrichment-status/job_*" }`

2. **GET** `/api/portal/enrichment-status/job_*` (multiple times)
   - Status: 202 (processing) → 200 (completed)
   - Response: `{ status: "processing" }` → `{ status: "completed", recommendation: {...} }`

### Should NOT See
- ❌ 404 errors en `/api/portal/enrichment-status/*`
- ❌ 500 errors
- ❌ Requests sin jobId

## Performance Checks

### Timing
- Initial load: < 1s
- Enrichment: 3-5s (normal), < 10s (max)
- Polling interval: 2s
- Total time to result: < 10s

### Memory
- No memory leaks after multiple searches
- Polling cleanup on unmount
- No zombie intervals

## Edge Cases

### Test 1: Direct URL Access
**URL**: `/portal/results?q=Calcium&supplement=Calcium`
**Expected**: AsyncEnrichmentLoader activates, enrichment completes

### Test 2: Missing Supplement Parameter
**URL**: `/portal/results?q=Calcium`
**Expected**: Uses `q` parameter as fallback

### Test 3: Invalid Supplement
**URL**: `/portal/results?q=xyz123invalid`
**Expected**: Error message with suggestions

### Test 4: Expired Job
**URL**: `/portal/results?id=job_old_expired`
**Expected**: Error message, option to retry

## Browser Compatibility

### Test Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Android Chrome

## Regression Tests

### Ensure These Still Work
- [ ] Quiz flow → results
- [ ] Category search
- [ ] Cached results
- [ ] Share URL
- [ ] Paywall modal

## Automated Tests (Future)

### Unit Tests
```typescript
describe('Direct Search Flow', () => {
  it('should activate async enrichment for direct searches', () => {
    // Test implementation
  });
  
  it('should handle enrichment completion', () => {
    // Test implementation
  });
  
  it('should handle enrichment errors', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('Search to Results Flow', () => {
  it('should complete full search flow without 404s', async () => {
    // Test implementation
  });
});
```

## Monitoring After Deploy

### CloudWatch Logs
```
Filter: [event = "ENRICHMENT_STATUS_CHECK"]
Expected: No 404 errors for new jobs
```

### Sentry
```
Filter: AsyncEnrichmentLoader errors
Expected: < 1% error rate
```

### Analytics
```
Metric: Direct search success rate
Expected: > 95%
```

## Rollback Criteria

### Trigger Rollback If
- ❌ 404 error rate > 5%
- ❌ Enrichment failure rate > 10%
- ❌ Average enrichment time > 15s
- ❌ Memory leaks detected
- ❌ User complaints > 5

## Success Criteria

### Must Have
- ✅ 0% 404 errors on enrichment-status endpoint
- ✅ Direct searches complete successfully
- ✅ No console errors
- ✅ Proper loading states

### Nice to Have
- ✅ < 5s average enrichment time
- ✅ Smooth UX transitions
- ✅ Helpful error messages
- ✅ Retry works reliably

## Test Report Template

```markdown
## Test Report: Search 404 Fix

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Local/Staging/Production]

### Test Results
- [ ] Búsqueda directa: PASS/FAIL
- [ ] Autocomplete: PASS/FAIL
- [ ] Error handling: PASS/FAIL
- [ ] Retry: PASS/FAIL
- [ ] Performance: PASS/FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Additional observations]

### Recommendation
- [ ] Ready for production
- [ ] Needs fixes
- [ ] Needs more testing
```

## Quick Validation Commands

### Check for 404s in logs
```bash
# Local
grep "404" .next/server.log | grep "enrichment-status"

# Production (CloudWatch)
aws logs filter-log-events \
  --log-group-name /aws/lambda/enrichment-status \
  --filter-pattern "404"
```

### Check success rate
```bash
# Count successful enrichments
grep "Enrichment completed" logs.txt | wc -l

# Count failed enrichments
grep "Enrichment failed" logs.txt | wc -l
```

## Contact

**Questions?** Check:
- [Root Cause Analysis](./ROOT-CAUSE-ANALYSIS.md)
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)
- [AsyncEnrichmentLoader Code](../../components/portal/AsyncEnrichmentLoader.tsx)
