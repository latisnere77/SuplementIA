# Estrategia de Batch Enrichment - SuplementIA

## 🎯 Objetivo

Reducir costos de LLM pre-generando contenido enriquecido para suplementos populares.

---

## 📊 Arquitectura Actual

### Lambdas Existentes:

```
┌─────────────────────────────────────────────────────┐
│ 1. suplementia-content-enricher-dev (PRINCIPAL)     │
├─────────────────────────────────────────────────────┤
│ Runtime: Node.js 20.x (TypeScript)                  │
│ Timeout: 180s (actualizado)                         │
│ Memory: 1024MB                                      │
│ Model: Claude 3.5 Haiku                             │
│ Max Tokens: 8000 (actualizado de 3000)             │
│ Cache: suplementia-content-enricher-cache           │
│                                                     │
│ Uso: Enrichment individual en tiempo real          │
│ Endpoint: Lambda Function URL                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 2. production-batch-enricher (NUEVO - BATCH)        │
├─────────────────────────────────────────────────────┤
│ Runtime: Python 3.11                                │
│ Timeout: 900s (15 min)                              │
│ Memory: 512MB                                       │
│ Model: Claude 3.5 Haiku                             │
│ Max Tokens: 8000                                    │
│ Cache: suplementia-content-enricher-cache (mismo)   │
│                                                     │
│ Uso: Batch processing nocturno                     │
│ Trigger: EventBridge Schedule (2 AM diario)        │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Estrategia Complementaria

### Flujo Híbrido (Recomendado):

```
┌─────────────────────────────────────────────────────┐
│ TIEMPO REAL (Usuario busca)                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Usuario busca "ashwagandha"                     │
│    ↓                                                │
│ 2. Check cache (DynamoDB)                          │
│    ├─ Cache HIT → Retornar inmediato (< 1s) ✅     │
│    └─ Cache MISS → Llamar content-enricher         │
│                     (3-5s, genera y cachea)        │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ BATCH NOCTURNO (Pre-generación)                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ EventBridge Schedule (2 AM diario)                 │
│    ↓                                                │
│ production-batch-enricher                          │
│    ├─ Procesa top 100 suplementos                  │
│    ├─ Genera contenido para todos                  │
│    └─ Guarda en cache (30 días TTL)                │
│                                                     │
│ Resultado: 95%+ búsquedas son cache hits          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 💰 Análisis de Costos

### Escenario: 10K búsquedas/día

#### Opción 1: Solo Tiempo Real (Sin Batch) ❌
```
Cache hit rate: 60% (solo búsquedas repetidas)
Cache miss: 4,000 búsquedas/día × $0.025 = $100/día
Mes: $3,000
Año: $36,000
```

#### Opción 2: Batch Nocturno (Recomendado) ✅
```
Batch diario: 100 suplementos × $0.025 = $2.50/día
Cache hit rate: 95%+ (pre-generados)
Cache miss: 500 búsquedas/día × $0.025 = $12.50/día
Total: $15/día = $450/mes = $5,400/año

AHORRO: $30,600/año (85% reducción) 🎉
```

#### Opción 3: Batch + Actualización Semanal ✅✅
```
Batch inicial: 200 suplementos × $0.025 = $5 (one-time)
Batch semanal: 50 nuevos × $0.025 = $1.25/semana
Cache hit rate: 98%+
Cache miss: 200 búsquedas/día × $0.025 = $5/día
Total: $155/mes = $1,860/año

AHORRO: $34,140/año (95% reducción) 🚀
```

---

## 🚀 Implementación

### Paso 1: Batch Inicial (One-Time)

Pre-generar top 100 suplementos más buscados:

```bash
# Ejecutar batch manual
aws lambda invoke \
  --function-name production-batch-enricher \
  --payload '{"mode":"popular","limit":100}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# Ver resultado
cat response.json | jq '.body | fromjson'
```

**Costo**: $2.50 one-time  
**Resultado**: 95%+ cache hit rate inmediato

---

### Paso 2: Schedule Diario (Automatización)

Configurar EventBridge para batch diario a las 2 AM:

