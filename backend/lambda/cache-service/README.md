# Cache Service - Suplementia

**Módulo**: Cache Service (Fase 1 - Content Enrichment)
**Responsabilidad**: Cache de contenido enriquecido de suplementos en DynamoDB

---

## 📋 Descripción

Cache Service es un microservicio independiente que proporciona almacenamiento en cache para contenido enriquecido de suplementos. Almacena datos generados por Content Enrichment Service en DynamoDB con TTL automático.

### Características

- ✅ **CRUD completo**: GET, PUT, DELETE operations
- ✅ **TTL automático**: Expira cache después de 30 días
- ✅ **X-Ray habilitado**: Tracing completo de todas las operaciones
- ✅ **Logging estructurado**: JSON logs para fácil parsing
- ✅ **CORS enabled**: Headers CORS incluidos
- ✅ **Tests >80% coverage**: Tests unitarios completos
- ✅ **Independiente**: Sin dependencias de otros módulos

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│   API Client    │
│ (Orchestrator)  │
└────────┬────────┘
         │ HTTP Request
         │ GET/PUT/DELETE
         ▼
┌─────────────────┐
│  Cache Service  │
│  Lambda Handler │
│                 │
│  • X-Ray ✓      │
│  • Logging ✓    │
│  • CORS ✓       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DynamoDB      │
│  enriched-      │
│  content        │
│                 │
│  • TTL ✓        │
│  • PITR ✓       │
│  • Encryption ✓ │
└─────────────────┘
```

---

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
cd backend/lambda/cache-service
npm install
```

### 2. Ejecutar Tests

```bash
npm test

# Con coverage
npm run test:coverage
```

**Output esperado**:
```
PASS  tests/handler.test.ts
  Cache Service Handler
    GET /cache/:supplementId
      ✓ should return 404 when cache item not found
      ✓ should return 200 with cache data when found
      ✓ should detect stale cache
      ✓ should return 400 when supplementId missing
    PUT /cache/:supplementId
      ✓ should store cache data successfully
      ✓ should return 400 when body is missing
      ✓ should return 400 when body is invalid JSON
    DELETE /cache/:supplementId
      ✓ should delete cache successfully
    OPTIONS /cache/:supplementId
      ✓ should handle OPTIONS request (CORS preflight)
    Error handling
      ✓ should return 405 for unsupported HTTP methods
      ✓ should return 500 when DynamoDB throws error
    CORS headers
      ✓ should include CORS headers in all responses

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Coverage:    > 80%
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Deploy a AWS

```bash
# Set environment variables
export STACK_NAME="suplementia-cache-service"
export ENVIRONMENT="staging"
export AWS_REGION="us-east-1"
export S3_BUCKET="suplementia-deployments"

# Deploy
./deploy.sh
```

---

## 📡 API Reference

### Base URL

```
https://{api-id}.execute-api.{region}.amazonaws.com/Prod/cache
```

### Endpoints

#### GET /cache/:supplementId

Obtener contenido cacheado de un suplemento.

**Request**:
```bash
curl -X GET https://api.suplementia.com/cache/ashwagandha
```

**Response 200** (Cache hit):
```json
{
  "success": true,
  "data": {
    "whatIsIt": "Ashwagandha es un adaptógeno...",
    "mechanisms": [...],
    "worksFor": [...],
    "dosage": {...},
    "safety": {...}
  },
  "metadata": {
    "lastUpdated": "2024-11-19T12:00:00Z",
    "version": "1.0.0",
    "isStale": false
  }
}
```

**Response 404** (Cache miss):
```json
{
  "success": false,
  "error": "Not found",
  "message": "Cache entry for ashwagandha not found"
}
```

---

#### PUT /cache/:supplementId

Guardar contenido enriquecido en cache.

**Request**:
```bash
curl -X PUT https://api.suplementia.com/cache/ashwagandha \
  -H "Content-Type: application/json" \
  -d '{
    "whatIsIt": "Ashwagandha es...",
    "mechanisms": [...],
    "worksFor": [...],
    "dosage": {...},
    "safety": {...}
  }'
