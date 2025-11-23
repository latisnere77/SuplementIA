# Guía de Integración - Sistema de Búsqueda Inteligente

## Estado Actual

✅ **Código integrado en `index.ts`** con feature flags  
✅ **Módulos validados** y funcionando  
⏳ **Pendiente**: Testing en Lambda con AWS Bedrock

## Feature Flags

El sistema usa feature flags para activar/desactivar funcionalidades:

```typescript
// En index.ts
const USE_INTELLIGENT_SEARCH = process.env.USE_INTELLIGENT_SEARCH === 'true';
const USE_INTELLIGENT_RANKING = process.env.USE_INTELLIGENT_RANKING === 'true';
```

### Variables de Entorno

Agregar a la configuración de Lambda:

```bash
# Activar búsqueda multi-estrategia
USE_INTELLIGENT_SEARCH=true

# Activar ranking con sentiment analysis
USE_INTELLIGENT_RANKING=true

# API Key de PubMed (opcional pero recomendado)
PUBMED_API_KEY=your_api_key_here
```

## Modos de Operación

### Modo 1: Sistema Tradicional (Default)
```bash
USE_INTELLIGENT_SEARCH=false
USE_INTELLIGENT_RANKING=false
```
- Búsqueda simple en PubMed
- Sin ranking
- Sin sentiment analysis
- **Costo**: $0

### Modo 2: Búsqueda Inteligente
```bash
USE_INTELLIGENT_SEARCH=true
USE_INTELLIGENT_RANKING=false
```
- Multi-strategy search (4 búsquedas combinadas)
- History Server optimization
- Cochrane priority
- Sin sentiment analysis
- **Costo**: $0

### Modo 3: Sistema Completo (Recomendado)
```bash
USE_INTELLIGENT_SEARCH=true
USE_INTELLIGENT_RANKING=true
```
- Multi-strategy search
- Sentiment analysis con Claude Haiku
- Ranking balanceado (5 positivos + 5 negativos)
- Consensus y confidence scores
- **Costo**: ~$0.05 por búsqueda

## Deployment

### Paso 1: Build Lambda

```bash
cd backend/lambda/studies-fetcher
npm install
npm run build
```

### Paso 2: Actualizar Variables de Entorno

En AWS Lambda Console o via CLI:

```bash
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=true,
    PUBMED_API_KEY=your_key_here
  }"
```

### Paso 3: Deploy

```bash
# Usando Serverless Framework
serverless deploy

# O usando AWS SAM
sam deploy

# O manualmente
zip -r function.zip .
aws lambda update-function-code \
  --function-name studies-fetcher \
  --zip-file fileb://function.zip
```

### Paso 4: Verificar Permisos

La Lambda necesita permisos para AWS Bedrock:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    }
  ]
}
```

## Testing

### Test 1: Búsqueda Simple (Sin Feature Flags)

```bash
curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "magnesium",
    "maxResults": 20
  }'
```

**Resultado esperado:**
- Lista de estudios sin ranking
- Sin campos de sentiment
- Respuesta rápida (~2-3s)

### Test 2: Búsqueda Inteligente

```bash
# Activar: USE_INTELLIGENT_SEARCH=true

curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "vitamin d",
    "maxResults": 50
  }'
```

**Resultado esperado:**
- Más estudios (combinación de 4 estrategias)
- Incluye Cochrane reviews
- Incluye estudios negativos
- Respuesta: ~5-7s

### Test 3: Sistema Completo

```bash
# Activar: USE_INTELLIGENT_SEARCH=true
#          USE_INTELLIGENT_RANKING=true

curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "omega-3",
    "maxResults": 50
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "studies": [...],
    "totalFound": 45,
    "ranked": {
      "positive": [
        {
          "pmid": "12345",
          "title": "...",
          "score": 95,
          "scoreBreakdown": {
            "methodologyScore": 50,
            "recencyScore": 20,
            "sampleSizeScore": 20,
            "journalScore": 5
          },
          "sentiment": "positive",
          "sentimentConfidence": 0.92,
          "sentimentReasoning": "Shows significant benefits..."
        }
        // ... 4 más
      ],
      "negative": [
        // ... 5 estudios
      ],
      "metadata": {
        "consensus": "moderate_positive",
        "confidenceScore": 85,
        "totalPositive": 32,
        "totalNegative": 8,
        "totalNeutral": 5
      }
    }
  },
  "metadata": {
    "intelligentRanking": true,
    "consensus": "moderate_positive",
    "confidenceScore": 85
  }
}
```

**Respuesta**: ~10-15s (incluye sentiment analysis)

## Monitoreo

### CloudWatch Logs

Buscar estos eventos:

```
USING_INTELLIGENT_SEARCH
INTELLIGENT_SEARCH_COMPLETE
USING_INTELLIGENT_RANKING
INTELLIGENT_RANKING_COMPLETE
SENTIMENT_ANALYZED
```

### Métricas Clave

1. **Duration**: Tiempo total de ejecución
2. **Studies Found**: Número de estudios encontrados
3. **Consensus**: Tipo de consenso (strong_positive, mixed, etc.)
4. **Confidence Score**: Score de confianza (0-100)
5. **Sentiment Distribution**: Positivos vs Negativos

### Errores Comunes

#### Error: "Bedrock access denied"
```
Solución: Verificar permisos IAM para bedrock:InvokeModel
```

#### Error: "Rate limit exceeded"
```
Solución: Agregar PUBMED_API_KEY para 10 req/seg
```

#### Error: "Sentiment analysis timeout"
```
Solución: Aumentar timeout de Lambda a 60s
```

## Rollback

Si algo falla, desactivar feature flags:

```bash
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false
  }"
```

El sistema volverá al comportamiento tradicional inmediatamente.

## Performance Esperado

| Modo | Estudios | Tiempo | Costo |
|------|----------|--------|-------|
| Tradicional | 20 | 2-3s | $0 |
| Inteligente | 50-100 | 5-7s | $0 |
| Completo | 50-100 | 10-15s | $0.05 |

## Optimizaciones Futuras

1. **Caché de Sentiment**: Guardar resultados de sentiment analysis
2. **Batch Processing**: Procesar múltiples búsquedas en paralelo
3. **Streaming**: Enviar resultados mientras se procesan
4. **Europe PMC**: Agregar citation counts
5. **MeSH Terms**: Mapeo automático a términos médicos

## Soporte

### Logs Estructurados

Todos los eventos están en formato JSON para fácil parsing:

```json
{
  "event": "INTELLIGENT_RANKING_COMPLETE",
  "requestId": "abc-123",
  "consensus": "moderate_positive",
  "confidenceScore": 85,
  "positive": 5,
  "negative": 5,
  "duration": 12500,
  "timestamp": "2025-11-22T..."
}
```

### Debug Mode

Para debugging detallado, buscar en CloudWatch:

```
event: SENTIMENT_ANALYZED
event: RANKING_START
event: RANKING_COMPLETE
```

## Checklist de Deployment

- [ ] Build exitoso
- [ ] Variables de entorno configuradas
- [ ] Permisos de Bedrock verificados
- [ ] Timeout de Lambda >= 60s
- [ ] Memory >= 512MB
- [ ] Test con búsqueda simple
- [ ] Test con búsqueda inteligente
- [ ] Test con ranking completo
- [ ] Monitoreo configurado
- [ ] Rollback plan documentado

## Próximos Pasos

1. ✅ Código integrado
2. ⏳ Deploy a Lambda
3. ⏳ Testing con Bedrock
4. ⏳ Validación E2E
5. ⏳ Actualizar frontend
6. ⏳ Producción

---

**Nota**: El sistema está diseñado para degradar gracefully. Si sentiment analysis falla, el sistema continúa sin ranking. Si la búsqueda inteligente falla, usa la tradicional.