```bash
# 1. Crear regla
aws events put-rule \
  --name daily-batch-enrichment \
  --description "Pre-generate enrichment for popular supplements" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED

# 2. Agregar target
aws events put-targets \
  --rule daily-batch-enrichment \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:239378269775:function:production-batch-enricher","Input"='{"mode":"popular","limit":100}'

# 3. Dar permiso
aws lambda add-permission \
  --function-name production-batch-enricher \
  --statement-id AllowEventBridgeDailyBatch \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:239378269775:rule/daily-batch-enrichment
```

**Costo**: $2.50/día = $75/mes  
**Ahorro**: $2,925/mes vs tiempo real

---

### Paso 3: Monitoreo

#### Ver Cache Hit Rate

```bash
# CloudWatch Logs Insights
aws logs insights query \
  --log-group-name /aws/lambda/suplementia-content-enricher-dev \
  --start-time $(date -u -d '1 day ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string '
    fields @timestamp, cached
    | filter event = "enrichment_complete"
    | stats count(*) as total, 
            sum(cached) as hits,
            (sum(cached) / count(*)) * 100 as hitRate
  '
```

#### Ver Costos de Bedrock

```bash
# Cost Explorer API
aws ce get-cost-and-usage \
  --time-period Start=2024-11-01,End=2024-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

---

## 🔧 Optimizaciones Adicionales

### 1. Aumentar MAX_TOKENS (Ya Hecho) ✅

```bash
# Actualizado de 3000 → 8000
# Resultado: Claude genera 3-4 items por sección (vs 1-2 antes)
```

### 2. Ajustar Prompt en content-enricher

Editar `backend/lambda/content-enricher/src/prompts.ts`:

```typescript
// Agregar énfasis en completitud
"IMPORTANTE: Genera EXACTAMENTE 3-4 items para CADA sección"
"NO omitas items por brevedad"
"Prioriza completitud sobre concisión"
```

### 3. Aumentar TTL de Cache

```typescript
// En content-enricher
const CACHE_TTL = 90 * 24 * 60 * 60; // 90 días (vs 30)

// Razón: Contenido científico no cambia rápido
// Ahorro: Menos regeneraciones
```

### 4. Lista Dinámica de Suplementos Populares

```python
# En batch-enricher
def get_popular_supplements(limit: int) -> List[str]:
    """
    Query analytics table para suplementos más buscados
    """
    # TODO: Implementar query a tabla de analytics
    # Por ahora usa lista hardcoded
```

---

## 📊 Métricas de Éxito

### KPIs a Monitorear:

1. **Cache Hit Rate**: Target 95%+
2. **Costo Mensual Bedrock**: Target < $100/mes
3. **Latencia P95**: Target < 1s (cache hit)
4. **Cobertura**: % de búsquedas cubiertas por batch

### Dashboard CloudWatch:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["SuplementIA/Enrichment", "CacheHitRate"]
        ],
        "title": "Cache Hit Rate (Target: 95%+)"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}]
        ],
        "title": "Enrichment Invocations"
      }
    }
  ]
}
```

---

## 🎯 Roadmap

### Fase 1: Setup Inicial (Esta Semana) ✅
- [x] Crear production-batch-enricher
- [x] Actualizar MAX_TOKENS a 8000
- [ ] Ejecutar batch inicial (top 100)
- [ ] Configurar EventBridge schedule

### Fase 2: Optimización (Próximas 2 Semanas)
- [ ] Ajustar prompts para más items
- [ ] Implementar analytics de suplementos populares
- [ ] Aumentar TTL a 90 días
- [ ] Monitorear y ajustar lista de batch

### Fase 3: Escalamiento (Próximo Mes)
- [ ] Batch de 200 suplementos
- [ ] Batch semanal para nuevos
- [ ] A/B testing de prompts
- [ ] Optimización de costos

---

## 📚 Referencias

- **Content Enricher**: `backend/lambda/content-enricher/`
- **Batch Enricher**: `backend/lambda/batch-enricher/`
- **Cache Table**: `suplementia-content-enricher-cache`
- **Prompts**: `backend/lambda/content-enricher/src/prompts.ts`

---

## 💡 Conclusión

**Estrategia Recomendada**: Usar ambos Lambdas de forma complementaria

- **content-enricher**: Tiempo real para cache misses
- **batch-enricher**: Pre-generación nocturna para cache warming

**Resultado**: 95%+ cache hit rate, $450/mes vs $3,000/mes (85% ahorro)

**Próximo Paso**: Ejecutar batch inicial de 100 suplementos ($2.50)
