# Análisis Detallado de Costos - Arquitectura 3 (Hybrid Intelligence)

## 🔍 Desglose de $57/mes (10K búsquedas/día)

### 1. Cloudflare Workers: $5/mes
**Pricing real:**
- Free tier: 100K requests/día
- Paid plan: $5/mes por 10M requests adicionales
- CPU time: 50ms/request incluido

**Cálculo (10K búsquedas/día):**
```
300K requests/mes < 3M free tier
= $0/mes en Workers

PERO necesitas Workers Paid ($5/mes) para:
- KV storage (1GB incluido)
- Durable Objects (si usas)
- Sin límite de CPU time
```

**Escenario 1 usuario (3 búsquedas/semana):**
```
12 requests/mes << 100K free tier
= $0/mes (Free tier suficiente)
```

---

### 2. Redis (Upstash): $10/mes
**Pricing real:**
- Free tier: 10K commands/día, 256MB
- Pay-as-you-go: $0.20 per 100K commands
- Pro plan: $10/mes (1M commands/día, 1GB)

**Cálculo (10K búsquedas/día):**
```
10K búsquedas × 3 commands (get, set, expire) = 30K commands/día
30K × 30 días = 900K commands/mes

Free tier: 300K commands/mes (10K/día × 30)
Exceso: 600K commands
Costo: 600K / 100K × $0.20 = $1.20/mes

O Pro plan: $10/mes (más simple, incluye 30M commands)
```

**Escenario 1 usuario (3 búsquedas/semana):**
```
12 búsquedas/mes × 3 commands = 36 commands/mes
= $0/mes (Free tier: 300K commands/mes)
```

---

### 3. OpenSearch t3.small: $30/mes
**Pricing real (us-east-1):**
- t3.small.search: $0.036/hora
- Storage (EBS gp3): $0.135/GB-mes
- Data transfer: $0.09/GB salida

**Cálculo:**
```
Instancia: $0.036/hora × 730 horas = $26.28/mes
Storage: 20GB × $0.135 = $2.70/mes
Data transfer: ~1GB × $0.09 = $0.09/mes
Total: ~$29/mes
```

**⚠️ PROBLEMA: OpenSearch NO escala a $0**
- Mínimo: 1 instancia corriendo 24/7
- No hay "free tier" ni "serverless" real
- **Costo fijo: $29/mes incluso con 0 usuarios**

**Escenario 1 usuario (3 búsquedas/semana):**
```
= $29/mes (costo fijo, no escala a 0)
```

---

### 4. Lambda: $5/mes
**Pricing real:**
- Free tier: 1M requests/mes, 400K GB-seconds
- Requests: $0.20 per 1M requests
- Compute: $0.0000166667 per GB-second

**Cálculo (10K búsquedas/día):**
```
Requests: 300K/mes < 1M free tier = $0
Compute: 
  - 512MB RAM × 500ms × 300K = 75K GB-seconds
  - 75K < 400K free tier = $0

Con ML model (Sentence Transformers):
  - 1GB RAM × 800ms × 300K = 240K GB-seconds
  - 240K < 400K free tier = $0

Total: $0/mes (dentro de free tier)
```

**Escenario 1 usuario (3 búsquedas/semana):**
```
12 requests/mes << 1M free tier
= $0/mes (Free tier)
```

---

### 5. DynamoDB: $5/mes
**Pricing real:**
- Free tier: 25GB storage, 25 WCU, 25 RCU
- On-demand: $1.25 per 1M writes, $0.25 per 1M reads
- Storage: $0.25/GB-mes

**Cálculo (10K búsquedas/día):**
```
Writes: 300K/mes × $1.25/1M = $0.375
Reads: 600K/mes × $0.25/1M = $0.15
Storage: 5GB × $0.25 = $1.25
Total: ~$1.78/mes

Redondeado: $2/mes
```

**Escenario 1 usuario (3 búsquedas/semana):**
```
Writes: 12/mes << 25 WCU free tier
Reads: 24/mes << 25 RCU free tier
Storage: < 1GB << 25GB free tier
= $0/mes (Free tier)
```

---

### 6. S3 + Athena: $2/mes
**Pricing real:**
- S3 storage: $0.023/GB-mes
- S3 PUT: $0.005 per 1K requests
- Athena: $5 per TB scanned

**Cálculo (10K búsquedas/día):**
```
Logs: 300K × 1KB = 300MB/mes
S3 storage: 0.3GB × $0.023 = $0.007/mes
S3 PUT: 300K / 1000 × $0.005 = $1.50/mes
Athena: 0.3GB / 1000 × $5 = $0.0015/mes
Total: ~$1.51/mes

Redondeado: $2/mes
```

**Escenario 1 usuario (3 búsquedas/semana):**
```
Logs: 12 × 1KB = 12KB/mes
S3: $0.0003/mes
Athena: $0.00001/mes
= $0/mes (negligible)
```

---

## 📊 RESUMEN DE COSTOS

### Escenario 1: 10K búsquedas/día (300K/mes)
```
Cloudflare Workers:  $5   (paid plan para KV)
Redis (Upstash):     $10  (Pro plan)
OpenSearch:          $29  (t3.small 24/7)
Lambda:              $0   (free tier)
DynamoDB:            $2   (on-demand)
S3 + Athena:         $2   (logs)
─────────────────────────
TOTAL:               $48/mes
```

