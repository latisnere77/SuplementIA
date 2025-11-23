# 🚀 Deployment Instructions - Carnitina Fix

**Fecha**: 2025-11-21
**Implementación**: Modular, sin cascadas, sistemática

---

## ✅ Pre-Deployment Checklist

### Código Completo ✅
- [x] Query Normalizer module (lib/portal/query-normalization/)
- [x] Enhanced Supplement Suggestions (35+ carnitina variations)
- [x] X-Ray Tracing utilities
- [x] Search Analytics service
- [x] Analytics API endpoint
- [x] Backend Shared Utils (backend/shared/query-utils.js)
- [x] TypeScript compilation successful (0 errors)

### Tests ✅
- [x] 60+ unit tests escritos (normalizer.test.ts)
- [x] TypeScript type-check passing
- [x] No breaking changes

---

## 📦 Deployment Steps

### Paso 1: Deploy Frontend (Vercel)

```bash
# Desde el root del proyecto
cd /Users/latisnere/Documents/suplementia

# Verificar que compile
npm run type-check
# ✅ Debe pasar sin errores

npm run build
# ✅ Debe completar sin errores

# Commit cambios
git status
git add lib/portal/query-normalization/
git add lib/portal/search-analytics/
git add lib/portal/xray-client.ts
git add lib/portal/supplement-suggestions.ts
git add app/api/portal/analytics/
git add app/portal/results/page.tsx
git add backend/shared/
git add docs/
git add tsconfig.json

git commit -m "feat: Add modular query normalization and carnitina support

- Query normalizer module with 80+ supplement mappings
- Enhanced suggestions with 35+ carnitina variations
- Search analytics service for monitoring
- X-Ray tracing utilities
- Backend shared query utils
- Zero cascade dependencies

Fixes #<issue-number> - 404 error on carnitina search

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push a remote
git push origin main

# Vercel desplegará automáticamente
# Ver progreso: https://vercel.com/<tu-proyecto>/deployments
```

### Paso 2: Verificar Deploy Frontend

```bash
# Una vez desplegado en Vercel
curl -X POST https://tu-dominio.vercel.app/api/portal/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{"query":"test","timestamp":1234567890,"success":true,"studiesFound":10,"suggestionsOffered":[]}],
    "batchId":"test123",
    "timestamp":1234567890,
    "userAgent":"test"
  }'

# Debe retornar: {"success":true,"received":1,...}
```

### Paso 3: Test en Navegador

1. **Ir a**: `https://tu-dominio.vercel.app/portal`
2. **Buscar**: "carnitina"
3. **Verificar**: Se muestra sugerencia "¿Buscabas L-Carnitine?"
4. **Click en sugerencia**: Búsqueda "L-Carnitine" debe funcionar

---

## 🔧 Paso 4: Deploy Backend (Opcional - para búsqueda directa)

### 4.1: Verificar que content-enricher Lambda existe

```bash
aws lambda list-functions --region us-east-1 | grep content-enricher
```

### 4.2: Actualizar content-enricher con query expansion

```bash
# Editar handler en Lambda existente
cd backend/lambda/content-enricher

# Copiar shared utils
cp ../shared/query-utils.js ./

# Agregar al handler.js (inicio del archivo):
```

```javascript
const { expandQuery } = require('./query-utils');

// En la función que busca estudios:
async function fetchStudies(category) {
  // NUEVO: Expandir query
  const expanded = expandQuery(category);
  console.log('[ContentEnricher] Query expanded:', expanded);

  // Buscar con TODAS las variaciones
  for (const variation of expanded.variations) {
    try {
      const studies = await searchPubMed(variation);
      if (studies.length > 0) {
        console.log(`[ContentEnricher] Found ${studies.length} studies with "${variation}"`);
        return studies;
      }
    } catch (error) {
      console.warn(`[ContentEnricher] Failed variation "${variation}":`, error.message);
      // Continuar con siguiente variación
    }
  }

  // Fallback: búsqueda original
  return await searchPubMed(category);
}
```

### 4.3: Deploy Lambda actualizada

```bash
# Crear zip con nueva función
zip -r content-enricher-updated.zip handler.js query-utils.js node_modules/

# Deploy
aws lambda update-function-code \
  --function-name suplementia-content-enricher \
  --zip-file fileb://content-enricher-updated.zip

# Publicar versión
aws lambda publish-version \
  --function-name suplementia-content-enricher \
  --description "Add query expansion for carnitina and other supplements"

# Ver logs
aws logs tail /aws/lambda/suplementia-content-enricher --follow
```

### 4.4: Test Backend

```bash
# Test directo a Lambda
aws lambda invoke \
  --function-name suplementia-content-enricher \
  --payload '{"category":"carnitina","age":35,"gender":"male"}' \
  response.json

cat response.json | jq '.studies | length'
# Debe retornar: > 0 (estudios encontrados)
```

