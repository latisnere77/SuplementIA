# 🚀 Deploy a Producción - Guía Ejecutable

**Fecha**: 22 de Noviembre, 2025  
**Objetivo**: Deploy completo del sistema de búsqueda inteligente  
**Tiempo estimado**: 2-3 horas

---

## ⚠️ IMPORTANTE: Estrategia de Deploy Segura

Vamos a deployar con **feature flags OFF** inicialmente para no romper nada, luego activaremos gradualmente.

---

## 📋 Checklist Pre-Deploy

- [ ] Código commiteado
- [ ] Tests locales pasando
- [ ] AWS CLI configurado
- [ ] Acceso a AWS Console
- [ ] Backup de versión actual

---

## PASO 1: Commit del Código (5 min)

```bash
# Verificar cambios
git status

# Agregar todos los archivos
git add backend/lambda/studies-fetcher/src/
git add *.md

# Commit
git commit -F COMMIT-MESSAGE.txt

# Push
git push origin main
```

**Verificar**: ✅ Código en GitHub

---

## PASO 2: Build Local (5 min)

```bash
cd backend/lambda/studies-fetcher

# Instalar dependencias
npm install

# Build
npm run build

# Verificar que compile
ls -la dist/
```

**Verificar**: ✅ Carpeta `dist/` existe con archivos compilados

---

## PASO 3: Verificar Configuración AWS (10 min)

### 3.1 Verificar Lambda Actual

```bash
# Ver configuración actual
aws lambda get-function-configuration \
  --function-name studies-fetcher \
  --query '{Timeout:Timeout,Memory:MemorySize,Runtime:Runtime,Role:Role}'

# Guardar versión actual (backup)
aws lambda publish-version \
  --function-name studies-fetcher \
  --description "Backup before intelligent search"
```

### 3.2 Verificar Permisos de Bedrock

```bash
# Ver rol de Lambda
ROLE_NAME=$(aws lambda get-function-configuration \
  --function-name studies-fetcher \
  --query 'Role' --output text | cut -d'/' -f2)

echo "Lambda Role: $ROLE_NAME"

# Ver políticas del rol
aws iam list-attached-role-policies --role-name $ROLE_NAME

# Si no tiene Bedrock, agregar
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

**Verificar**: ✅ Rol tiene permisos de Bedrock

---

## PASO 4: Deploy con Feature Flags OFF (15 min)

### 4.1 Actualizar Configuración Lambda

```bash
# Aumentar timeout y memoria
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --timeout 60 \
  --memory-size 512

# Configurar variables de entorno (FLAGS OFF)
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false,
    AWS_REGION=us-east-1,
    PUBMED_API_KEY=
  }"

# Esperar a que se aplique
sleep 10
```

### 4.2 Deploy del Código

**Opción A: Usando Serverless Framework**
```bash
cd backend/lambda/studies-fetcher
serverless deploy --stage prod
```

**Opción B: Usando AWS CLI (Manual)**
```bash
cd backend/lambda/studies-fetcher

# Crear zip
npm run build
zip -r function.zip dist/ node_modules/ package.json

# Upload
aws lambda update-function-code \
  --function-name studies-fetcher \
  --zip-file fileb://function.zip

# Esperar a que se actualice
aws lambda wait function-updated \
  --function-name studies-fetcher
```

**Verificar**: ✅ Lambda actualizada

---

## PASO 5: Test Sanity Check (10 min)

### 5.1 Test desde CLI

```bash
# Test básico (debe funcionar como antes)
curl -X POST https://your-api-gateway-url/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "magnesium",
    "maxResults": 5
  }' | jq .
```

**Verificar**:
- ✅ Status 200
- ✅ Estudios retornados
- ✅ Sin campo `ranked` (porque flags están OFF)
- ✅ Tiempo < 5s

### 5.2 Test desde Frontend

```bash
# Abrir el portal
open https://your-frontend-url/portal

# Buscar "magnesium"
# Verificar que funcione normal
```

**Verificar**: ✅ Frontend funciona normal

---

## PASO 6: Activar Búsqueda Inteligente (15 min)

### 6.1 Activar Solo Búsqueda

```bash
# Activar búsqueda inteligente (sin ranking todavía)
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=false,
    AWS_REGION=us-east-1,
    PUBMED_API_KEY=
  }"

# Esperar
sleep 30
```

### 6.2 Test Búsqueda Inteligente

```bash
# Test con más resultados
curl -X POST https://your-api-gateway-url/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "vitamin d",
    "maxResults": 30
  }' | jq '.data.totalFound'
```

**Verificar**:
- ✅ Más estudios que antes
- ✅ Sin campo `ranked` todavía
- ✅ Tiempo < 10s

### 6.3 Verificar CloudWatch Logs

```bash
# Ver logs recientes
aws logs tail /aws/lambda/studies-fetcher --follow

# Buscar estos eventos:
# - USING_INTELLIGENT_SEARCH
# - INTELLIGENT_SEARCH_COMPLETE
```

**Verificar**: ✅ Logs muestran búsqueda inteligente activa

---

## PASO 7: Activar Ranking Completo (20 min)

### 7.1 Activar Todo

```bash
# Activar ranking completo
aws lambda update-function-configuration \
  --function-name studies-fetcher \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=true,
    AWS_REGION=us-east-1,
    PUBMED_API_KEY=
  }"

# Esperar
sleep 30
```

### 7.2 Test Ranking Completo

```bash
# Test con ranking
curl -X POST https://your-api-gateway-url/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "omega-3",
    "maxResults": 50
  }' > test-response.json

