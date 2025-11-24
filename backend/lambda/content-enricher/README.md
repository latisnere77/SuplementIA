# Content Enricher - Suplementia

**Módulo**: Content Enricher (Fase 2 - Content Enrichment)
**Responsabilidad**: Generar contenido enriquecido usando AWS Bedrock (Claude)

---

## 📋 Descripción

Content Enricher es un microservicio que genera contenido detallado y basado en evidencia para suplementos nutricionales. Utiliza AWS Bedrock con el modelo Claude 3 Sonnet para generar información rica inspirada en Examine.com.

### Características

- ✅ **Bedrock Integration**: Usa Claude 3 Sonnet para generación de contenido
- ✅ **Prompts Optimizados**: Prompts diseñados para información factual y estructurada
- ✅ **Cache Integration**: Se integra con Cache Service para performance
- ✅ **X-Ray habilitado**: Tracing completo incluye llamadas a Bedrock
- ✅ **Validación automática**: Valida estructura del JSON generado
- ✅ **Manejo robusto de errores**: Parse inteligente de respuestas de Claude
- ✅ **Independiente**: Puede funcionar sin Cache Service

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│   API Client    │
│ (Orchestrator)  │
└────────┬────────┘
         │ HTTP POST
         │ {supplementId, category}
         ▼
┌─────────────────┐
│Content Enricher │
│  Lambda Handler │
│                 │
│  1. Check Cache │─────┐
│  2. Call Bedrock│     │
│  3. Save Cache  │◄────┘
│                 │
│  • X-Ray ✓      │
│  • Logging ✓    │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐  ┌──────────┐
│ Bedrock│  │  Cache   │
│ Claude │  │ Service  │
│Sonnet  │  │(opcional)│
└────────┘  └──────────┘
```

---

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
cd backend/lambda/content-enricher
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Deploy a AWS

```bash
# Set environment variables
export STACK_NAME="suplementia-content-enricher"
export ENVIRONMENT="staging"
export AWS_REGION="us-east-1"
export S3_BUCKET="suplementia-deployments"
export CACHE_SERVICE_URL="https://api.suplementia.com"  # Optional

# Deploy
./deploy.sh
```

---

## 📡 API Reference

### POST /enrich

Generar contenido enriquecido para un suplemento.

**Request**:
```bash
curl -X POST https://api.suplementia.com/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "supplementId": "ashwagandha",
    "category": "stress",
    "forceRefresh": false
  }'
```

**Request Body**:
```typescript
{
  supplementId: string;    // Required: e.g., "ashwagandha"
  category?: string;       // Optional: e.g., "stress", "cognitive"
  forceRefresh?: boolean;  // Optional: Skip cache, regenerate
}
```

**Response 200** (Success):
```json
{
  "success": true,
  "data": {
    "whatIsIt": "Ashwagandha (Withania somnifera) es un adaptógeno...",
    "primaryUses": [
      "Reducción de estrés y ansiedad",
      "Mejora de calidad de sueño",
      "Aumento de testosterona en hombres"
    ],
    "mechanisms": [
      {
        "name": "Modulación del eje HPA",
        "description": "Reduce los niveles de cortisol...",
        "evidenceLevel": "strong",
        "studyCount": 12
      }
    ],
    "worksFor": [
      {
        "condition": "Reducción de estrés y ansiedad",
        "evidenceGrade": "A",
        "effectSize": "Moderate",
        "studyCount": 12,
        "metaAnalysis": true,
        "notes": "Dosis 300-600mg/día, 8+ semanas..."
      }
    ],
    "doesntWorkFor": [...],
    "dosage": {
      "standard": "300-600mg/día",
      "timing": "Mañana o noche con comida",
      "duration": "Mínimo 8 semanas",
      "forms": [
        {
          "form": "KSM-66",
          "description": "Estandarizado al 5% withanólidos",
          "recommended": true
        }
      ]
    },
    "safety": {
      "overallRating": "Generally Safe",
      "sideEffects": [...],
      "contraindications": [...],
      "interactions": [...]
    },
    "keyStudies": [...]
  },
  "metadata": {
    "supplementId": "ashwagandha",
    "generatedAt": "2024-11-19T12:00:00Z",
    "bedrockDuration": 3450,
    "tokensUsed": 2850,
    "cached": false
  }
}
```

**Response 200** (Cache Hit):
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "supplementId": "ashwagandha",
    "generatedAt": "2024-11-19T12:00:00Z",
    "cached": true
  }
}
```

**Response 400** (Bad Request):
```json
{
  "success": false,
  "error": "supplementId is required",
  "requestId": "abc-123"
}
```

