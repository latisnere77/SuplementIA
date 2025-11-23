# Plan de Acción - Sistema de Búsqueda Inteligente

**Fecha**: 22 de Noviembre, 2025  
**Objetivo**: Deploy y validación en producción  
**Timeline**: 1-2 semanas

---

## 🎯 Objetivo

Llevar el sistema de búsqueda inteligente de **código validado** a **producción funcionando**.

---

## 📅 Timeline

```
Semana 1: Deploy y Testing
├─ Día 1-2: Deploy a staging + testing básico
├─ Día 3-4: Testing exhaustivo + fixes
└─ Día 5: Deploy a producción (feature flags OFF)

Semana 2: Activación Gradual
├─ Día 1-2: Activar búsqueda inteligente (50% tráfico)
├─ Día 3-4: Activar ranking completo (50% tráfico)
└─ Día 5: 100% tráfico + monitoreo
```

---

## 📋 Checklist Detallado

### Fase 1: Pre-Deploy (2-3 horas)

#### ✅ Código
- [x] Implementación completa
- [x] Tests locales pasando
- [x] Feature flags configurados
- [x] Documentación completa

#### ⏳ AWS Setup
- [ ] Verificar acceso a Bedrock
  ```bash
  aws bedrock list-foundation-models --region us-east-1
  ```
- [ ] Obtener PubMed API key (opcional)
  - Ir a: https://www.ncbi.nlm.nih.gov/account/
  - Crear API key
  - Guardar en secrets manager

- [ ] Verificar permisos IAM
  ```bash
  # Verificar rol de Lambda
  aws lambda get-function-configuration \
    --function-name studies-fetcher \
    --query 'Role'
  
  # Verificar políticas
  aws iam list-attached-role-policies \
    --role-name lambda-execution-role
  ```

- [ ] Agregar política de Bedrock si falta
  ```bash
  aws iam attach-role-policy \
    --role-name lambda-execution-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
  ```

### Fase 2: Build y Deploy (1 hora)

#### Build
```bash
cd backend/lambda/studies-fetcher

# Instalar dependencias
npm install

# Verificar build
npm run build

# Ejecutar tests locales
npx ts-node src/test-pubmed-only.ts
```

**Resultado esperado:**
```
✅ Query Builder: 8/8 PASSED
✅ Scorer: 4/4 PASSED
```

#### Deploy a Staging
```bash
# Opción 1: Serverless
serverless deploy --stage staging

# Opción 2: AWS SAM
sam build && sam deploy --stack-name studies-fetcher-staging

# Opción 3: Manual
npm run build
zip -r function.zip .
aws lambda update-function-code \
  --function-name studies-fetcher-staging \
  --zip-file fileb://function.zip
```

#### Configurar Variables (Staging)
```bash
aws lambda update-function-configuration \
  --function-name studies-fetcher-staging \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false,
    PUBMED_API_KEY=your_key_here,
    AWS_REGION=us-east-1
  }"
```

**Nota**: Empezamos con feature flags OFF para validar que no rompimos nada.

### Fase 3: Testing Básico (30 min)

#### Test 1: Sanity Check
```bash
# Debe funcionar como antes (sin nuevas features)
curl -X POST https://staging-api.com/studies \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "magnesium",
    "maxResults": 10
  }'
```

**Verificar:**
- ✅ Status 200
- ✅ Estudios retornados
- ✅ Sin campo `ranked`
- ✅ Tiempo < 5s

#### Test 2: Activar Búsqueda Inteligente
```bash
# Activar solo búsqueda inteligente
aws lambda update-function-configuration \
  --function-name studies-fetcher-staging \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=false,
    PUBMED_API_KEY=your_key_here
  }"

# Esperar 30s para que se aplique

# Test
curl -X POST https://staging-api.com/studies \
  -d '{"supplementName": "vitamin d", "maxResults": 20}'
```

**Verificar en CloudWatch:**
```
USING_INTELLIGENT_SEARCH
INTELLIGENT_SEARCH_COMPLETE
```

**Verificar respuesta:**
- ✅ Más estudios que antes
- ✅ Incluye Cochrane reviews
- ✅ Sin campo `ranked` (ranking OFF)
- ✅ Tiempo < 10s

