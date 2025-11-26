# Checklist de Observabilidad: Error 404 en Búsquedas

## 🎯 Objetivo
Verificar el estado actual del sistema usando todas las herramientas de observabilidad disponibles antes de hacer cambios.

## ✅ VERIFICACIONES COMPLETADAS

### 1. Análisis de Código Local ✅

#### 1.1 Endpoint Existe
```bash
✅ app/api/portal/enrichment-status/[id]/route.ts existe
```

#### 1.2 Frontend Usa jobId Correctamente
```typescript
✅ Línea 443: const jobId = searchParams.get('id') || `job_${Date.now()}...`
✅ Línea 624: await fetch(`/api/portal/enrichment-status/${jobId}?supplement=...`)
✅ Línea 879: const jobId = `job_${Date.now()}...`
```

#### 1.3 Backend Genera jobId
```typescript
✅ app/api/portal/quiz/route.ts línea 76: 
   const jobId = request.headers.get('X-Job-ID') || `job_${Date.now()}...`
✅ Línea 145: createJob(jobId, 0)
✅ Línea 340: storeJobResult(jobId, 'completed', {...})
```

### 2. Análisis de Logs de Producción (Proporcionados)

#### 2.1 Patrón de Error
```
❌ GET /api/portal/enrichment-status/rec_1764154990810_qjmy32bfy → 404
❌ GET /api/portal/enrichment-status/rec_1764154991275_x3r8iuton → 404
❌ GET /api/portal/enrichment-status/rec_1764154990801_5p1jjal04 → 404
```

**Observación Crítica:** Los IDs en producción son `rec_*` pero el código local usa `job_*`

### 3. Hipótesis del Problema

#### Hipótesis A: Código Desactualizado en Producción ⚠️
- **Evidencia:** Logs muestran `rec_*` IDs
- **Código Local:** Usa `job_*` IDs
- **Conclusión:** El código desplegado en producción NO tiene los cambios recientes

#### Hipótesis B: Cache del Navegador 🤔
- **Posibilidad:** JavaScript cacheado en navegador del usuario
- **Probabilidad:** Baja (múltiples IDs diferentes sugieren requests nuevos)

#### Hipótesis C: Problema de Deployment 🎯
- **Más Probable:** Los cambios no se han desplegado a producción
- **Acción Requerida:** Verificar qué versión está en producción

## 📊 VERIFICACIONES PENDIENTES

### 4. CloudWatch Logs ⏳
**Acción Requerida:**
```bash
# Verificar logs del endpoint enrichment-status
aws logs tail /aws/lambda/portal-enrichment-status --follow --format short

# Buscar errores 404
aws logs filter-pattern /aws/lambda/portal-enrichment-status --filter-pattern "404"

# Verificar qué IDs están llegando
aws logs filter-pattern /aws/lambda/portal-enrichment-status --filter-pattern "jobId"
```

**Preguntas a Responder:**
- ¿Qué formato de IDs están llegando al endpoint? (`rec_*` o `job_*`)
- ¿Cuántos errores 404 hay en las últimas 24 horas?
- ¿Hay algún patrón temporal?

### 5. X-Ray Traces ⏳
**Acción Requerida:**
```bash
# Ver trazas de búsquedas recientes
aws xray get-trace-summaries --start-time $(date -u -d '1 hour ago' +%s) --end-time $(date -u +%s)

# Buscar trazas con errores 404
aws xray get-trace-summaries --filter-expression 'http.status = 404'
```

**Preguntas a Responder:**
- ¿Cuál es el flujo completo de una búsqueda que falla?
- ¿Dónde se genera el ID (`rec_*` vs `job_*`)?
- ¿El endpoint `/api/portal/quiz` está retornando `jobId`?

### 6. Sentry Errors ⏳
**Acción Requerida:**
```bash
# Buscar errores relacionados con enrichment-status
# En Sentry Dashboard:
# - Filtrar por: url:*enrichment-status*
# - Timeframe: Last 24 hours
# - Agrupar por: error.type
```

**Preguntas a Responder:**
- ¿Cuántos usuarios están afectados?
- ¿Hay stack traces que muestren dónde se genera el ID?
- ¿Hay errores relacionados en el frontend?

### 7. Verificar Deployment en Producción ⏳
**Acción Requerida:**
```bash
# Verificar última versión desplegada
vercel ls --prod

# Ver logs de deployment
vercel logs [deployment-url]

# Verificar variables de entorno
vercel env ls
```

**Preguntas a Responder:**
- ¿Cuándo fue el último deployment?
- ¿Los cambios de jobId están incluidos?
- ¿Hay algún error en el build?

## 🔍 ANÁLISIS PRELIMINAR

### Conclusión Basada en Evidencia Actual

**PROBLEMA IDENTIFICADO:**
El código en producción está usando `rec_*` IDs mientras que el código local (modificado) usa `job_*` IDs.

**CAUSA MÁS PROBABLE:**
Los cambios implementados NO están desplegados en producción.

**EVIDENCIA:**
1. ✅ Código local usa `jobId` correctamente
2. ❌ Logs de producción muestran `rec_*` IDs
3. ❌ Endpoint retorna 404 porque busca `rec_*` en job-store que espera `job_*`

### Próximos Pasos ANTES de Corregir

1. **VERIFICAR DEPLOYMENT** ⚠️
   - Confirmar qué versión está en producción
   - Verificar si los cambios de `jobId` están desplegados
   - Si NO están desplegados → Hacer deployment
   - Si SÍ están desplegados → Investigar más profundo

2. **VERIFICAR CLOUDWATCH** 📊
   - Ver logs reales del endpoint
   - Confirmar qué IDs están llegando
   - Verificar si job-store tiene los jobs

3. **VERIFICAR X-RAY** 🔍
   - Trazar flujo completo de búsqueda
   - Identificar dónde se genera el ID incorrecto
   - Verificar integración entre endpoints

4. **VERIFICAR SENTRY** 🚨
   - Confirmar impacto en usuarios
   - Ver stack traces completos
   - Identificar patrones de error

## ⚠️ REGLA DE ORO

**NO HACER CAMBIOS HASTA:**
1. Confirmar que el problema existe en producción (no solo en logs antiguos)
2. Verificar qué versión del código está desplegada
3. Confirmar la causa raíz con datos de observabilidad
4. Tener un plan de rollback claro

## 📝 Siguiente Acción Inmediata

**PRIORIDAD 1:** Verificar deployment en producción
```bash
# Comando a ejecutar
vercel ls --prod
```

**PRIORIDAD 2:** Si deployment está actualizado, verificar CloudWatch
```bash
# Comando a ejecutar
aws logs tail /aws/lambda/portal-enrichment-status --since 1h
```

**PRIORIDAD 3:** Reproducir el problema en staging/local
```bash
# Test manual
curl -X POST http://localhost:3000/api/portal/quiz \
  -H "Content-Type: application/json" \
  -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}'

# Verificar respuesta incluye jobId (no rec_*)
# Luego hacer polling con ese jobId
```

---

**Fecha:** 2024-11-26
**Estado:** ⏳ VERIFICACIONES PENDIENTES
**Acción Requerida:** Ejecutar verificaciones de observabilidad antes de proceder