**Response 500** (Error):
```json
{
  "success": false,
  "error": "Failed to generate enriched content",
  "message": "Bedrock API error: ...",
  "requestId": "abc-123"
}
```

---

## 🎨 Prompts de Bedrock

### Prompt Template

El prompt está optimizado para generar contenido estructurado en JSON con información basada en evidencia. Ver `/src/prompts.ts` para detalles completos.

**Estructura generada**:
- `whatIsIt`: Descripción del suplemento
- `primaryUses`: Usos principales (top 3)
- `mechanisms`: Mecanismos de acción con nivel de evidencia
- `worksFor`: Condiciones con evidencia positiva (Grade A-C)
- `doesntWorkFor`: Condiciones sin evidencia (Grade D)
- `limitedEvidence`: Evidencia preliminar pero prometedora
- `dosage`: Dosis estándar, timing, duración, formas
- `safety`: Efectos secundarios, contraindicaciones, interacciones
- `keyStudies`: Estudios clave con PubMed IDs (opcional)

### Temperature & Parameters

```typescript
{
  model: "claude-3-sonnet-20240229",
  temperature: 0.3,  // Bajo para contenido factual
  max_tokens: 4096   // Suficiente para contenido completo
}
```

---

## 💾 Cache Integration

### Flujo con Cache

```
1. Request → Content Enricher
2. Check Cache Service (si no es forceRefresh)
3. Si Cache Hit → Retornar inmediatamente (< 1s)
4. Si Cache Miss → Llamar Bedrock (5-10s)
5. Guardar a Cache async (no bloquea response)
6. Retornar contenido generado
```

### Configuración de Cache

```bash
# Deployment con Cache Service
export CACHE_SERVICE_URL="https://api.suplementia.com"
./deploy.sh
```

Si `CACHE_SERVICE_URL` no está configurado:
- Content Enricher funciona normalmente
- Siempre llama a Bedrock (sin cache)
- Logs: "Cache service URL not configured, skipping cache save"

---

## 🗺️ X-Ray Tracing

### Verificar Traces

```bash
# Get traces del Content Enricher
aws xray get-trace-summaries \
  --start-time $(date -u -v-10M +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.module = "content-enricher"'
```

### Annotations Disponibles

```typescript
annotation.supplementId = "ashwagandha"
annotation.module = "content-enricher"
annotation.version = "1.0.0"
annotation.forceRefresh = true/false
annotation.cacheHit = true/false
```

### Metadata Disponible

```typescript
metadata.bedrock = {
  duration: 3450,      // ms
  tokensUsed: 2850     // input + output tokens
}

metadata.response = {
  duration: 5200,      // ms total
  mechanismsCount: 3,
  worksForCount: 5
}
```

### Queries de X-Ray

```sql
-- Llamadas con cache hit
annotation.module = "content-enricher" AND annotation.cacheHit = true

-- Llamadas lentas (>10s)
annotation.module = "content-enricher" AND duration > 10

-- Errores
annotation.module = "content-enricher" AND error = true

-- Por suplemento específico
annotation.module = "content-enricher" AND annotation.supplementId = "ashwagandha"
```

---

## 📊 CloudWatch Logs

### Ver Logs en Tiempo Real

```bash
aws logs tail /aws/lambda/suplementia-content-enricher-staging --follow
```

### Logs Estructurados

```json
{
  "operation": "BedrockCall",
  "supplementId": "ashwagandha",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "maxTokens": 4096,
  "temperature": 0.3
}
```

```json
{
  "operation": "BedrockResponse",
  "supplementId": "ashwagandha",
  "duration": 3450,
  "tokensUsed": 2850,
  "inputTokens": 1500,
  "outputTokens": 1350
}
```

```json
{
  "event": "SUCCESS",
  "requestId": "abc-123",
  "supplementId": "ashwagandha",
  "duration": 5200,
  "bedrockDuration": 3450,
  "tokensUsed": 2850
}
```

---

## 💰 Costos de Bedrock

### Claude 3 Sonnet Pricing (us-east-1)

- **Input tokens**: ~$0.003 / 1K tokens
- **Output tokens**: ~$0.015 / 1K tokens

### Estimación por Request

Típico request de enriquecimiento:
- Input: ~1500 tokens (prompt)
- Output: ~1350 tokens (JSON response)
- **Costo por request**: ~$0.025 USD

Con cache:
- Primera llamada: $0.025
- Siguientes llamadas (30 días): $0.000 (cache hit)

### Optimización de Costos