#### Test 3: Activar Ranking Completo
```bash
# Activar todo
aws lambda update-function-configuration \
  --function-name studies-fetcher-staging \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=true,
    PUBMED_API_KEY=your_key_here
  }"

# Test
curl -X POST https://staging-api.com/studies \
  -d '{"supplementName": "omega-3", "maxResults": 30}'
```

**Verificar en CloudWatch:**
```
USING_INTELLIGENT_SEARCH
INTELLIGENT_SEARCH_COMPLETE
USING_INTELLIGENT_RANKING
SENTIMENT_ANALYZED (múltiples)
INTELLIGENT_RANKING_COMPLETE
```

**Verificar respuesta:**
- ✅ Campo `ranked` presente
- ✅ `ranked.positive` tiene 5 estudios
- ✅ `ranked.negative` tiene 5 estudios
- ✅ `metadata.consensus` presente
- ✅ Tiempo < 20s

### Fase 4: Testing Exhaustivo (2-3 horas)

#### Test Suite Completo
```bash
# Test 1: Suplemento popular (muchos estudios)
curl -X POST ... -d '{"supplementName": "vitamin d"}'
curl -X POST ... -d '{"supplementName": "magnesium"}'
curl -X POST ... -d '{"supplementName": "omega-3"}'

# Test 2: Suplemento con pocos estudios
curl -X POST ... -d '{"supplementName": "schisandra"}'
curl -X POST ... -d '{"supplementName": "rhodiola"}'

# Test 3: Forma química específica
curl -X POST ... -d '{"supplementName": "magnesium glycinate"}'
curl -X POST ... -d '{"supplementName": "zinc picolinate"}'

# Test 4: Suplemento controversial
curl -X POST ... -d '{"supplementName": "echinacea"}'
curl -X POST ... -d '{"supplementName": "saw palmetto"}'

# Test 5: Términos en español
curl -X POST ... -d '{"supplementName": "vitamina d"}'
curl -X POST ... -d '{"supplementName": "glicinato de magnesio"}'
```

#### Validar Cada Respuesta
Para cada test, verificar:
- [ ] Status 200
- [ ] Estudios retornados > 0
- [ ] Scores entre 0-100
- [ ] Sentiment confidence > 0.5
- [ ] Consensus coherente
- [ ] Tiempo razonable (<20s)

#### Casos Edge
```bash
# Término muy genérico
curl -X POST ... -d '{"supplementName": "vitamin"}'

# Término muy específico
curl -X POST ... -d '{"supplementName": "methylcobalamin"}'

# Término con typo
curl -X POST ... -d '{"supplementName": "magenesium"}'

# Término vacío (debe fallar)
curl -X POST ... -d '{"supplementName": ""}'

# MaxResults extremos
curl -X POST ... -d '{"supplementName": "magnesium", "maxResults": 1}'
curl -X POST ... -d '{"supplementName": "magnesium", "maxResults": 100}'
```

### Fase 5: Análisis de Resultados (1 hora)

#### Revisar CloudWatch Logs
```bash
# Ver logs recientes
aws logs tail /aws/lambda/studies-fetcher-staging --follow

# Query para performance
aws logs insights query \
  --log-group-name /aws/lambda/studies-fetcher-staging \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, event, duration, studiesFound
    | filter event = "INTELLIGENT_RANKING_COMPLETE"
    | sort @timestamp desc'
```

#### Métricas a Revisar
- [ ] Duration promedio < 15s
- [ ] Error rate < 1%
- [ ] Estudios encontrados > 10
- [ ] Consensus distribution razonable
- [ ] Confidence scores > 70

#### Issues Comunes y Fixes

**Issue**: Timeout
```bash
# Aumentar timeout
aws lambda update-function-configuration \
  --function-name studies-fetcher-staging \
  --timeout 90
```

**Issue**: Out of memory
```bash
# Aumentar memoria
aws lambda update-function-configuration \
  --function-name studies-fetcher-staging \
  --memory-size 1024
```

**Issue**: Rate limit de PubMed
```bash
# Verificar que API key esté configurada
aws lambda get-function-configuration \
  --function-name studies-fetcher-staging \
  --query 'Environment.Variables.PUBMED_API_KEY'
```

### Fase 6: Deploy a Producción (1 hora)

#### Pre-Deploy Checklist
- [ ] Todos los tests pasando
- [ ] CloudWatch logs limpios
- [ ] Performance aceptable
- [ ] No errores críticos
- [ ] Team notificado