---

## 📊 Verificación Post-Deploy

### Checklist de Funcionalidad

**Frontend**:
- [ ] Búsqueda "carnitina" muestra sugerencia "L-Carnitine"
- [ ] Búsqueda "magnesio" funciona (normaliza a "Magnesium")
- [ ] Búsqueda "omega 3" funciona (normaliza a "Omega-3")
- [ ] Analytics endpoint responde (POST /api/portal/analytics)
- [ ] Sin errores en consola del navegador

**Backend** (si desplegado):
- [ ] Lambda content-enricher encuentra estudios para "carnitina"
- [ ] X-Ray traces visibles en AWS Console
- [ ] CloudWatch logs muestran query expansion
- [ ] Sin errores 404 para carnitina

### Métricas de Éxito

Después de 24 horas de deployment:

```bash
# Ver analytics en Vercel logs
vercel logs <deployment-url> --since=24h | grep "Analytics"

# Buscar búsquedas fallidas
vercel logs <deployment-url> --since=24h | grep "Failed searches"

# X-Ray traces (si backend desplegado)
aws xray get-trace-summaries \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.search_query = "carnitina"'
```

**Target KPIs**:
- Success rate para "carnitina": >90%
- Suggestion acceptance: >60%
- Zero cascading failures
- Search latency: <3s

---

## 🚨 Rollback Plan

### Si Frontend tiene problemas

```bash
# Revertir en Vercel
# 1. Ir a: https://vercel.com/<proyecto>/deployments
# 2. Seleccionar deployment anterior
# 3. Click "Redeploy"

# O desde CLI
vercel rollback <deployment-url>
```

### Si Backend tiene problemas

```bash
# Revertir Lambda a versión anterior
PREVIOUS_VERSION=$(aws lambda list-versions-by-function \
  --function-name suplementia-content-enricher \
  --query 'Versions[-2].Version' --output text)

aws lambda update-alias \
  --function-name suplementia-content-enricher \
  --name PROD \
  --function-version $PREVIOUS_VERSION

echo "Rolled back to version: $PREVIOUS_VERSION"
```

---

## 🔍 Monitoring Post-Deploy

### Dashboards a Vigilar

**Vercel**:
- Deployment logs
- Function execution time
- Error rate

**AWS CloudWatch** (si backend desplegado):
- Lambda invocations
- Error rate
- Duration (p50, p90, p99)

**X-Ray** (si backend desplegado):
```bash
# Service map
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  | jq '.Services[] | select(.Name contains "content-enricher")'
```

### Alertas Recomendadas

```bash
# Alerta si >10 búsquedas fallan en 5 minutos
# (Configurar en CloudWatch Alarms o Vercel Notifications)

# Alerta si latencia >5s
# (Configurar threshold en X-Ray o Vercel Analytics)
```

---

## 📝 Post-Deploy Tasks

### Inmediato (primeras 24h)
- [ ] Verificar que "carnitina" funciona
- [ ] Revisar logs de analytics
- [ ] Confirmar cero errores 404 para carnitina
- [ ] Verificar que otros suplementos siguen funcionando

### Primera Semana
- [ ] Analizar métricas de suggestion acceptance
- [ ] Identificar búsquedas fallidas más comunes
- [ ] Agregar nuevos términos al normalizer si es necesario
- [ ] Ajustar fuzzy matching threshold si hay false positives

### Mejoras Futuras
- [ ] Agregar más variaciones de suplementos populares
- [ ] Implementar dashboard de analytics
- [ ] Configurar alertas automáticas
- [ ] A/B test de diferentes sugerencias

---

## 📚 Referencias

- **Análisis X-Ray**: `/docs/CARNITINA-FIX-XRAY-ANALYSIS.md`
- **Resumen Implementación**: `/docs/CARNITINA-FIX-IMPLEMENTATION-SUMMARY.md`
- **Buenas Prácticas Lambda**: `/backend/lambda/README.md`
- **Código Query Normalizer**: `/lib/portal/query-normalization/normalizer.ts`
- **Backend Shared Utils**: `/backend/shared/query-utils.js`

---

## ✅ Sign-Off Checklist

Antes de marcar como completo:

- [ ] TypeScript compila sin errores
- [ ] Commit creado con mensaje descriptivo
- [ ] Push a main completado
- [ ] Vercel deployment exitoso
- [ ] Test manual en producción pasó
- [ ] Analytics endpoint responde
- [ ] Documentación actualizada
- [ ] Equipo notificado del deployment

---

**Deployment Owner**: [Tu Nombre]
**Fecha**: 2025-11-21
**Status**: ✅ Frontend Ready | ⏳ Backend Optional
**Next Steps**: Deploy Frontend → Test → (Opcional) Deploy Backend