**❌ Mi cálculo original de $57 estaba inflado**
**✅ Costo real: ~$48/mes**

---

### Escenario 2: 1 usuario, 3 búsquedas/semana (12/mes)
```
Cloudflare Workers:  $0   (free tier: 100K req/día)
Redis (Upstash):     $0   (free tier: 10K cmd/día)
OpenSearch:          $29  (⚠️ COSTO FIJO)
Lambda:              $0   (free tier)
DynamoDB:            $0   (free tier)
S3 + Athena:         $0   (negligible)
─────────────────────────
TOTAL:               $29/mes
```

**🚨 PROBLEMA CRÍTICO: OpenSearch NO escala a $0**

---

## 💡 SOLUCIÓN: Arquitectura 3.5 "True Serverless"

### Reemplazar OpenSearch con alternativas serverless:

#### Opción A: **Pinecone Serverless**
```
Pricing:
- $0.096 per 1M queries
- $0.30 per 1M writes
- Storage: incluido

Costo (10K búsquedas/día):
- Queries: 300K × $0.096/1M = $0.029/mes
- Writes: 100/mes × $0.30/1M = $0.00003/mes
Total: ~$0.03/mes

Costo (1 usuario, 12 búsquedas/mes):
- Queries: 12 × $0.096/1M = $0.000001/mes
Total: ~$0/mes
```

#### Opción B: **Supabase Vector (PostgreSQL pgvector)**
```
Pricing:
- Free tier: 500MB database, 2GB bandwidth
- Pro: $25/mes (8GB database, 50GB bandwidth)

Costo (10K búsquedas/día):
- Database: < 500MB = Free tier
- Bandwidth: < 2GB = Free tier
Total: $0/mes

Costo (1 usuario, 12 búsquedas/mes):
- Database: < 100MB = Free tier
Total: $0/mes
```

#### Opción C: **Vercel Postgres + pgvector**
```
Pricing:
- Hobby: $0 (256MB, 60 horas compute/mes)
- Pro: $20/mes (512MB, 100 horas compute/mes)

Costo (10K búsquedas/día):
- Compute: ~10 horas/mes < 60 horas = Free
Total: $0/mes

Costo (1 usuario, 12 búsquedas/mes):
- Compute: < 1 hora/mes = Free
Total: $0/mes
```

---

## 🎯 ARQUITECTURA 3.5 OPTIMIZADA (True Serverless)

### Stack Revisado:
```
User Query → Cloudflare Workers (Edge)
                    ↓
            ┌───────┴───────┐
            ↓               ↓
    Redis (Upstash)   Lambda@Edge
    (Smart Cache)     (Local ML)
            ↓               ↓
    Vercel Postgres   Sentence Transformers
    (pgvector)        (Local Embeddings)
            ↓               ↓
        DynamoDB       PubMed API
```

### Costos Revisados:

#### Escenario 1: 10K búsquedas/día
```
Cloudflare Workers:  $5   (paid plan)
Redis (Upstash):     $10  (Pro plan)
Vercel Postgres:     $0   (free tier)
Lambda:              $0   (free tier)
DynamoDB:            $2   (on-demand)
S3 + Athena:         $2   (logs)
─────────────────────────
TOTAL:               $19/mes ✅
```

#### Escenario 2: 1 usuario, 3 búsquedas/semana
```
Cloudflare Workers:  $0   (free tier)
Redis (Upstash):     $0   (free tier)
Vercel Postgres:     $0   (free tier)
Lambda:              $0   (free tier)
DynamoDB:            $0   (free tier)
S3 + Athena:         $0   (negligible)
─────────────────────────
TOTAL:               $0/mes ✅✅✅
```

---

## 📈 COMPARACIÓN FINAL (Costos Reales)

| Arquitectura | 1 usuario (12/mes) | 10K/día (300K/mes) | Escala a $0 |
|--------------|--------------------|--------------------|-------------|
| **Arch 1: Pragmatic** | $0 | $13 | ✅ Sí |
| **Arch 2: AWS ML** | $70 | $170 | ❌ No |
| **Arch 3: Hybrid (original)** | $29 | $48 | ❌ No (OpenSearch) |
| **Arch 3.5: True Serverless** | **$0** | **$19** | ✅✅ Sí |

---

## 🏆 RECOMENDACIÓN FINAL ACTUALIZADA

### Para tu caso (startup, crecimiento incierto):

**Arquitectura 3.5: "True Serverless"**
- Vercel Postgres + pgvector (en lugar de OpenSearch)
- Cloudflare Workers + Redis
- Lambda con ML local

### Ventajas clave:
✅ **$0/mes con 1 usuario** (todos los servicios en free tier)
✅ **$19/mes con 10K búsquedas/día** (vs $48 original)
✅ **Escala perfectamente**: Pagas solo por uso real
✅ **Stack familiar**: Vercel Postgres (ya lo usas)
✅ **Implementación rápida**: 2 semanas

### Plan de Migración:
1. **Semana 1**: Vercel Postgres + pgvector + top 50 suplementos
2. **Semana 2**: Cloudflare Workers + Redis cache
3. **Semana 3**: Lambda ML + analytics

**Costo total durante desarrollo: $0/mes** 🎉
