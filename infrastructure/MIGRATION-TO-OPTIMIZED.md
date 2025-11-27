# Migration Guide: Redis → DynamoDB + ARM64 Lambda

## Cambios Principales

### 1. ✅ Eliminación de Redis
- **Antes**: ElastiCache Redis (cache.t3.micro) - $37.96/mes
- **Después**: DynamoDB como cache principal - $0.39/mes
- **Ahorro**: $37.57/mes (98%)

### 2. ✅ Lambda ARM64 (Graviton2)
- **Antes**: x86_64 architecture
- **Después**: arm64 architecture
- **Ahorro**: 20% en costos de Lambda
- **Beneficio**: 40% mejor performance

### 3. ✅ Logs Optimizados
- **Antes**: 30 días de retención
- **Después**: 3 días de retención
- **Ahorro**: $1-2/mes

### 4. ✅ RDS Single-AZ
- **Antes**: Multi-AZ ($27/mes)
- **Después**: Single-AZ ($14.71/mes)
- **Ahorro**: $12.29/mes
- **Trade-off**: 99.9% SLA vs 99.99% (aceptable para nuestro caso)

## Plan de Migración

### Fase 1: Preparación (1 hora)

#### 1.1 Backup de datos actuales
```bash
# Backup RDS
aws rds create-db-snapshot \
  --db-instance-identifier production-supplements-db \
  --db-snapshot-identifier pre-optimization-$(date +%Y%m%d) \
  --region us-east-1

# Export DynamoDB
aws dynamodb create-backup \
  --table-name production-supplement-cache \
  --backup-name pre-optimization-$(date +%Y%m%d) \
  --region us-east-1
```

#### 1.2 Verificar código Lambda compatible con ARM64
```bash
# Python 3.9+ es compatible
# Sentence Transformers es compatible con ARM64
# pgvector client es compatible

# Verificar dependencias
cd backend/lambda/search-api
pip install --platform manylinux2014_aarch64 --only-binary=:all: -r requirements.txt -t /tmp/test-arm64
```

### Fase 2: Actualizar Lambda Functions (2 horas)

#### 2.1 Modificar Lambda para usar DynamoDB en lugar de Redis

**Archivo**: `backend/lambda/search-api/lambda_function.py`

```python
# ANTES (Redis)
import redis

redis_client = redis.Redis(
    host=os.environ['REDIS_ENDPOINT'],
    port=6379,
    decode_responses=True
)

def get_from_cache(key):
    return redis_client.get(key)

def set_in_cache(key, value, ttl=3600):
    redis_client.setex(key, ttl, value)

# DESPUÉS (DynamoDB)
import boto3
import json
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
cache_table = dynamodb.Table(os.environ['CACHE_TABLE_NAME'])

def get_from_cache(key):
    try:
        response = cache_table.get_item(
            Key={'PK': f'CACHE#{key}', 'SK': 'DATA'}
        )
        item = response.get('Item')
        
        # Verificar TTL
        if item and item.get('ttl', 0) > int(datetime.now().timestamp()):
            return json.loads(item['data'])
        return None
    except Exception as e:
        print(f'Cache get error: {e}')
        return None

def set_in_cache(key, value, ttl=3600):
    try:
        expiry = int((datetime.now() + timedelta(seconds=ttl)).timestamp())
        cache_table.put_item(
            Item={
                'PK': f'CACHE#{key}',
                'SK': 'DATA',
                'data': json.dumps(value),
                'ttl': expiry,
                'searchQuery': key,  # Para GSI
                'createdAt': datetime.now().isoformat()
            }
        )
    except Exception as e:
        print(f'Cache set error: {e}')
```

#### 2.2 Actualizar variables de entorno Lambda

```bash
# Remover
REDIS_ENDPOINT
REDIS_PORT

# Agregar
CACHE_TABLE_NAME=production-supplement-cache
```

#### 2.3 Rebuild Lambda con ARM64

```bash
cd backend/lambda/search-api

# Crear Dockerfile para ARM64
cat > Dockerfile.arm64 <<EOF
FROM public.ecr.aws/lambda/python:3.9-arm64

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY lambda_function.py .

CMD ["lambda_function.handler"]
EOF

# Build para ARM64
docker buildx build --platform linux/arm64 -t search-api:arm64 -f Dockerfile.arm64 .

# Deploy
aws lambda update-function-code \
  --function-name production-search-api \
  --image-uri <ECR_URI>:arm64 \
  --architectures arm64 \
  --region us-east-1
```

### Fase 3: Deploy CloudFormation Optimizado (30 min)

#### 3.1 Validar template
```bash
aws cloudformation validate-template \
  --template-body file://infrastructure/cloudformation/intelligent-search-production-optimized.yml \
  --region us-east-1
```

#### 3.2 Create change set
```bash
aws cloudformation create-change-set \
  --stack-name production-intelligent-search \
  --change-set-name optimize-remove-redis \
  --template-body file://infrastructure/cloudformation/intelligent-search-production-optimized.yml \
  --parameters \
    ParameterKey=DBUsername,ParameterValue=postgres \
    ParameterKey=DBPassword,UsePreviousValue=true \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Revisar cambios
aws cloudformation describe-change-set \
  --stack-name production-intelligent-search \
  --change-set-name optimize-remove-redis \
  --region us-east-1
```

