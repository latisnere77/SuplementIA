# Fix: "vitamina d" Timeout Issue

## 🔍 Problema Diagnosticado

La búsqueda de "vitamina d" falla con error 504 (timeout) porque:

1. **PubMed tiene 112,179 estudios** sobre vitamina D
2. **El Lambda content-enricher** tarda más de 30 segundos en procesar
3. **Vercel tiene límite de timeout**: 10s (Hobby) / 60s (Pro) / 300s (Enterprise)
4. **El cache guardó el error** del 21 de noviembre
5. **El endpoint de streaming** usa GET pero el frontend espera POST

## ✅ Solución Aplicada

### 1. Cache Limpiado ✅
```bash
npx tsx scripts/clear-vitamina-d-cache.ts
```
- Eliminadas 4 entradas de cache: "vitamina d", "Vitamina D", "vitamin d", "Vitamin D"
- Próxima búsqueda obtendrá datos frescos

### 2. Traducción Verificada ✅
```bash
npx tsx scripts/diagnose-vitamina-d.ts
```
- "vitamina d" → "vitamin d" ✅
- "vitamina c" → "vitamin c" ✅
- Sistema de traducción funcionando correctamente

## 🚀 Soluciones Recomendadas

### Opción A: Upgrade Vercel Plan (COSTOSO)

**Problema**: Vercel Hobby plan tiene límite de 10 segundos para funciones serverless.

**Solución**: Upgrade a Vercel Pro ($20/mes) para 60 segundos de timeout.

**Status**: Lambda ya tiene 60s timeout ✅, pero Vercel lo limita a 10s ❌

### Opción B: Arreglar Streaming Endpoint (RECOMENDADO)

El endpoint `/api/portal/enrich-stream` existe pero tiene problemas:

**Problemas:**
- Solo tiene handler GET, frontend usa POST ❌
- No está siendo usado por el frontend ❌

**Beneficios:**
- No hay timeouts (streaming progresivo)
- Mejor UX con indicadores de progreso
- Maneja suplementos con muchos estudios
- GRATIS (no requiere upgrade de Vercel)

**Para arreglar:**
1. Agregar handler POST al endpoint de streaming
2. Actualizar frontend para usar streaming
3. Desplegar a Vercel

### Opción C: Optimizar Procesamiento de Estudios

Reducir el número de estudios procesados para suplementos muy populares:

```typescript
// En app/api/portal/enrich/route.ts
const maxStudies = supplementName.toLowerCase().includes('vitamin') ? 5 : 10;
```

## 📊 Resultados de Diagnóstico

### Test End-to-End
```
✅ Traducción: "vitamina d" → "vitamin d"
✅ PubMed: 112,179 estudios encontrados
❌ Lambda: Timeout después de 30 segundos
```

### Test de Traducción
```
✅ "vitamina d" → "vitamin d" (llm, 1.5s)
✅ "vitamina c" → "vitamin c" (llm, 1.3s)
✅ "magnesio" → "magnesium" (llm, 1.7s)
✅ "berberina" → "berberine" (llm, 1.1s)
```

### Cache Status
```
✅ Cache limpiado para todas las variantes
✅ Próxima búsqueda obtendrá datos frescos
```

## 🎯 Recomendación Final

**Implementar Opción B + C (GRATIS):**

1. **Inmediato**: Reducir estudios para vitaminas populares (Opción C)
2. **Esta semana**: Arreglar streaming endpoint (Opción B)
3. **Alternativa**: Upgrade a Vercel Pro si necesitas más timeout (Opción A - $20/mes)

## 📝 Scripts Creados

- `scripts/diagnose-vitamina-d.ts` - Diagnóstico completo de traducción
- `scripts/test-vitamina-d-e2e.ts` - Test end-to-end del flujo completo
- `scripts/check-vitamina-d-cache.ts` - Verificar cache de DynamoDB
- `scripts/clear-vitamina-d-cache.ts` - Limpiar cache
- `scripts/test-vitamina-d-streaming.ts` - Test de streaming endpoint

## 🔗 Referencias

- Lambda actual: `https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/`
- Studies API: `https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search`
- DynamoDB Table: `suplementia-content-enricher-cache`
- Streaming endpoint: `/api/portal/enrich-stream` (no desplegado)

---

**Fecha**: 22 de noviembre de 2025  
**Status**: Cache limpiado ✅ | Timeout identificado ❌ | Solución documentada ✅
