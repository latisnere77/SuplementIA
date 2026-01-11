# AWS Cost Analysis - RDS Postgres + Infrastructure

## Costos Mensuales Estimados (us-east-1)

### RDS Postgres (db.t3.micro)
- **Instancia**: $0.017/hora × 730 horas = **$12.41/mes**
- **Almacenamiento gp3**: 20 GB × $0.115/GB = **$2.30/mes**
- **Backups**: Primeros 20 GB gratis (igual al storage)
- **Total RDS Single-AZ**: **~$14.71/mes**

### ElastiCache Redis (cache.t3.micro)
- **Instancia**: $0.052/hora × 730 horas = **$37.96/mes**
- **Total Redis**: **~$37.96/mes**

### DynamoDB (PAY_PER_REQUEST)
- **Lecturas**: $0.25 por millón de lecturas
- **Escrituras**: $1.25 por millón de escrituras
- **Almacenamiento**: $0.25/GB/mes
- **Estimado para 10K búsquedas/día**: **~$5-10/mes**

### EFS (ML Models)
- **Almacenamiento Standard**: $0.30/GB/mes
- **Estimado para 500 MB de modelos**: **~$0.15/mes**

### Lambda
- **Invocaciones**: $0.20 por millón
- **Compute**: $0.0000166667 por GB-segundo
- **Estimado para 10K búsquedas/día**: **~$5-8/mes**

### CloudWatch Logs
- **Ingestion**: $0.50/GB
- **Storage**: $0.03/GB/mes
- **Estimado**: **~$2-3/mes**

## Total Mensual Estimado: **$67-82/mes**

## Optimizaciones Recomendadas

### 1. ✅ ELIMINAR STAGING DEFINITIVAMENTE
- **Ahorro**: $60-70/mes
- **Acción**: Ejecutar `infrastructure/scripts/delete-staging-stack.sh`
- **Impacto**: Elimina RDS, Redis, EFS, DynamoDB, Lambda staging

### 2. Eliminar Redis si no se usa activamente
- **Ahorro**: $37.96/mes (46% del costo total)
- **Alternativa**: Usar solo DynamoDB + DAX si es necesario

### 3. Migrar Lambda a ARM64 (Graviton2)
- **Ahorro**: 20% en costos de Lambda (~$1-2/mes)
- **Beneficio adicional**: 40% mejor performance
- **Acción**: Cambiar arquitectura a `arm64` en Lambda functions

### 4. Usar Lambda Free Tier
- **Incluido gratis**: 1 millón de requests/mes
- **Incluido gratis**: 400,000 GB-segundos/mes
- **Para 10K búsquedas/día**: Completamente dentro del free tier

### 5. Reducir retención de logs
- Cambiar de 7 días a 3 días
- **Ahorro**: ~$1-2/mes

### 6. Usar RDS Reserved Instances (compromiso 1 año)
- **Ahorro**: ~30% = $4.41/mes
- **Nuevo costo RDS**: $10.30/mes

### 7. Considerar Aurora Serverless v2 (solo si escala)
- Paga solo por uso real
- Mínimo: 0.5 ACU = ~$43/mes
- **No recomendado para tráfico bajo**

## Recursos a Eliminar si No se Usan

### Staging Environment
- [ ] RDS staging instance
- [ ] Redis staging cluster
- [ ] EFS staging filesystem
- [ ] Lambda staging functions
- [ ] DynamoDB staging tables

### Production (revisar uso)
- [ ] Redis cluster (si cache hit rate < 50%)
- [ ] EFS (si modelos ML no se usan)
- [ ] Lambda functions no invocadas en 30 días

## Comandos para Auditar Recursos

```bash
# Listar instancias RDS
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus]' --output table

# Listar clusters Redis
aws elasticache describe-cache-clusters --query 'CacheClusters[*].[CacheClusterId,CacheNodeType,CacheClusterStatus]' --output table

# Listar filesystems EFS
aws efs describe-file-systems --query 'FileSystems[*].[FileSystemId,Name,SizeInBytes.Value]' --output table

# Listar tablas DynamoDB
aws dynamodb list-tables --output table

# Listar funciones Lambda no usadas
aws lambda list-functions --query 'Functions[*].[FunctionName,LastModified]' --output table
```

## Script de Limpieza

Ver: `infrastructure/scripts/cleanup-unused-resources.sh`

## Recomendación Final

**Para mantener costos bajo $15-20/mes:**
1. ✅ **STAGING YA ELIMINADO** (no existe en AWS)
2. ✅ **ELIMINAR REDIS** en production → Usar solo DynamoDB ($37.96/mes ahorro)
3. ✅ **MIGRAR LAMBDA A ARM64** (Graviton2) → 20% ahorro + 40% mejor performance
4. ✅ **APROVECHAR LAMBDA FREE TIER** → 1M requests/mes gratis
5. ✅ **REDUCIR LOGS** a 3 días → $1-2/mes ahorro

**Nuevo total estimado con todas las optimizaciones:**
- RDS Postgres: $14.71/mes
- DynamoDB: $0.39/mes (solo lo que usamos)
- Lambda: $0/mes (dentro de free tier con ARM64)
- CloudWatch: $1/mes
- **TOTAL: ~$16-17/mes** (84% de ahorro vs $100-120/mes actual)

**Ver análisis detallado de alternativas a Redis:**
→ `infrastructure/REDIS-ALTERNATIVES.md`

## Lambda ARM64 Migration Benefits

### Costos
- **20% más barato** que x86
- Graviton2: 40% mejor price-performance
- Graviton3: 60% más eficiente

### Performance
- 40% mejor performance vs x86
- 2x más rápido en crypto operations
- 3x mejor en ML workloads

### Cómo migrar
```python
# En CloudFormation Lambda function
Architectures:
  - arm64  # Cambiar de x86_64 a arm64

# Rebuild con target ARM64
docker buildx build --platform linux/arm64 -t my-lambda .
```

### Compatibilidad
- ✅ Python 3.9+ (nuestro caso)
- ✅ Node.js 12+
- ✅ Sentence Transformers (compatible con ARM)
- ✅ pgvector client libraries
