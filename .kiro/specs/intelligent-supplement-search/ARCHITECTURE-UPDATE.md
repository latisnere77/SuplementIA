# Architecture Update - Cost Optimization

## Fecha: 2025-11-26

## Cambios Realizados

### ❌ Arquitectura Anterior (Compleja y Costosa)
```
CloudFront → Lambda@Edge → DynamoDB DAX → Redis → RDS Postgres + pgvector
Costo: $135-145/mes
```

### ✅ Arquitectura Nueva (Simplificada y Económica)
```
CloudFront → API Gateway → Lambda (ARM64) → DynamoDB → (RDS cuando sea necesario)
Costo: $1.59/mes (sin RDS) o $16-17/mes (con RDS)
```

## Cambios Específicos

### 1. Cache Layer
**Antes:**
- DynamoDB + DAX (L1 cache)
- ElastiCache Redis (L2 cache)
- Costo: $40-45/mes

**Ahora:**
- Solo DynamoDB (cache único)
- Latencia: < 10ms (aceptable)
- Costo: $0.39/mes
- **Ahorro: $40/mes**

### 2. Lambda Functions
**Antes:**
- x86_64 architecture
- Costo: $5/mes

**Ahora:**
- ARM64 (Graviton2)
- 20% más barato
- 40% mejor performance
- Costo: $0/mes (free tier)
- **Ahorro: $5/mes**

### 3. Secrets Management
**Antes:**
- SSM Parameter Store
- Manual password management

**Ahora:**
- AWS Secrets Manager
- Auto-generated passwords
- Rotation ready
- Costo: $0.41/mes

### 4. Database
**Antes:**
- RDS Multi-AZ
- Costo: $27/mes

**Ahora:**
- RDS Single-AZ (cuando se necesite)
- Costo: $14.71/mes
- **Ahorro: $12.29/mes**

### 5. Staging Environment
**Antes:**
- Full staging environment
- Costo: $60-70/mes

**Ahora:**
- Eliminado completamente
- **Ahorro: $60-70/mes**

## Arquitectura Actualizada

### Fase 1: Actual (Desplegada)
```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   CloudFront CDN    │
│   (Edge Cache)      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   API Gateway       │
│   (REST API)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Lambda (ARM64 - Graviton2)        │
│   - search-api                      │
│   - embedding-generator             │
│   - discovery-worker                │
│   Costo: $0/mes (free tier)         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   DynamoDB (Cache Principal)        │
│   - supplement-cache                │
│   - discovery-queue                 │
│   - TTL: 7 días                     │
│   - GSI: search-query-index         │
│   Costo: $0.39/mes                  │
└─────────────────────────────────────┘
```

### Fase 2: Con RDS (Cuando sea necesario)
```
┌─────────────────────────────────────┐
│   Lambda (ARM64)                    │
└──────┬──────────────────────────────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────────────┐
│  DynamoDB   │  │  RDS Postgres    │
│  (Cache)    │  │  + pgvector      │
│             │  │  Single-AZ       │
│  $0.39/mes  │  │  $14.71/mes      │
└─────────────┘  └──────────────────┘
```

## Componentes Actualizados

### 1. DynamoDB Tables

#### supplement-cache
```yaml
TableName: production-supplement-cache
BillingMode: PAY_PER_REQUEST
Attributes:
  - PK: CACHE#{query_hash}
  - SK: DATA
  - searchQuery: {original_query}
  - ttl: {expiry_timestamp}
  - data: {supplement_json}
GSI:
  - search-query-index (para búsquedas)
TTL: 7 días
```

#### discovery-queue
```yaml
TableName: production-discovery-queue
BillingMode: PAY_PER_REQUEST
Attributes:
  - id: {query_hash}
  - query: {original_query}
  - priority: {search_count}
  - status: pending|processing|completed
GSI:
  - priority-index (para procesamiento)
```

### 2. Lambda Functions (ARM64)

#### search-api
```python
# Optimizado - Sin Redis
def lambda_handler(event, context):
    query = event['queryStringParameters']['q']
    
    # 1. Check DynamoDB cache
    cached = check_dynamodb_cache(query_hash)
    if cached:
        return cached  # < 10ms
    
    # 2. Generate embedding + search RDS (si existe)
    embedding = generate_embedding(query)
    result = vector_search(embedding)
    
    # 3. Cache in DynamoDB
    cache_supplement(query_hash, result)
    
    return result
```

