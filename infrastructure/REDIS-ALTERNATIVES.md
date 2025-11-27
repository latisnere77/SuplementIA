# Redis Alternatives - Serverless & Cost Optimization

## Problema Actual
- **ElastiCache Redis (cache.t3.micro)**: $37.96/mes
- **46% del costo total** de infraestructura
- Instancia corriendo 24/7 aunque no se use

## Alternativas Evaluadas

### 1. ✅ ElastiCache Serverless (RECOMENDADO)

**Ventajas:**
- ✅ Pay-per-use (solo pagas lo que usas)
- ✅ Auto-scaling automático
- ✅ 99.99% SLA
- ✅ Setup en < 1 minuto
- ✅ Encriptación siempre activa
- ✅ Multi-AZ automático
- ✅ Zero capacity planning

**Pricing:**
- **Data stored**: $0.125/GB-hora (Valkey) o $0.186/GB-hora (Redis)
- **ECPUs**: $0.0034 por ECPU-hora
- **Mínimo**: 100 MB (Valkey) o 1 GB (Redis)

**Costo estimado para nuestro caso:**
```
Asumiendo:
- 500 MB de datos promedio
- 10K búsquedas/día = ~300K/mes
- Cada búsqueda: 2 KB transferidos = 2 ECPUs

Data Storage (Valkey):
  0.5 GB × 730 hrs × $0.125 = $45.62/mes

ECPUs:
  300K requests × 2 ECPUs × $0.0034 / 1000 = $2.04/mes

Total: ~$47.66/mes (Valkey)
Total: ~$68/mes (Redis OSS)
```

**Veredicto**: ❌ MÁS CARO que cache.t3.micro para uso constante

**Cuándo usar:**
- Tráfico impredecible o esporádico
- Picos de tráfico ocasionales
- Desarrollo/staging (pagar solo cuando se usa)

---

### 2. ✅ DynamoDB con DAX (RECOMENDADO PARA NOSOTROS)

**Ventajas:**
- ✅ Ya tenemos DynamoDB configurado
- ✅ DAX: cache de < 1ms de latencia
- ✅ Serverless real (pay-per-request)
- ✅ No necesita VPC
- ✅ Integración nativa con Lambda

**Pricing DAX:**
- **dax.t3.small**: $0.04/hora = $29.20/mes
- **dax.t2.small**: $0.03/hora = $21.90/mes

**Costo estimado:**
```
DynamoDB (ya existente):
  - Lecturas: 300K/mes × $0.25/millón = $0.075/mes
  - Escrituras: 50K/mes × $1.25/millón = $0.0625/mes
  - Storage: 1 GB × $0.25 = $0.25/mes
  
DAX (dax.t2.small):
  $21.90/mes

Total: ~$22.28/mes
```

**Veredicto**: ✅ **$15.68/mes de ahorro** vs Redis actual

---

### 3. ✅ Solo DynamoDB (SIN CACHE) - ULTRA ECONÓMICO

**Ventajas:**
- ✅ Latencia < 10ms (suficiente para nuestro caso)
- ✅ Serverless real
- ✅ Sin infraestructura adicional
- ✅ Auto-scaling incluido

**Costo estimado:**
```
DynamoDB PAY_PER_REQUEST:
  - Lecturas: 300K/mes × $0.25/millón = $0.075/mes
  - Escrituras: 50K/mes × $1.25/millón = $0.0625/mes
  - Storage: 1 GB × $0.25 = $0.25/mes

Total: ~$0.39/mes
```

**Veredicto**: ✅ **$37.57/mes de ahorro** vs Redis actual

**Trade-off:**
- Latencia: 10ms vs 1ms (Redis)
- Para búsquedas de suplementos: ACEPTABLE
- CloudFront edge cache compensa la diferencia

---

### 4. ❌ MemoryDB (NO RECOMENDADO)

**Pricing:**
- **db.t4g.small**: $0.073/hora = $53.29/mes
- Más caro que Redis actual
- Overkill para nuestro caso de uso

---

### 5. ❌ Lambda + In-Memory Cache (NO RECOMENDADO)

**Limitaciones:**
- Cache se pierde entre invocaciones
- No compartido entre instancias Lambda
- Requiere warm-up constante

---

## Recomendación Final

