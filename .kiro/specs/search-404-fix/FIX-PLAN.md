# Plan de Corrección: Error 404 en Búsquedas

## 🎯 Objetivo

Corregir el error 404 en `/api/portal/enrichment-status/[id]` sincronizando el uso de IDs en todo el flujo de búsqueda.

## 📝 Cambios Requeridos

### 1. Frontend: `app/portal/results/page.tsx`

#### Cambio 1.1: Usar job_* IDs en lugar de rec_*

**Ubicación:** Línea 442

**Antes:**
```typescript
const recommendationId = searchParams.get('id') || 
  `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Después:**
```typescript
const jobId = searchParams.get('id') || 
  `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

#### Cambio 1.2: Actualizar referencias a recommendationId

**Ubicaciones:** Múltiples líneas

**Buscar y reemplazar:**
- `recommendationId` → `jobId` (variable)
- Mantener `recommendation_id` en objetos de datos

#### Cambio 1.3: Actualizar URL de polling

**Ubicación:** Línea ~680

**Antes:**
```typescript
const response = await fetch(
  `/api/portal/enrichment-status/${recommendationId}?supplement=${encodeURIComponent(supplement)}`
);
```

**Después:**
```typescript
const response = await fetch(
  `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(supplement)}`
);
```

#### Cambio 1.4: Actualizar generación de jobId en búsquedas

**Ubicación:** Línea ~900 (dentro de generateRecommendation)

**Antes:**
```typescript
const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
console.log(`🔖 Job ID: ${jobId} - Query: "${normalizedQuery}" → "${category}"`);
```

**Después:**
```typescript
const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
console.log(`🔖 Job ID: ${jobId} - Query: "${normalizedQuery}" → "${category}"`);

// Almacenar jobId en state para polling
setJobId(jobId);
```

### 2. Backend: `app/api/portal/quiz/route.ts`

#### Cambio 2.1: Generar job_* ID al inicio

**Ubicación:** Inicio del handler POST

**Agregar:**
```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Generate job ID for tracking
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract correlation ID
  const correlationId = request.headers.get('X-Correlation-ID') || 
    request.headers.get('X-Job-ID') || 
    jobId;
  
  console.log(`[Quiz API] Starting request - Job ID: ${jobId}, Correlation ID: ${correlationId}`);
  
  // ... resto del código
}
```

#### Cambio 2.2: Almacenar en job-store inmediatamente

**Ubicación:** Después de validar parámetros

**Agregar:**
```typescript
import { createJob, updateJob } from '@/lib/portal/job-store';

// After parameter validation
createJob(jobId, {
  status: 'processing',
  supplementName: category,
  createdAt: Date.now(),
  metadata: {
    age,
    gender,
    location,
    correlationId,
  },
});
```

#### Cambio 2.3: Actualizar job-store al completar

**Ubicación:** Antes de retornar respuesta exitosa

**Agregar:**
```typescript
// Before returning success response
updateJob(jobId, {
  status: 'completed',
  recommendation: responseData.recommendation,
  completedAt: Date.now(),
});
```

#### Cambio 2.4: Actualizar job-store en caso de error

**Ubicación:** En bloques catch

**Agregar:**
```typescript
catch (error: any) {
  console.error('[Quiz API] Error:', error);
  
  // Update job store with failure
  updateJob(jobId, {
    status: 'failed',
    error: error.message || 'Unknown error',
    completedAt: Date.now(),
  });
  
  // ... resto del manejo de errores
}
```

#### Cambio 2.5: Retornar jobId en respuesta

**Ubicación:** En todas las respuestas exitosas

**Modificar:**
```typescript
return NextResponse.json({
  success: true,
  jobId,  // ← AGREGAR
  recommendation_id: jobId,  // ← Usar mismo ID
  quiz_id: `quiz_${Date.now()}`,
  recommendation: responseData.recommendation,
  // ... resto de campos
});
```

### 3. Backend: `app/api/portal/enrich-async/route.ts`

#### Cambio 3.1: Actualizar job-store al completar enriquecimiento

**Ubicación:** Después de completar enriquecimiento

**Agregar:**
```typescript
import { updateJob } from '@/lib/portal/job-store';

// After enrichment completes
updateJob(jobId, {
  status: 'completed',
  recommendation: enrichedRecommendation,
  completedAt: Date.now(),
  metadata: {
    enrichmentTime: Date.now() - startTime,
    studiesUsed: enrichedRecommendation._enrichment_metadata?.studiesUsed || 0,
  },
});
```

### 4. Agregar Estado para jobId en Frontend

**Ubicación:** `app/portal/results/page.tsx` - Inicio del componente