```

**Response 200**:
```json
{
  "success": true,
  "message": "Cache updated successfully",
  "metadata": {
    "lastUpdated": "2024-11-19T12:00:00Z",
    "version": "1.0.0"
  }
}
```

**Response 400** (Invalid JSON):
```json
{
  "success": false,
  "error": "Invalid JSON in request body"
}
```

---

#### DELETE /cache/:supplementId

Invalidar cache de un suplemento.

**Request**:
```bash
curl -X DELETE https://api.suplementia.com/cache/ashwagandha
```

**Response 200**:
```json
{
  "success": true,
  "message": "Cache invalidated successfully"
}
```

---

## 🗄️ DynamoDB Schema

### Table: `suplementia-enriched-content`

```
PK (String, Hash Key):    "SUPPLEMENT#{supplementId}"
SK (String, Range Key):   "ENRICHED_CONTENT#v1"
data (Map):               { EnrichedContent object }
ttl (Number):             Unix timestamp (auto-expire)
lastUpdated (String):     ISO 8601 timestamp
version (String):         "1.0.0"
```

### Ejemplo de Item

```json
{
  "PK": "SUPPLEMENT#ashwagandha",
  "SK": "ENRICHED_CONTENT#v1",
  "data": {
    "whatIsIt": "Ashwagandha es...",
    "mechanisms": [...],
    "worksFor": [...],
    "dosage": {...},
    "safety": {...}
  },
  "ttl": 1734624000,
  "lastUpdated": "2024-11-19T12:00:00Z",
  "version": "1.0.0"
}
```

### Configuración

- **Billing Mode**: PAY_PER_REQUEST (on-demand)
- **TTL**: Habilitado (campo `ttl`)
- **PITR**: Habilitado (Point-in-Time Recovery)
- **Encryption**: SSE habilitado

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Test (Manual)

```bash
# 1. PUT data
curl -X PUT https://api.suplementia.com/cache/test \
  -H "Content-Type: application/json" \
  -d '{"whatIsIt": "Test supplement"}'

# 2. GET data
curl -X GET https://api.suplementia.com/cache/test

# 3. DELETE data
curl -X DELETE https://api.suplementia.com/cache/test

