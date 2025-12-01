# Job ID Traceability System

## 🎯 Objetivo

Implementar un sistema de trazabilidad completa (end-to-end) usando Job IDs que permita seguir una búsqueda desde el frontend hasta los Lambdas de AWS.

## 🔍 Problema Resuelto

Antes era difícil hacer debugging porque:
- No había forma de correlacionar logs entre diferentes servicios
- Los Request IDs se regeneraban en cada endpoint
- No se podía seguir el flujo completo de una búsqueda

## ✅ Solución: Job ID Propagation

Un **Job ID único** se genera en el frontend y se propaga a través de todo el stack:

```
Frontend → Quiz API → Recommend API → Enrich API → Lambdas
   |          |            |              |           |
   └─────────┴────────────┴──────────────┴───────────┘
              Mismo Job ID en todos los logs
```

## 📊 Flujo Completo

### 1. Frontend (`app/portal/results/page.tsx`)

```typescript
// Generar Job ID único
const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
console.log(`🔖 Job ID: ${jobId} - Query: "${query}"`);

// Pasar en header y body
const response = await fetch('/api/portal/quiz', {
  headers: { 
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    category,
    jobId,
  }),
});
```

**Ejemplo de log**:
```
🔖 Job ID: job_1732302123456_abc123xyz - Query: "vitamina d" → "vitamina d"
```

### 2. Quiz API (`app/api/portal/quiz/route.ts`)

```typescript
// Recibir Job ID del frontend
const jobId = request.headers.get('X-Job-ID') || `job_${Date.now()}_...`;

// Propagar a Recommend API
const response = await fetch('/api/portal/recommend', {
  headers: {
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    category,
    jobId,
  }),
});
```

**Ejemplo de log**:
```json
{
  "requestId": "uuid-1234",
  "jobId": "job_1732302123456_abc123xyz",
  "endpoint": "/api/portal/quiz",
  "category": "vitamina d"
}
```

### 3. Recommend API (`app/api/portal/recommend/route.ts`)

```typescript
// Recibir Job ID de Quiz API
const jobId = request.headers.get('X-Job-ID') || body?.jobId || `job_...`;

console.log(`🔖 [Job ${jobId}] Recommend endpoint - Category: "${category}"`);

// Propagar a Enrich API
const response = await fetch('/api/portal/enrich', {
  headers: {
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    supplementName: category,
    jobId,
  }),
});
```

**Ejemplo de log**:
```
🔖 [Job job_1732302123456_abc123xyz] Recommend endpoint - Category: "vitamina d"
```

### 4. Enrich API (`app/api/portal/enrich/route.ts`)

```typescript
// Recibir Job ID de Recommend API
const jobId = request.headers.get('X-Job-ID') || body.jobId || `job_...`;

console.log(`🔖 [Job ${jobId}] Enrich endpoint - Supplement: "${supplementName}"`);

// Propagar a Lambdas
const studiesResponse = await fetch(STUDIES_API_URL, {
  headers: {
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    supplementName,
    jobId,
  }),
});

const enrichResponse = await fetch(ENRICHER_API_URL, {
  headers: {
    'X-Job-ID': jobId,
  },
  body: JSON.stringify({
    supplementId: supplementName,
    jobId,
  }),
});
```

**Ejemplo de log**:
```
🔖 [Job job_1732302123456_abc123xyz] Enrich endpoint - Supplement: "vitamina d"
```

### 5. Lambdas (AWS)

Los Lambdas reciben el Job ID en:
- Header: `X-Job-ID`
- Body: `jobId`

Pueden loggear con el Job ID para correlación:

```typescript
console.log(`[Job ${jobId}] Processing studies for: ${supplementName}`);
```

## 🔎 Cómo Usar para Debugging

### 1. Buscar en Frontend

Cuando un usuario hace una búsqueda, el navegador muestra:

```
🔖 Job ID: job_1732302123456_abc123xyz - Query: "vitamina d" → "vitamina d"
```

### 2. Buscar en Logs de Vercel

```bash
vercel logs --filter="job_1732302123456_abc123xyz"
```

Verás todos los logs relacionados:
```
🔖 [Job job_1732302123456_abc123xyz] Recommend endpoint - Category: "vitamina d"
🔖 [Job job_1732302123456_abc123xyz] Enrich endpoint - Supplement: "vitamina d"
```

### 3. Buscar en CloudWatch (AWS)

```
Filter pattern: job_1732302123456_abc123xyz
```

Verás los logs de los Lambdas:
```
[Job job_1732302123456_abc123xyz] Fetching studies from PubMed
[Job job_1732302123456_abc123xyz] Found 5 studies
[Job job_1732302123456_abc123xyz] Enriching with Claude Haiku
```