### Opción A: ELIMINAR REDIS + Usar solo DynamoDB
**Ahorro: $37.57/mes (98% reducción)**

```yaml
# Eliminar de CloudFormation:
# - RedisCluster
# - RedisSecurityGroup
# - RedisSubnetGroup

# Usar DynamoDB existente con:
- TTL habilitado (auto-cleanup)
- PAY_PER_REQUEST billing
- Global Secondary Index para queries rápidas
```

**Pros:**
- ✅ Máximo ahorro
- ✅ Menos infraestructura que mantener
- ✅ Latencia aceptable (< 10ms)
- ✅ CloudFront edge cache (< 50ms) compensa

**Cons:**
- ⚠️ Latencia 10x mayor que Redis (pero aún rápido)

---

### Opción B: DynamoDB + DAX
**Ahorro: $15.68/mes (41% reducción)**

```yaml
# Reemplazar Redis con DAX:
DAXCluster:
  Type: AWS::DAX::Cluster
  Properties:
    ClusterName: !Sub '${Environment}-supplement-cache'
    NodeType: dax.t2.small
    ReplicationFactor: 1
    SubnetGroupName: !Ref DAXSubnetGroup
```

**Pros:**
- ✅ Latencia < 1ms (igual que Redis)
- ✅ Ahorro significativo
- ✅ Integración nativa con DynamoDB

**Cons:**
- ⚠️ Requiere VPC (ya tenemos)
- ⚠️ Instancia corriendo 24/7

---

### Opción C: ElastiCache Serverless (solo para staging/dev)
**Ahorro: $37.96/mes en staging**

```yaml
# Solo para ambientes de desarrollo
ServerlessCache:
  Type: AWS::ElastiCache::ServerlessCache
  Properties:
    ServerlessCacheName: !Sub '${Environment}-cache'
    Engine: valkey
    MaximumDataStorage:
      Maximum: 5
      Unit: GB
```

**Pros:**
- ✅ Pagar solo cuando se usa
- ✅ Perfecto para staging/dev
- ✅ Auto-scaling

**Cons:**
- ❌ Más caro para production con tráfico constante

---

## Plan de Implementación

### Fase 1: Eliminar Staging (AHORA)
```bash
./infrastructure/scripts/delete-staging-stack.sh
```
**Ahorro inmediato: $60-70/mes**

### Fase 2: Eliminar Redis en Production
```bash
# 1. Actualizar CloudFormation
# 2. Remover RedisCluster, RedisSecurityGroup, RedisSubnetGroup
# 3. Actualizar Lambda para usar solo DynamoDB
# 4. Deploy
```
**Ahorro adicional: $37.96/mes**

### Fase 3: Optimizar DynamoDB
```yaml
# Habilitar TTL para auto-cleanup
TimeToLiveSpecification:
  Enabled: true
  AttributeName: ttl

# Usar PAY_PER_REQUEST (ya configurado)
BillingMode: PAY_PER_REQUEST
```

---

## Comparación de Costos

| Solución | Costo/mes | Latencia | Ahorro vs Actual |
|----------|-----------|----------|------------------|
| **Redis actual (cache.t3.micro)** | $37.96 | < 1ms | - |
| ElastiCache Serverless (Valkey) | $47.66 | < 1ms | ❌ -$9.70 |
| DynamoDB + DAX | $22.28 | < 1ms | ✅ $15.68 |
| **Solo DynamoDB** | **$0.39** | **< 10ms** | ✅ **$37.57** |
| MemoryDB | $53.29 | < 1ms | ❌ -$15.33 |

---

## Decisión Recomendada

### Para Production: **Solo DynamoDB**
- Ahorro: $37.57/mes
- Latencia: < 10ms (aceptable)
- CloudFront edge cache compensa
- Menos infraestructura

### Para Staging: **ElastiCache Serverless**
- Solo cuando se use
- Costo variable según uso
- Perfecto para testing

### Total de Ahorro Mensual
```
Eliminar staging:        $60-70/mes
Eliminar Redis prod:     $37.96/mes
Migrar Lambda a ARM64:   $1-2/mes
Reducir logs:            $1-2/mes
────────────────────────────────────
TOTAL:                   ~$100-112/mes

Costo final: $18-20/mes (de $120-130/mes)
Reducción: 84%
```