**Agregar:**
```typescript
function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);  // ← AGREGAR
  
  // ... resto del código
}
```

### 5. Actualizar Cache para Usar job_* IDs

**Ubicación:** `app/portal/results/page.tsx` - Función de cache

**Modificar:**
```typescript
// CACHE: Save to localStorage
if (data.recommendation.recommendation_id && typeof window !== 'undefined') {
  try {
    // Use jobId for cache key instead of recommendation_id
    const cacheKey = `recommendation_${jobId}`;  // ← CAMBIAR
    const timestamp = Date.now();
    const ttl = 7 * 24 * 60 * 60 * 1000;
    
    const cacheData = {
      recommendation: data.recommendation,
      jobId,  // ← AGREGAR
      timestamp,
      ttl,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('[Cache Storage] ✅ Cached with jobId:', jobId);
  } catch (cacheError) {
    console.error('[Cache Storage] ❌ Error:', cacheError);
  }
}
```

## 🧪 Testing

### Test 1: Búsqueda Simple

```bash
# 1. Iniciar búsqueda
curl -X POST http://localhost:3000/api/portal/quiz \
  -H "Content-Type: application/json" \
  -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}'

# Verificar respuesta incluye jobId
# Ejemplo: {"success":true,"jobId":"job_1234567890_abc123",...}

# 2. Hacer polling
curl "http://localhost:3000/api/portal/enrichment-status/job_1234567890_abc123?supplement=Calcium"

# Verificar respuesta:
# - 202 si está procesando
# - 200 con recommendation si completó
# - NO debe ser 404
```

### Test 2: Búsqueda desde Frontend

```javascript
// En consola del navegador
// 1. Buscar "Calcium"
// 2. Verificar en Network tab:
//    - POST /api/portal/quiz retorna jobId
//    - GET /api/portal/enrichment-status/job_* NO retorna 404
//    - Polling eventualmente retorna recommendation
```

### Test 3: Cache

```javascript
// En consola del navegador
// 1. Buscar "Calcium"
// 2. Esperar a que complete
// 3. Verificar localStorage:
localStorage.getItem('recommendation_job_1234567890_abc123')
// Debe existir y contener recommendation

// 4. Refrescar página
// 5. Verificar que carga desde cache (no hace request)
```

### Test 4: Múltiples Búsquedas Simultáneas

```bash
# Iniciar 3 búsquedas al mismo tiempo
curl -X POST http://localhost:3000/api/portal/quiz -d '{"category":"Calcium",...}' &
curl -X POST http://localhost:3000/api/portal/quiz -d '{"category":"Magnesium",...}' &
curl -X POST http://localhost:3000/api/portal/quiz -d '{"category":"Vitamin D",...}' &

# Verificar que cada una tiene su propio jobId
# Verificar que polling funciona para todas
```

## 📋 Checklist de Implementación

- [ ] Cambio 1.1: Usar job_* IDs en frontend
- [ ] Cambio 1.2: Actualizar referencias a recommendationId
- [ ] Cambio 1.3: Actualizar URL de polling
- [ ] Cambio 1.4: Actualizar generación de jobId
- [ ] Cambio 2.1: Generar job_* ID en quiz API
- [ ] Cambio 2.2: Almacenar en job-store al inicio
- [ ] Cambio 2.3: Actualizar job-store al completar
- [ ] Cambio 2.4: Actualizar job-store en errores
- [ ] Cambio 2.5: Retornar jobId en respuesta
- [ ] Cambio 3.1: Actualizar job-store en enrich-async
- [ ] Cambio 4: Agregar estado jobId en frontend
- [ ] Cambio 5: Actualizar cache para usar job_* IDs
- [ ] Test 1: Búsqueda simple
- [ ] Test 2: Búsqueda desde frontend
- [ ] Test 3: Cache
- [ ] Test 4: Múltiples búsquedas
- [ ] Verificar logs en consola
- [ ] Verificar no hay 404s
- [ ] Deploy a staging
- [ ] Smoke tests en staging
- [ ] Deploy a producción
- [ ] Monitoreo post-deployment

## ⚠️ Rollback Plan

Si algo falla después del deployment:

1. **Revertir commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Verificar que producción vuelve a estado anterior**

3. **Analizar logs para identificar problema**

4. **Aplicar fix y re-deploy**

## 📊 Métricas de Éxito

- ✅ 0 errores 404 en `/api/portal/enrichment-status`
- ✅ Polling funciona en 100% de búsquedas
- ✅ Cache funciona correctamente
- ✅ Tiempo de respuesta < 5s
- ✅ No hay regresiones

---

**Fecha:** 2024-11-26
**Estimado:** 4-6 horas
**Prioridad:** 🔴 CRÍTICA
