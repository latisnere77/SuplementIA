# Deployment - Sistema de Búsqueda Inteligente

**Fecha**: 22 de Noviembre, 2025  
**Versión**: 1.0.0  
**Estado**: Listo para Deploy

## Pre-requisitos

- [x] Código implementado y validado
- [x] Tests core pasando (8/8 + 4/4)
- [x] Feature flags configurados
- [x] Documentación completa
- [ ] AWS Bedrock access configurado
- [ ] PubMed API key (opcional)

## Paso 1: Build

```bash
cd backend/lambda/studies-fetcher

# Instalar dependencias
npm install

# Verificar que compile
npm run build

# Ejecutar tests locales
npx ts-node src/test-pubmed-only.ts
```

**Resultado esperado:**
```
✅ Query Builder: 8/8 PASSED
✅ Scorer: 4/4 PASSED
✅ All core modules validated!
```

## Paso 2: Configurar Variables de Entorno

### Opción A: Modo Gradual (Recomendado)

**Fase 1: Solo búsqueda inteligente**
```bash
USE_INTELLIGENT_SEARCH=true
USE_INTELLIGENT_RANKING=false
PUBMED_API_KEY=your_key_here  # Opcional
```

**Fase 2: Sistema completo**
```bash
USE_INTELLIGENT_SEARCH=true
USE_INTELLIGENT_RANKING=true
PUBMED_API_KEY=your_key_here
```

### Opción B: Todo de una vez

```bash
USE_INTELLIGENT_SEARCH=true
USE_INTELLIGENT_RANKING=true
PUBMED_API_KEY=your_key_here
```

## Paso 3: Verificar Permisos IAM

La Lambda necesita estos permisos:

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
        "arn:aws:bedrock:us-east-1:*:model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

## Paso 4: Actualizar Configuración Lambda

```bash
# Aumentar timeout (sentiment analysis puede tomar tiempo)
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --timeout 60 \
  --memory-size 512

# Configurar variables de entorno
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=true,
    PUBMED_API_KEY=your_key_here,
    AWS_REGION=us-east-1
  }"
```

## Paso 5: Deploy

### Usando Serverless Framework

```bash
cd backend/lambda/studies-fetcher
serverless deploy --stage prod
```

### Usando AWS SAM

```bash
sam build
sam deploy --guided
```

### Manualmente

```bash
# Build
npm run build

# Crear zip
zip -r function.zip . -x "*.git*" "node_modules/aws-sdk/*" "*.md"

# Upload
aws lambda update-function-code \
  --function-name studies-fetcher \
  --zip-file fileb://function.zip
```

## Paso 6: Testing Post-Deploy

### Test 1: Health Check

```bash
curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "magnesium",
    "maxResults": 5
  }'
```

**Verificar:**
- ✅ Status 200
- ✅ Respuesta en < 10s
- ✅ Estudios retornados

### Test 2: Búsqueda Inteligente

```bash
curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "vitamin d",
    "maxResults": 20
  }'
```

**Verificar en CloudWatch:**
```
USING_INTELLIGENT_SEARCH
INTELLIGENT_SEARCH_COMPLETE
```

### Test 3: Ranking Completo

```bash
curl -X POST https://your-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "omega-3",
    "maxResults": 50
  }'
```

**Verificar:**
- ✅ Campo `ranked` presente
- ✅ `ranked.positive` tiene 5 estudios
- ✅ `ranked.negative` tiene 5 estudios
- ✅ `metadata.consensus` presente
- ✅ `metadata.confidenceScore` presente

**Verificar en CloudWatch:**
```
USING_INTELLIGENT_RANKING
SENTIMENT_ANALYZED (múltiples)
INTELLIGENT_RANKING_COMPLETE
```

### Test 4: Casos Edge

```bash
# Suplemento con pocos estudios
curl -X POST https://your-api.com/studies \
  -d '{"supplementName": "schisandra", "maxResults": 20}'

# Suplemento controversial
curl -X POST https://your-api.com/studies \
  -d '{"supplementName": "echinacea", "maxResults": 50}'

# Forma química específica
curl -X POST https://your-api.com/studies \
  -d '{"supplementName": "magnesium glycinate", "maxResults": 30}'
```

## Paso 7: Monitoreo

### CloudWatch Metrics

Crear alarmas para:

1. **Duration > 30s**
   - Indica problemas de performance
   
2. **Errors > 5%**
   - Indica problemas con Bedrock o PubMed