### 4. Correlacionar Todo el Flujo

Con un solo Job ID puedes ver:
- ✅ Qué buscó el usuario
- ✅ Cómo se tradujo (español→inglés)
- ✅ Cuántos estudios se encontraron
- ✅ Cuánto tardó cada paso
- ✅ Dónde falló (si hubo error)

## 📝 Formato del Job ID

```
job_<timestamp>_<random>
```

**Ejemplo**: `job_1732302123456_abc123xyz`

- `job_`: Prefijo para identificar fácilmente
- `1732302123456`: Timestamp en milisegundos (para ordenar cronológicamente)
- `abc123xyz`: String aleatorio de 9 caracteres (para unicidad)

## 🎓 Beneficios

### 1. Debugging Más Rápido
- Buscar un Job ID en todos los logs
- Ver el flujo completo en segundos
- Identificar dónde falló exactamente

### 2. Monitoreo de Performance
- Medir tiempo de cada paso
- Identificar cuellos de botella
- Optimizar partes lentas

### 3. Análisis de Errores
- Ver qué causó un error
- Reproducir el problema
- Verificar la solución

### 4. Soporte al Usuario
- Usuario reporta error
- Copiar Job ID del navegador
- Ver exactamente qué pasó

## 🧪 Testing

### Test Manual

1. Abrir navegador en: https://suplementia.vercel.app/portal
2. Abrir DevTools (F12) → Console
3. Buscar "vitamina d"
4. Copiar el Job ID del log:
   ```
   🔖 Job ID: job_1732302123456_abc123xyz - Query: "vitamina d"
   ```
5. Buscar en Vercel logs:
   ```bash
   vercel logs --filter="job_1732302123456_abc123xyz"
   ```

### Test Automatizado

```bash
# Ejecutar test end-to-end
npx tsx scripts/test-vitamina-d-e2e.ts

# El script mostrará el Job ID en los logs
# Buscar ese Job ID en Vercel/CloudWatch
```

## 📊 Ejemplo Completo

### Búsqueda: "vitamina d"

**Frontend**:
```
🔖 Job ID: job_1732302123456_abc123xyz - Query: "vitamina d" → "vitamina d"
```

**Quiz API**:
```json
{
  "jobId": "job_1732302123456_abc123xyz",
  "endpoint": "/api/portal/quiz",
  "category": "vitamina d"
}
```

**Recommend API**:
```
🔖 [Job job_1732302123456_abc123xyz] Recommend endpoint - Category: "vitamina d"
```

**Enrich API**:
```
🔖 [Job job_1732302123456_abc123xyz] Enrich endpoint - Supplement: "vitamina d"
{
  "event": "ORCHESTRATION_START",
  "jobId": "job_1732302123456_abc123xyz",
  "supplementName": "vitamina d",
  "maxStudies": 5,
  "isPopularSupplement": true
}
```

**Studies Lambda**:
```
[Job job_1732302123456_abc123xyz] Searching PubMed for: vitamin d
[Job job_1732302123456_abc123xyz] Found 112,179 studies, returning top 5
```

**Content-Enricher Lambda**:
```
[Job job_1732302123456_abc123xyz] Enriching with 5 studies
[Job job_1732302123456_abc123xyz] Claude Haiku processing...
[Job job_1732302123456_abc123xyz] Enrichment complete in 6.2s
```

## 🚀 Deploy

```bash
# Commit cambios
git add -A
git commit -m "feat: implement Job ID traceability system"

# Push a producción
git push origin main

# Vercel auto-deploy (~2 min)
```

## 📞 Troubleshooting

### Job ID no aparece en logs

**Problema**: Los logs no muestran el Job ID

**Solución**:
1. Verificar que el frontend genera el Job ID
2. Verificar que se pasa en el header `X-Job-ID`
3. Verificar que cada endpoint lo propaga

### Job ID diferente en cada endpoint

**Problema**: Cada endpoint genera su propio Job ID

**Solución**:
1. Verificar que se lee del header primero: `request.headers.get('X-Job-ID')`
2. Verificar que se pasa en el body como fallback: `body.jobId`
3. Solo generar nuevo Job ID si no existe ninguno

### No puedo buscar en CloudWatch

**Problema**: Los Lambdas no loggean el Job ID

**Solución**:
1. Verificar que el Lambda recibe el Job ID en el body
2. Agregar logs con el Job ID en el Lambda
3. Redeploy del Lambda

---

**Fecha**: 22 de noviembre de 2025  
**Autor**: Kiro AI  
**Status**: ✅ Implementado y listo para deploy
