# 🔍 Diagnóstico: 404 en /api/portal/recommendation/[id]

## 🚨 Error Observado

```
/api/portal/recommendation/job_1764002924974_2vxzlp9fs:1  
Failed to load resource: the server responded with a status of 404 ()
❌ Invalid response: Object
```

## 🔎 Análisis del Problema

### 1. **Flujo Actual (ROTO)**

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/portal/quiz                             │
│ - Envía búsqueda de suplemento                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: /api/portal/recommend                              │
│ - Retorna: recommendation_id = "job_1764002924974_2vxzlp9fs"│
│ - Status: 202 (Accepted)                                    │
│ - statusUrl: "/api/portal/enrichment-status/[id]"          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Intenta polling                                   │
│ GET /api/portal/recommendation/job_1764002924974_2vxzlp9fs  │
│                                                              │
│ ❌ PROBLEMA: Este endpoint NO existe o está roto            │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Código del Endpoint Problemático**

**Archivo**: `app/api/portal/recommendation/[id]/route.ts`

```typescript
export async function GET(request: NextRequest, context: RouteContext) {
  const recommendationId = context.params.id;
  
  // ❌ PROBLEMA: Usa cache en memoria que NO persiste en serverless
  const cacheKey = `recommendation:${recommendationId}`;
  const cache = (global as any).__recommendationCache as Map<string, any> | undefined;

  if (!cache || !cache.has(cacheKey)) {
    // ❌ Siempre retorna 404 porque el cache nunca existe
    return NextResponse.json(
      {
        success: false,
        status: 'not_found',
        message: 'Recommendation not found. It may have expired or never existed.',
      },
      { status: 404 }
    );
  }
  // ...
}
```

### 3. **Por Qué Falla**

#### Problema 1: Cache en Memoria en Serverless
- ❌ `(global as any).__recommendationCache` no persiste entre invocaciones
- ❌ Cada request de serverless es una nueva instancia
- ❌ El cache nunca se comparte entre requests

#### Problema 2: Endpoint Incorrecto
- ✅ Backend retorna: `statusUrl: "/api/portal/enrichment-status/[id]"`
- ❌ Frontend usa: `/api/portal/recommendation/[id]`
- ❌ Son dos endpoints diferentes

#### Problema 3: Comentario en el Código
```typescript
// app/portal/results/page.tsx:881
// DISABLED: URL update with ID
// The /api/portal/recommendation/[id] endpoint returns 410 (Gone) because
// it was designed for async polling which we no longer use.
```

**Conclusión**: Este endpoint está DEPRECATED pero el frontend aún lo usa.

## 📊 Evidencia del Problema

### Frontend (results/page.tsx)
```typescript
// Línea 435
const response = await fetch(`/api/portal/recommendation/${recommendationId}`, {
  signal: controller.signal,
});
```

### Backend (quiz/route.ts)
```typescript
// Línea 306
statusUrl: responseData.statusUrl || `/api/portal/enrichment-status/${responseData.recommendation_id}`,
```

**Mismatch**: Frontend usa `/recommendation/`, backend dice usar `/enrichment-status/`

## 🔧 Soluciones Posibles

### Opción 1: Usar el Endpoint Correcto ✅ (RECOMENDADO)

**Cambiar frontend para usar el statusUrl correcto**:

```typescript
// app/portal/results/page.tsx
const statusUrl = `/api/portal/enrichment-status/${recommendationId}`;
const response = await fetch(statusUrl, {
  signal: controller.signal,
});
```

**Ventajas**:
- ✅ Usa el endpoint que el backend espera
- ✅ No requiere cambios en backend
- ✅ Solución rápida

**Desventajas**:
- ⚠️ Necesita verificar que `/enrichment-status/[id]` funcione correctamente

### Opción 2: Eliminar Endpoint Deprecated

**Eliminar `/api/portal/recommendation/[id]` completamente**:

```bash
rm app/api/portal/recommendation/[id]/route.ts
```

**Ventajas**:
- ✅ Limpia código muerto
- ✅ Evita confusión futura

**Desventajas**:
- ⚠️ Requiere asegurar que todo use el endpoint correcto

### Opción 3: Implementar Cache Persistente (OVERKILL)

**Usar DynamoDB o Redis para el cache**:

```typescript
// Usar DynamoDB en lugar de memoria
const cache = await dynamodb.get({
  TableName: 'recommendations',
  Key: { id: recommendationId }
});
```

**Ventajas**:
- ✅ Cache persiste entre requests
- ✅ Funciona en serverless

**Desventajas**:
- ❌ Complejidad innecesaria
- ❌ Costo adicional
- ❌ El endpoint ya está deprecated

## 🎯 Recomendación

### Implementar Opción 1 + Opción 2

1. **Cambiar frontend** para usar `/enrichment-status/[id]`
2. **Eliminar** `/api/portal/recommendation/[id]`
3. **Verificar** que el flujo funcione end-to-end

## 🧪 Plan de Verificación

### 1. Verificar Endpoint Correcto
```bash
# Probar que enrichment-status funciona
curl "https://suplementia.vercel.app/api/portal/enrichment-status/job_test_123"
```

### 2. Cambiar Frontend
```typescript
// app/portal/results/page.tsx
- const response = await fetch(`/api/portal/recommendation/${recommendationId}`, {
+ const response = await fetch(`/api/portal/enrichment-status/${recommendationId}`, {
```

### 3. Eliminar Endpoint Deprecated
```bash
rm app/api/portal/recommendation/[id]/route.ts
```

### 4. Test End-to-End
```bash
# Buscar un suplemento y verificar que el polling funcione
npx ts-node scripts/test-e2e-recommendation.ts
```

## 📝 Archivos Afectados

### Para Modificar
1. `app/portal/results/page.tsx` - Cambiar URL de polling
2. `app/api/portal/recommendation/[id]/route.ts` - ELIMINAR

### Para Verificar
1. `app/api/portal/enrichment-status/[id]/route.ts` - Debe funcionar correctamente
2. `app/api/portal/quiz/route.ts` - Ya retorna el statusUrl correcto

## 🚀 Próximos Pasos

1. ✅ Verificar que `/enrichment-status/[id]` funciona
2. ✅ Cambiar frontend para usar endpoint correcto
3. ✅ Eliminar endpoint deprecated
4. ✅ Deploy y test en producción
5. ✅ Monitorear logs para confirmar fix

## 📊 Impacto

### Antes (ROTO)
- ❌ 404 en cada polling request
- ❌ Frontend muestra error
- ❌ Usuario no ve resultados

### Después (FIXED)
- ✅ Polling funciona correctamente
- ✅ Frontend recibe datos
- ✅ Usuario ve resultados

## 🔍 Observabilidad

### Logs a Monitorear

```bash
# Vercel logs
vercel logs [deployment-url] | grep "enrichment-status"

# CloudWatch (Lambda)
aws logs tail /aws/lambda/suplementia-content-enricher-dev --follow

# X-Ray traces
aws xray get-trace-summaries --start-time $(date -u -d '5 minutes ago' +%s) --end-time $(date -u +%s)
```

### Métricas Clave
- ✅ Tasa de éxito de polling
- ✅ Tiempo de respuesta de enrichment-status
- ✅ Errores 404 (deben desaparecer)

## ✅ Conclusión

**Problema**: Frontend usa endpoint deprecated que no funciona en serverless.

**Solución**: Cambiar a usar `/enrichment-status/[id]` que es el endpoint correcto.

**Esfuerzo**: 10 minutos de código + 5 minutos de testing.

**Impacto**: Alto - Resuelve 404s y permite que el polling funcione.