3. **Throttles > 0**
   - Indica rate limiting issues

### CloudWatch Logs Insights

Query para analizar performance:

```sql
fields @timestamp, event, duration, studiesFound, consensus
| filter event = "INTELLIGENT_RANKING_COMPLETE"
| sort @timestamp desc
| limit 100
```

Query para errores:

```sql
fields @timestamp, event, error, @message
| filter event like /ERROR/
| sort @timestamp desc
| limit 50
```

## Paso 8: Validación de Resultados

### Checklist de Calidad

Para cada búsqueda, verificar:

- [ ] Estudios retornados > 0
- [ ] Cochrane reviews priorizados (si existen)
- [ ] Scores entre 0-100
- [ ] Sentiment confidence > 0.5
- [ ] Balance positivo/negativo razonable
- [ ] Consensus coherente con distribución
- [ ] Confidence score coherente

### Ejemplos de Validación

**Magnesium (debe ser positive)**
```json
{
  "consensus": "strong_positive" o "moderate_positive",
  "confidenceScore": > 70,
  "totalPositive": > totalNegative
}
```

**Echinacea (debe ser mixed)**
```json
{
  "consensus": "mixed",
  "confidenceScore": 50-70,
  "totalPositive": ≈ totalNegative
}
```

## Rollback Plan

Si algo falla:

### Rollback Inmediato (< 1 min)

```bash
# Desactivar feature flags
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false
  }"
```

### Rollback Completo (< 5 min)

```bash
# Volver a versión anterior
aws lambda update-function-code \
  --function-name studies-fetcher \
  --s3-bucket your-bucket \
  --s3-key previous-version.zip
```

## Troubleshooting

### Error: "Bedrock access denied"

**Causa**: Permisos IAM incorrectos

**Solución**:
```bash
# Verificar rol de Lambda
aws lambda get-function-configuration \
  --function-name studies-fetcher \
  --query 'Role'

# Agregar política de Bedrock
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

### Error: "Rate limit exceeded"

**Causa**: Sin API key de PubMed

**Solución**:
```bash
# Agregar API key
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{..., PUBMED_API_KEY=your_key}"
```

### Error: "Timeout"

**Causa**: Lambda timeout muy corto

**Solución**:
```bash
# Aumentar timeout
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --timeout 60
```

### Error: "Out of memory"

**Causa**: Memoria insuficiente

**Solución**:
```bash
# Aumentar memoria
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --memory-size 1024
```

## Performance Esperado

| Métrica | Valor Esperado | Acción si Excede |
|---------|----------------|------------------|
| Duration | < 15s | Investigar logs |
| Memory | < 512MB | Aumentar si necesario |
| Errors | < 1% | Revisar permisos |
| Cost | ~$0.05/búsqueda | Normal |

## Costos Estimados

### Por Búsqueda
- Lambda execution: ~$0.0001
- Bedrock (Haiku): ~$0.05
- **Total: ~$0.05**

### Por Mes (1000 búsquedas)
- Lambda: ~$0.10
- Bedrock: ~$50
- **Total: ~$50/mes**

## Success Criteria

✅ **Deploy exitoso si:**

1. Tests post-deploy pasan
2. CloudWatch muestra eventos correctos
3. Resultados tienen calidad esperada
4. Performance dentro de límites
5. Costos dentro de presupuesto
6. Sin errores críticos en 24h

## Next Steps Post-Deploy

1. **Monitorear 24h**: Verificar estabilidad
2. **Analizar Resultados**: Validar calidad de ranking
3. **Optimizar**: Ajustar parámetros si necesario
4. **Documentar**: Casos edge encontrados
5. **Frontend**: Actualizar UI para mostrar ranking

---

## Checklist Final

- [ ] Build exitoso
- [ ] Tests locales pasando
- [ ] Variables de entorno configuradas
- [ ] Permisos IAM verificados
- [ ] Timeout y memoria ajustados
- [ ] Deploy completado
- [ ] Test 1: Health check ✅
- [ ] Test 2: Búsqueda inteligente ✅
- [ ] Test 3: Ranking completo ✅
- [ ] Test 4: Casos edge ✅
- [ ] Monitoreo configurado
- [ ] Alarmas creadas
- [ ] Rollback plan documentado
- [ ] Team notificado

---

**Deployment Owner**: [Tu nombre]  
**Fecha de Deploy**: [Fecha]  
**Versión**: 1.0.0  
**Status**: ⏳ READY TO DEPLOY
