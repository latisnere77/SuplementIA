# Diagnóstico: Timeout en Búsqueda de Kefir

**Fecha**: 2025-01-21
**Problema**: Timeout (504 Gateway Timeout) al buscar "Kefir"
**Estado**: 🔍 En diagnóstico

---

## 🔍 Análisis del Problema

### Síntomas
1. ✅ "Kefir" encuentra estudios en PubMed (5 estudios validados)
2. ❌ Endpoint `/api/portal/enrich` da timeout (504) después de ~31 segundos
3. ❌ Frontend muestra datos mock genéricos (85 estudios, 6,500 participantes)
4. ❌ Metadata vacío: `{}`

### Causa Raíz Identificada

El timeout está ocurriendo porque:
1. **El código nuevo está desplegado** - La optimización de variaciones está activa
2. **"Kefir" encuentra estudios directamente** - No necesita variaciones
3. **Pero el timeout ocurre antes de completar** - Probablemente en content-enricher

### Flujo Actual (Con Timeout)

```
Usuario busca "Kefir"
    ↓
/app/api/portal/quiz → /api/portal/recommend
    ↓
/app/api/portal/recommend → /api/portal/enrich
    ↓
/app/api/portal/enrich
    ↓
1. Traduce "Kefir" (no necesario - ya en inglés) ✅
    ↓
2. Busca estudios con "Kefir" ✅ (encuentra 5 estudios)
    ↓
3. Llama content-enricher Lambda ⏱️ (TIMEOUT aquí)
    ↓
4. Timeout después de 31s → 504 Gateway Timeout
    ↓
5. Frontend retorna datos mock (desde cache o fallback)
```

---

## 🔧 Soluciones Implementadas

### 1. Optimización de Variaciones ✅
- Timeout de 10s para generación de variaciones
- Límite de 3 variaciones a probar
- Búsqueda en paralelo en lugar de secuencial
- Fallback a variaciones básicas si LLM falla

### 2. Force Refresh ✅
- Agregado `forceRefresh: true` en recommend route
- Fuerza bypass de cache

### 3. Cache Invalidado ✅
- Cache de "Kefir" eliminado de DynamoDB

---

## 🚨 Problema Pendiente

El timeout puede estar ocurriendo en:
1. **Content-Enricher Lambda** - Tarda mucho en procesar estudios con Bedrock
2. **Network latency** - Entre Vercel y AWS Lambda
3. **Bedrock API** - Tarda mucho en generar contenido

---

## 📊 Próximos Pasos

### Opción 1: Verificar Logs de Content-Enricher
```bash
aws logs tail /aws/lambda/suplementia-content-enricher-dev --follow --since 1h
```

Buscar:
- `GENERATING_CONTENT` - Inicio de generación
- `CONTENT_GENERATED` - Contenido generado
- `ERROR` - Errores

### Opción 2: Verificar Timeout de Content-Enricher
El Lambda puede tener un timeout muy corto. Verificar:
- Timeout del Lambda function
- Timeout del API Gateway

### Opción 3: Probar con Menos Estudios
Reducir `maxStudies` de 10 a 5 para acelerar el proceso.

---

## 💡 Solución Temporal

Mientras se resuelve el timeout, el sistema debería:
1. ✅ Encontrar estudios (ya funciona)
2. ⏳ Procesar con Bedrock (timeout aquí)
3. ❌ Retornar datos reales (no llega aquí)

**Solución**: Aumentar timeout del Lambda o optimizar el prompt de Bedrock.