# Verificar estructura
cat test-response.json | jq '.data.ranked'
```

**Verificar**:
- ✅ Campo `ranked` presente
- ✅ `ranked.positive` tiene estudios
- ✅ `ranked.negative` tiene estudios
- ✅ `metadata.consensus` presente
- ✅ Tiempo < 20s

### 7.3 Verificar CloudWatch Logs

```bash
# Ver logs de sentiment analysis
aws logs tail /aws/lambda/studies-fetcher --follow

# Buscar:
# - USING_INTELLIGENT_RANKING
# - SENTIMENT_ANALYZED
# - INTELLIGENT_RANKING_COMPLETE
```

**Verificar**: ✅ Sentiment analysis funcionando

---

## PASO 8: Tests E2E Completos (30 min)

### 8.1 Test Suite Completo

```bash
# Test 1: Suplemento popular
curl -X POST https://your-api-gateway-url/studies \
  -d '{"supplementName": "magnesium", "maxResults": 50}' | jq '.data.ranked.metadata'

# Test 2: Forma química
curl -X POST https://your-api-gateway-url/studies \
  -d '{"supplementName": "magnesium glycinate", "maxResults": 30}' | jq '.data.ranked.metadata'

# Test 3: Suplemento controversial
curl -X POST https://your-api-gateway-url/studies \
  -d '{"supplementName": "echinacea", "maxResults": 40}' | jq '.data.ranked.metadata'

# Test 4: Término en español
curl -X POST https://your-api-gateway-url/studies \
  -d '{"supplementName": "vitamina d", "maxResults": 30}' | jq '.data.ranked.metadata'
```

**Para cada test, verificar**:
- ✅ Status 200
- ✅ Consensus coherente
- ✅ Confidence score > 50
- ✅ Balance razonable positive/negative

### 8.2 Test desde Frontend

```bash
# Abrir portal
open https://your-frontend-url/portal

# Probar búsquedas:
# 1. "magnesium"
# 2. "vitamin d"
# 3. "omega-3"
# 4. "glicinato de magnesio"
```

**Verificar en UI**:
- ✅ Resultados se muestran
- ✅ Estudios tienen scores
- ✅ Se ve consensus
- ✅ Performance aceptable

---

## PASO 9: Monitoreo (15 min)

### 9.1 Configurar Alarmas CloudWatch

```bash
# Alarma de errores
aws cloudwatch put-metric-alarm \
  --alarm-name studies-fetcher-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=studies-fetcher

# Alarma de duration
aws cloudwatch put-metric-alarm \
  --alarm-name studies-fetcher-duration \
  --alarm-description "Alert on slow executions" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 30000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=studies-fetcher
```

### 9.2 Dashboard CloudWatch

```bash
# Crear dashboard
aws cloudwatch put-dashboard \
  --dashboard-name studies-fetcher-intelligent-search \
  --dashboard-body file://cloudwatch-dashboard.json
```

---

## PASO 10: Validación Final (20 min)

### 10.1 Checklist de Validación

- [ ] Lambda deployada correctamente
- [ ] Feature flags activados
- [ ] Tests E2E pasando
- [ ] Frontend funcionando
- [ ] CloudWatch logs limpios
- [ ] Sin errores en últimos 30 min
- [ ] Performance aceptable (<20s)
- [ ] Costos dentro de presupuesto

### 10.2 Análisis de Resultados

```bash
# Ver métricas de últimos 30 min
aws logs insights query \
  --log-group-name /aws/lambda/studies-fetcher \
  --start-time $(date -u -d '30 minutes ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, event, duration, consensus, confidenceScore
    | filter event = "INTELLIGENT_RANKING_COMPLETE"
    | stats count(), avg(duration), avg(confidenceScore) by consensus'
```

---

## 🚨 ROLLBACK (Si algo falla)

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
VERSION=$(aws lambda list-versions-by-function \
  --function-name studies-fetcher \
  --query 'Versions[-2].Version' --output text)

aws lambda update-function-code \
  --function-name studies-fetcher \
  --publish \
  --revision-id $VERSION
```

---

## ✅ Success Criteria

Deploy exitoso si:
- ✅ Todos los tests E2E pasan
- ✅ Frontend funciona correctamente
- ✅ CloudWatch logs sin errores críticos
- ✅ Performance < 20s p95
- ✅ Costos < $0.10 por búsqueda
- ✅ Sin complaints de usuarios en 1 hora

---

## 📊 Post-Deploy

### Monitorear por 24 horas

```bash
# Ver logs en tiempo real
aws logs tail /aws/lambda/studies-fetcher --follow

# Ver métricas cada hora
watch -n 3600 'aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=studies-fetcher \
  --start-time $(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum'
```

### Documentar Issues

Si encuentras problemas, documentar en:
```
PRODUCTION-ISSUES-[DATE].md
```

---

## 🎯 Siguiente Acción

**EMPEZAR AHORA**:

```bash
# Paso 1: Commit
git add .
git commit -F COMMIT-MESSAGE.txt
git push

# Paso 2: Build
cd backend/lambda/studies-fetcher
npm install && npm run build

# Paso 3: Deploy
serverless deploy --stage prod

# Paso 4: Test
curl -X POST https://your-api/studies -d '{"supplementName":"magnesium"}'
```

---

**Owner**: [Tu nombre]  
**Start Time**: [Ahora]  
**Expected Completion**: [Ahora + 2-3 horas]  
**Status**: 🚀 READY TO GO