#### Deploy
```bash
# Deploy a producción (feature flags OFF)
serverless deploy --stage prod

# O manual
aws lambda update-function-code \
  --function-name studies-fetcher-prod \
  --zip-file fileb://function.zip

# Configurar (flags OFF inicialmente)
aws lambda update-function-configuration \
  --function-name studies-fetcher-prod \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false,
    PUBMED_API_KEY=your_key_here
  }"
```

#### Smoke Test
```bash
# Test rápido en producción
curl -X POST https://api.suplementia.com/studies \
  -d '{"supplementName": "magnesium", "maxResults": 5}'
```

**Verificar:**
- ✅ Funciona como antes
- ✅ Sin errores
- ✅ Performance normal

### Fase 7: Activación Gradual (3-5 días)

#### Día 1: Búsqueda Inteligente (10% tráfico)
```bash
# Activar para 10% de usuarios (implementar en API Gateway)
# O activar completamente si confiamos
aws lambda update-function-configuration \
  --function-name studies-fetcher-prod \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=false,
    PUBMED_API_KEY=your_key_here
  }"
```

**Monitorear 24h:**
- CloudWatch metrics
- Error logs
- User feedback

#### Día 2-3: Aumentar a 50%
Si todo bien, aumentar tráfico.

#### Día 4: Activar Ranking (10% tráfico)
```bash
aws lambda update-function-configuration \
  --function-name studies-fetcher-prod \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=true,
    USE_INTELLIGENT_RANKING=true,
    PUBMED_API_KEY=your_key_here
  }"
```

**Monitorear:**
- Costos de Bedrock
- Performance
- Calidad de resultados

#### Día 5: 100% Tráfico
Si todo perfecto, activar para todos.

### Fase 8: Post-Deploy (Ongoing)

#### Monitoreo Diario
- [ ] Revisar CloudWatch dashboards
- [ ] Verificar costos de Bedrock
- [ ] Analizar user feedback
- [ ] Revisar error logs

#### Optimizaciones
- [ ] Ajustar parámetros si necesario
- [ ] Implementar caché de sentiment
- [ ] Agregar más métricas
- [ ] Documentar casos edge

---

## 🚨 Rollback Plan

Si algo sale mal en cualquier fase:

### Rollback Inmediato (< 1 min)
```bash
# Desactivar feature flags
aws lambda update-function-configuration \
  --function-name studies-fetcher-prod \
  --environment Variables="{
    USE_INTELLIGENT_SEARCH=false,
    USE_INTELLIGENT_RANKING=false
  }"
```

### Rollback Completo (< 5 min)
```bash
# Volver a versión anterior
aws lambda update-function-code \
  --function-name studies-fetcher-prod \
  --s3-bucket your-bucket \
  --s3-key previous-version.zip
```

---

## 📊 Success Criteria

### Técnicos
- ✅ Tests pasando: 100%
- ✅ Uptime: >99.9%
- ✅ Latency: <15s p95
- ✅ Error rate: <1%
- ✅ Costos: <$100/mes

### Negocio
- ✅ User satisfaction: >4.5/5
- ✅ No complaints sobre calidad
- ✅ Engagement estable o mejor
- ✅ Trust score mejora

---

## 👥 Responsabilidades

### Developer
- [ ] Deploy y testing
- [ ] Monitoreo técnico
- [ ] Fixes si necesario

### Product
- [ ] User feedback
- [ ] Métricas de negocio
- [ ] Comunicación con usuarios

### DevOps
- [ ] Infraestructura
- [ ] Monitoreo de costos
- [ ] Alertas configuradas

---

## 📞 Contactos de Emergencia

- **Developer**: [Tu contacto]
- **DevOps**: [Contacto DevOps]
- **Product**: [Contacto Product]

---

## ✅ Checklist Final

- [ ] Pre-deploy checklist completo
- [ ] Deploy a staging exitoso
- [ ] Testing exhaustivo pasado
- [ ] Deploy a producción exitoso
- [ ] Smoke tests pasando
- [ ] Monitoreo configurado
- [ ] Alertas activas
- [ ] Team notificado
- [ ] Documentación actualizada
- [ ] Rollback plan listo

---

**Status**: ⏳ READY TO START  
**Next Action**: Fase 1 - Pre-Deploy Setup  
**Owner**: [Tu nombre]  
**Start Date**: [Fecha]