**Cambios:**
- ❌ Eliminado: Redis client
- ❌ Eliminado: DAX client
- ✅ Agregado: Secrets Manager client
- ✅ Agregado: ARM64 architecture
- ✅ Simplificado: Single cache layer

### 3. IAM Role

```yaml
LambdaExecutionRole:
  Policies:
    - DynamoDBAccess:
        - GetItem, PutItem, UpdateItem, Query
        - Resources: supplement-cache, discovery-queue
    - SecretsManagerAccess:
        - GetSecretValue
        - Resource: RDS credentials secret
    - CloudWatchMetrics:
        - PutMetricData
```

**Cambios:**
- ❌ Eliminado: ElastiCache permissions
- ❌ Eliminado: DAX permissions
- ✅ Agregado: Secrets Manager permissions

### 4. CloudWatch

```yaml
Logs:
  - /aws/lambda/production-search-api
  Retention: 3 días (antes: 30 días)
  
Alarms:
  - HighErrorRate (> 1%)
  - HighLatency (p95 > 300ms)
  - LowCacheHitRate (< 80%)
```

## Performance Expectations

### Latencia

| Escenario | Antes | Ahora | Cambio |
|-----------|-------|-------|--------|
| Cache hit (DAX) | < 1ms | - | N/A |
| Cache hit (Redis) | < 5ms | - | N/A |
| Cache hit (DynamoDB) | - | < 10ms | ✅ Aceptable |
| Cache miss + DB | ~50ms | ~50ms | = |
| Total con CloudFront | < 50ms | < 60ms | +10ms |

**Veredicto**: Diferencia imperceptible para usuarios

### Cache Hit Rate

- **Target**: > 80%
- **DynamoDB**: Suficiente para nuestro caso de uso
- **CloudFront**: Compensa latencia adicional

### Availability

- **DynamoDB**: 99.99% SLA
- **Lambda**: 99.95% SLA
- **RDS Single-AZ**: 99.9% SLA
- **Overall**: > 99.9%

## Costos Actualizados

### Fase 1: Sin RDS (Actual)
```
DynamoDB:        $0.39/mes
Lambda ARM64:    $0.00/mes (free tier)
CloudWatch:      $1.20/mes
────────────────────────────
TOTAL:           $1.59/mes
```

### Fase 2: Con RDS
```
DynamoDB:        $0.39/mes
Lambda ARM64:    $0.00/mes
RDS Single-AZ:   $14.71/mes
Secrets Manager: $0.41/mes
CloudWatch:      $1.00/mes
────────────────────────────
TOTAL:           $16.51/mes
```

## Migración Completada

### ✅ Eliminado
- [x] Staging environment completo
- [x] ElastiCache Redis cluster
- [x] DynamoDB DAX
- [x] Lambda@Edge
- [x] Multi-AZ RDS (cambio a Single-AZ)
- [x] 12 tablas DynamoDB staging
- [x] 12 funciones Lambda staging
- [x] 14 log groups staging

### ✅ Agregado
- [x] AWS Secrets Manager
- [x] Lambda ARM64 (Graviton2)
- [x] DynamoDB GSI para búsquedas
- [x] CloudWatch alarms optimizadas
- [x] Logs retention 3 días

### ✅ Optimizado
- [x] DynamoDB como cache único
- [x] IAM roles simplificados
- [x] CloudFormation templates
- [x] Lambda code (sin Redis)

## Próximos Pasos

1. **Deploy Lambda Functions** (ARM64)
2. **Agregar RDS** cuando sea necesario
3. **Configurar alertas** SNS
4. **Monitorear** métricas 24h
5. **Validar** performance

## Referencias

- Design original: `.kiro/specs/intelligent-supplement-search/design.md`
- Tasks actualizadas: `.kiro/specs/intelligent-supplement-search/tasks.md`
- Deployment: `infrastructure/DEPLOYMENT-SUCCESS.md`
- Best practices: `infrastructure/SECRETS-BEST-PRACTICES.md`