#### 3.3 Ejecutar cambios
```bash
aws cloudformation execute-change-set \
  --stack-name production-intelligent-search \
  --change-set-name optimize-remove-redis \
  --region us-east-1

# Monitorear
aws cloudformation wait stack-update-complete \
  --stack-name production-intelligent-search \
  --region us-east-1
```

### Fase 4: Verificación (30 min)

#### 4.1 Smoke tests
```bash
# Test búsqueda
curl -X POST https://api.suplementia.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamina d", "limit": 10}'

# Verificar latencia
for i in {1..10}; do
  time curl -s https://api.suplementia.com/search \
    -H "Content-Type: application/json" \
    -d '{"query": "omega 3"}' > /dev/null
done
```

#### 4.2 Verificar métricas CloudWatch
```bash
# Cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace IntelligentSearch \
  --metric-name CacheHitRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1

# Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-search-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,p95 \
  --region us-east-1
```

#### 4.3 Verificar DynamoDB cache
```bash
# Ver items en cache
aws dynamodb scan \
  --table-name production-supplement-cache \
  --limit 10 \
  --region us-east-1

# Verificar TTL funcionando
aws dynamodb describe-time-to-live \
  --table-name production-supplement-cache \
  --region us-east-1
```

### Fase 5: Cleanup (15 min)

#### 5.1 Eliminar recursos Redis (después de 24h de verificación)
```bash
# Eliminar cluster Redis
aws elasticache delete-cache-cluster \
  --cache-cluster-id production-supplements-redis \
  --region us-east-1

# Eliminar subnet group
aws elasticache delete-cache-subnet-group \
  --cache-subnet-group-name production-redis-subnet-group \
  --region us-east-1

# Eliminar security group
aws ec2 delete-security-group \
  --group-id <REDIS_SG_ID> \
  --region us-east-1
```

## Rollback Plan

Si algo sale mal:

### Opción A: Rollback CloudFormation
```bash
aws cloudformation cancel-update-stack \
  --stack-name production-intelligent-search \
  --region us-east-1
```

### Opción B: Restaurar desde backup
```bash
# Restaurar RDS
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier production-supplements-db-restored \
  --db-snapshot-identifier pre-optimization-YYYYMMDD \
  --region us-east-1

# Restaurar DynamoDB
aws dynamodb restore-table-from-backup \
  --target-table-name production-supplement-cache \
  --backup-arn <BACKUP_ARN> \
  --region us-east-1
```

## Comparación de Performance

### Latencia Esperada

| Operación | Redis (antes) | DynamoDB (después) | Diferencia |
|-----------|---------------|-------------------|------------|
| Cache hit | < 1ms | < 10ms | +9ms |
| Cache miss + DB | ~50ms | ~50ms | 0ms |
| Total con CloudFront | < 50ms | < 60ms | +10ms |

**Veredicto**: Diferencia imperceptible para el usuario final

### Costos

| Componente | Antes | Después | Ahorro |
|------------|-------|---------|--------|
| Redis | $37.96/mes | $0/mes | $37.96 |
| DynamoDB | $3/mes | $0.39/mes | $2.61 |
| Lambda | $5/mes | $0/mes (free tier) | $5 |
| RDS | $27/mes | $14.71/mes | $12.29 |
| Logs | $3/mes | $1/mes | $2 |
| **TOTAL** | **$75.96/mes** | **$16.10/mes** | **$59.86/mes (79%)** |

## Monitoreo Post-Migración

### Métricas clave a observar (primeras 48 horas)

1. **DynamoDB Cache Hit Rate**: Debe ser > 80%
2. **Lambda Duration p95**: Debe ser < 300ms
3. **Error Rate**: Debe ser < 1%
4. **DynamoDB Consumed Capacity**: Monitorear costos reales

### Alertas configuradas

- ✅ High error rate (> 1%)
- ✅ High latency (p95 > 300ms)
- ✅ Low cache hit rate (< 80%)

## Checklist de Migración

- [ ] Backup RDS y DynamoDB
- [ ] Verificar compatibilidad ARM64
- [ ] Actualizar código Lambda (Redis → DynamoDB)
- [ ] Rebuild Lambda con ARM64
- [ ] Validar CloudFormation template
- [ ] Crear change set
- [ ] Revisar cambios propuestos
- [ ] Ejecutar change set
- [ ] Smoke tests
- [ ] Verificar métricas CloudWatch
- [ ] Verificar DynamoDB cache funcionando
- [ ] Monitorear 24 horas
- [ ] Eliminar recursos Redis
- [ ] Actualizar documentación

## Soporte

Si encuentras problemas:
1. Revisar logs CloudWatch
2. Verificar métricas en dashboard
3. Ejecutar rollback si es crítico
4. Documentar issue en `docs/fixes/`
