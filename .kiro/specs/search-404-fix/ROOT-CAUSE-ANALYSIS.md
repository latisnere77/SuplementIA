# Análisis de Causa Raíz: Error 404 en Búsquedas

## 🔴 Problema Identificado

Las búsquedas en producción están fallando con error 404 en el endpoint `/api/portal/enrichment-status/[id]`.

### Evidencia de Logs de Producción

```
GET https://www.suplementai.com/api/portal/enrichment-status/rec_1764154990810_qjmy32bfy?supplement=Calcium 404 (Not Found)
GET https://www.suplementai.com/api/portal/enrichment-status/rec_1764154991275_x3r8iuton?supplement=Calcium 404 (Not Found)
GET https://www.suplementai.com/api/portal/enrichment-status/rec_1764154990801_5p1jjal04?supplement=Calcium 404 (Not Found)
```

## 🔍 Causa Raíz

### Problema 1: Desconexión de IDs

El sistema tiene dos tipos de IDs que no están sincronizados:

1. **Recommendation IDs** (`rec_*`): Generados en el frontend y en `/api/portal/quiz`
2. **Job IDs** (`job_*`): Generados en `/api/portal/enrich-async` y almacenados en job-store

**Flujo Actual (ROTO):**
```
Usuario busca "Calcium"
  ↓
Frontend genera: rec_1764154990810_qjmy32bfy
  ↓
Frontend hace polling: /api/portal/enrichment-status/rec_1764154990810_qjmy32bfy
  ↓
Endpoint busca en job-store con ID: rec_1764154990810_qjmy32bfy
  ↓
❌ No encuentra el job (porque job-store usa job_* IDs)
  ↓
Retorna 404
```

### Problema 2: Endpoint enrichment-status Espera job_* IDs

El código en `app/api/portal/enrichment-status/[id]/route.ts`:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;  // ← Espera un job_* ID
  
  // Check if job exists in store
  const job = getJob(jobId);  // ← Busca en job-store con el ID
  
  if (!job) {
    // ❌ Retorna 404 si no encuentra el job
    return NextResponse.json(response, { status: 404 });
  }
}
```

### Problema 3: Frontend Usa rec_* IDs para Polling

El código en `app/portal/results/page.tsx`:

```typescript
// Línea 442
const recommendationId = searchParams.get('id') || 
  `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Línea 680 - Hace polling con rec_* ID
const response = await fetch(
  `/api/portal/enrichment-status/${recommendationId}?supplement=${encodeURIComponent(supplement)}`
);
```

## 🎯 Soluciones Propuestas

### Opción A: Usar job_* IDs en Todo el Flujo (RECOMENDADA)

**Ventajas:**
- Consistencia total en el sistema
- Aprovecha el job-store existente
- Mejor trazabilidad

**Cambios Necesarios:**

1. **Frontend (`app/portal/results/page.tsx`):**
   - Cambiar generación de ID de `rec_*` a `job_*`
   - Usar el `jobId` retornado por `/api/portal/quiz` para polling

2. **Backend (`app/api/portal/quiz/route.ts`):**
   - Generar `job_*` ID al inicio
   - Retornar `jobId` en la respuesta
   - Almacenar en job-store inmediatamente

3. **Endpoint enrichment-status:**
   - Ya está configurado correctamente para job_* IDs
   - No requiere cambios

### Opción B: Mapear rec_* a job_* IDs

**Ventajas:**
- Mantiene compatibilidad con código existente
- Cambios mínimos

**Desventajas:**
- Requiere tabla de mapeo adicional
- Más complejidad
- Posibles race conditions

### Opción C: Eliminar Polling y Usar Respuesta Síncrona

**Ventajas:**
- Simplifica el flujo
- Elimina necesidad de job-store para búsquedas simples

**Desventajas:**
- Puede causar timeouts en búsquedas complejas
- Peor experiencia de usuario

## 📋 Plan de Acción Recomendado

### Fase 1: Fix Inmediato (Opción A)

1. **Modificar `app/portal/results/page.tsx`:**
   ```typescript
   // Cambiar línea 442
   const jobId = searchParams.get('id') || 
     `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   // Cambiar línea 680
   const response = await fetch(
     `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(supplement)}`
   );
   ```

2. **Modificar `app/api/portal/quiz/route.ts`:**
   ```typescript
   // Al inicio del handler
   const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   // Almacenar en job-store inmediatamente
   createJob(jobId, {
     status: 'processing',
     supplementName: category,
     createdAt: Date.now(),
   });
   
   // Retornar jobId en respuesta
   return NextResponse.json({
     success: true,
     jobId,  // ← Agregar esto
     recommendation_id: jobId,  // ← Usar mismo ID
     // ... resto de la respuesta
   });
   ```

3. **Actualizar job-store cuando se complete:**
   ```typescript
   // En /api/portal/enrich-async o donde se procese
   updateJob(jobId, {
     status: 'completed',
     recommendation: enrichedData,
     completedAt: Date.now(),
   });
   ```

### Fase 2: Testing

1. Probar búsqueda de "Calcium" en local
2. Verificar que polling funciona correctamente
3. Verificar que no hay 404s
4. Probar con múltiples búsquedas simultáneas

### Fase 3: Deployment

1. Deploy a staging
2. Smoke tests
3. Deploy a producción con monitoreo
4. Rollback plan listo

## 🔧 Archivos a Modificar

1. `app/portal/results/page.tsx` - Cambiar rec_* a job_*
2. `app/api/portal/quiz/route.ts` - Generar job_* y almacenar en job-store
3. `app/api/portal/enrich-async/route.ts` - Actualizar job-store al completar
4. Tests correspondientes

## ⚠️ Consideraciones

- **Backward Compatibility:** URLs existentes con `?id=rec_*` dejarán de funcionar
  - Solución: Agregar fallback que detecte rec_* y genere nueva búsqueda
  
- **Cache:** localStorage puede tener rec_* IDs cacheados
  - Solución: Limpiar cache o agregar migración

- **Analytics:** Logs existentes usan rec_* IDs
  - Solución: Mantener ambos IDs en logs durante transición

## 📊 Métricas de Éxito

- ✅ 0 errores 404 en `/api/portal/enrichment-status`
- ✅ Polling funciona correctamente
- ✅ Búsquedas se completan exitosamente
- ✅ Tiempo de respuesta < 5s para búsquedas simples
- ✅ No hay regresiones en funcionalidad existente

## 🚀 Timeline Estimado

- **Fix Inmediato:** 2-3 horas
- **Testing:** 1-2 horas
- **Deployment:** 1 hora
- **Total:** 4-6 horas

---

**Fecha:** 2024-11-26
**Prioridad:** 🔴 CRÍTICA
**Impacto:** Alto - Afecta todas las búsquedas en producción