# 4. Verify deletion
curl -X GET https://api.suplementia.com/cache/test
# Should return 404
```

---

## 🗺️ X-Ray Tracing

### Verificar Traces

```bash
# Get recent traces
aws xray get-trace-summaries \
  --start-time $(date -u -v-5M +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.module = "cache-service"'

# Get specific trace
aws xray batch-get-traces --trace-ids {trace-id}
```

### Annotations Disponibles

```typescript
annotation.supplementId = "ashwagandha"
annotation.module = "cache-service"
annotation.httpMethod = "GET"
annotation.version = "1.0.0"
annotation.cacheHit = true/false
annotation.cacheStale = true/false
```

### Queries de X-Ray

```sql
-- Cache hits
annotation.module = "cache-service" AND annotation.cacheHit = true

-- Cache misses
annotation.module = "cache-service" AND annotation.cacheHit = false

-- Stale cache
annotation.module = "cache-service" AND annotation.cacheStale = true

-- Slow operations (>500ms)
annotation.module = "cache-service" AND duration > 0.5
```

---

## 📊 CloudWatch Logs

### Ver Logs en Tiempo Real

```bash
aws logs tail /aws/lambda/suplementia-cache-service-staging --follow
```

### Logs Estructurados

Todos los logs están en formato JSON:

```json
{
  "event": "REQUEST",
  "requestId": "abc-123",
  "httpMethod": "GET",
  "supplementId": "ashwagandha",
  "timestamp": "2024-11-19T12:00:00Z"
}
```

```json
{
  "operation": "GetCacheItem",
  "supplementId": "ashwagandha",
  "duration": 45,
  "found": true
}
```

```json
{
  "event": "RESPONSE",
  "requestId": "abc-123",
  "statusCode": 200,
  "duration": 67,
  "timestamp": "2024-11-19T12:00:00Z"
}
```

---

## 🚨 Troubleshooting

### Problema: "Table not found"

**Síntoma**: Error al GET/PUT/DELETE
```
ResourceNotFoundException: Cannot do operations on a non-existent table
```

**Solución**:
```bash
# Verificar que tabla existe
aws dynamodb describe-table --table-name suplementia-enriched-content

# Si no existe, deploy de nuevo
./deploy.sh
```

---

### Problema: "AccessDenied to DynamoDB"

**Síntoma**: Error de permisos
```
AccessDeniedException: User is not authorized to perform: dynamodb:GetItem
```

**Solución**:
1. Verificar IAM role de Lambda tiene permisos DynamoDB
2. Re-deploy con CloudFormation que crea permisos correctos
```bash
./deploy.sh
```

---

### Problema: "Cache always returns stale"

**Síntoma**: `isStale: true` siempre

**Solución**:
- TTL está configurado en 30 días por defecto
- Verificar que `ttl` field en DynamoDB es Unix timestamp futuro
```bash
# Inspeccionar item
aws dynamodb get-item \
  --table-name suplementia-enriched-content \
  --key '{"PK": {"S": "SUPPLEMENT#ashwagandha"}, "SK": {"S": "ENRICHED_CONTENT#v1"}}'
```

---

## 📈 Métricas

### CloudWatch Metrics

- `Invocations`: Número de llamadas
- `Duration`: P50, P90, P95, P99
- `Errors`: Errores totales
- `Throttles`: Requests throttled
- `ConcurrentExecutions`: Ejecuciones concurrentes

### Custom Metrics (via Logs)

```bash
# Cache hit rate
aws logs filter-pattern '{ $.operation = "GetCacheItem" $.found = true }' ...

# Average duration
aws logs filter-pattern '{ $.operation = "GetCacheItem" }' | jq '.duration' | awk '{ sum += $1; n++ } END { print sum/n }'
```

---

## 🔧 Configuración

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `TABLE_NAME` | `suplementia-enriched-content` | Nombre de tabla DynamoDB |
| `AWS_REGION` | `us-east-1` | Región de AWS |
| `XRAY_ENABLED` | `true` | Habilitar X-Ray tracing |
| `LOG_LEVEL` | `info` | Nivel de logging |
| `CORS_ORIGINS` | `*` | Orígenes permitidos CORS |

### Deployment Variables

| Variable | Default | Descripción |
|----------|---------|-------------|
| `STACK_NAME` | `suplementia-cache-service` | Nombre del stack CloudFormation |
| `ENVIRONMENT` | `staging` | Entorno (dev/staging/production) |
| `AWS_REGION` | `us-east-1` | Región de deployment |
| `S3_BUCKET` | `suplementia-deployments` | Bucket para artifacts |

---

## ✅ Checklist de Deployment

### Pre-Deployment
- [ ] Tests pasando: `npm test`
- [ ] Build exitoso: `npm run build`
- [ ] AWS credentials configuradas
- [ ] S3 bucket existe
- [ ] Variables de entorno set

### Deployment
- [ ] `./deploy.sh` exitoso
- [ ] CloudFormation stack creado
- [ ] DynamoDB table creada
- [ ] Lambda function deployed
- [ ] API Gateway endpoint disponible

### Post-Deployment
- [ ] Test GET endpoint (debería dar 404)
- [ ] Test PUT endpoint (guardar data)
- [ ] Test GET endpoint (debería retornar data)
- [ ] Test DELETE endpoint (invalidar cache)
- [ ] Verificar X-Ray traces
- [ ] Verificar CloudWatch logs
- [ ] Verificar alarmas creadas

---

## 🎯 Próximos Pasos

Este Cache Service es la **Fase 1** del plan de Content Enrichment.

**Fase 2**: Content Enrichment Service
- Implementar Lambda que llama Bedrock
- Genera contenido enriquecido
- Guarda en Cache Service automáticamente

**Fase 3**: Evidence Analyzer
- Análisis de estudios con Comprehend Medical
- Extracción de entidades médicas

**Fase 4**: Studies Fetcher
- Integración con PubMed API
- Búsqueda de estudios científicos

---

## 📚 Referencias

- [Documentación Completa](/docs/content-enrichment-architecture.md)
- [Plan de Implementación](/docs/content-enrichment-implementation-plan.md)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**Status**: ✅ COMPLETO - Listo para Deployment
**Última actualización**: 2024-11-19
**Versión**: 1.0.0