1. **Usar Cache Service** → 90%+ cache hit rate
2. **Batch processing** → Generar para múltiples suplementos de una vez
3. **Monitorear usage** → CloudWatch metrics

---

## 🚨 Troubleshooting

### Problema: "AccessDenied: Bedrock"

**Síntoma**:
```
User is not authorized to perform: bedrock:InvokeModel
```

**Solución**:
1. Verificar IAM role de Lambda tiene permiso Bedrock
2. Template SAM ya incluye el permiso, re-deploy:
```bash
./deploy.sh
```

---

### Problema: "Invalid JSON from Bedrock"

**Síntoma**:
```
Failed to parse JSON from Bedrock response
```

**Solución**:
- El código ya maneja múltiples formatos de Claude
- Si persiste, revisar logs de CloudWatch para ver response exacta
- Ajustar prompt en `/src/prompts.ts` si es necesario

---

### Problema: "Timeout after 30s"

**Síntoma**:
```
Task timed out after 30.00 seconds
```

**Solución**:
1. Aumentar timeout en `template.yaml`:
```yaml
Globals:
  Function:
    Timeout: 60  # Aumentar a 60s
```

2. Re-deploy:
```bash
./deploy.sh
```

---

### Problema: "Content validation failed"

**Síntoma**:
```
Invalid enriched content structure: Missing required field: dosage
```

**Solución**:
- Claude a veces omite campos
- El código valida y rechaza respuestas incompletas
- Claude intenta de nuevo automáticamente
- Si persiste, ajustar prompt para enfatizar campos requeridos

---

## 🎯 Ejemplo de Uso Completo

```bash
# 1. Deploy Content Enricher
cd backend/lambda/content-enricher
export CACHE_SERVICE_URL="https://api.suplementia.com"
./deploy.sh

# 2. Generar contenido para Ashwagandha
curl -X POST https://api.suplementia.com/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementId": "ashwagandha", "category": "stress"}'

# 3. Segunda llamada (cache hit, ~100ms)
curl -X POST https://api.suplementia.com/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementId": "ashwagandha", "category": "stress"}'

# 4. Forzar regeneración
curl -X POST https://api.suplementia.com/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementId": "ashwagandha", "category": "stress", "forceRefresh": true}'

# 5. Ver traces en X-Ray
aws xray get-trace-summaries \
  --start-time $(date -u -v-10M +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.supplementId = "ashwagandha"'

# 6. Ver logs
aws logs tail /aws/lambda/suplementia-content-enricher-staging --follow
```

---

## 📈 Métricas Recomendadas

### CloudWatch Metrics

- `Invocations`: Número de requests
- `Duration`: P50, P90, P95, P99
- `Errors`: Errores totales
- `Throttles`: Requests throttled

### Custom Metrics (via Logs)

```bash
# Cache hit rate
aws logs filter-pattern '{ $.event = "CACHE_HIT" }' ...

# Average Bedrock duration
aws logs filter-pattern '{ $.operation = "BedrockResponse" }' | jq '.duration' | awk '{ sum += $1; n++ } END { print sum/n }'

# Token usage
aws logs filter-pattern '{ $.operation = "BedrockResponse" }' | jq '.tokensUsed' | awk '{ sum += $1; n++ } END { print sum/n }'
```

---

## 🔧 Configuración

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BEDROCK_MODEL_ID` | `claude-3-sonnet-...` | Modelo de Bedrock |
| `AWS_REGION` | `us-east-1` | Región de AWS |
| `CACHE_SERVICE_URL` | `` | URL de Cache Service (opcional) |
| `MAX_TOKENS` | `4096` | Máximo tokens Bedrock |
| `TEMPERATURE` | `0.3` | Temperature para Bedrock |
| `XRAY_ENABLED` | `true` | Habilitar X-Ray |
| `LOG_LEVEL` | `info` | Nivel de logging |

---

## 🎯 Próximos Pasos

El Content Enricher está **100% listo**. Este es el **Fase 2** del plan.

**Fase 3**: Evidence Analyzer (Comprehend Medical)
**Fase 4**: Studies Fetcher (PubMed API)
**Fase 5**: Frontend Mejorado
**Fase 6**: Optimización continua

---

## 📚 Referencias

- [Arquitectura Completa](/docs/content-enrichment-architecture.md)
- [Plan de Implementación](/docs/content-enrichment-implementation-plan.md)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3 Model Card](https://www.anthropic.com/claude)

---

**Status**: ✅ COMPLETO - Listo para Deployment
**Última actualización**: 2024-11-19
**Versión**: 1.0.0
