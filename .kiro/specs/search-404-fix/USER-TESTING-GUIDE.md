# 🧪 User Testing Guide - Search 404 Fix

## Quick Start (5 minutos)

El fix está implementado y listo para probar. Sigue estos pasos para validar que funciona correctamente.

## Paso 1: Iniciar Dev Server

```bash
npm run dev
```

Espera a que aparezca:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

## Paso 2: Abrir Browser con DevTools

1. Abre: http://localhost:3000/portal
2. Presiona `F12` (Windows/Linux) o `Cmd+Option+I` (Mac)
3. Click en pestaña "Console"
4. Click en pestaña "Network"

## Paso 3: Test Principal - Búsqueda Directa

### Acción
1. En el buscador, escribe: **magnesium**
2. Selecciona "Magnesium" del autocomplete
3. Observa la consola y network tab

### ✅ Resultado Esperado

**Console debe mostrar:**
```
✅ Supplement found: "magnesium" → "Magnesium"
[Direct Search] Activating async enrichment for: Magnesium
[Render] Branch: ASYNC_ENRICHMENT
🚀 Starting async enrichment for: Magnesium
✅ Enrichment started - Job ID: job_1764164034180_abc123
🔍 Polling status (1/60, retry: 0/3, backoff: 2000ms)...
📊 Status: processing (HTTP 202)
🔍 Polling status (2/60, retry: 0/3, backoff: 2000ms)...
✅ Enrichment completed!
[Async Enrichment] Completed
```

**Network debe mostrar:**
```
POST /api/portal/enrich-async → 202 Accepted
GET /api/portal/enrichment-status/job_* → 202 (processing)
GET /api/portal/enrichment-status/job_* → 200 (completed)
```

**UI debe mostrar:**
1. Loading spinner con mensaje "Analizando Magnesium..."
2. Después de 3-5 segundos: Recomendación completa
3. URL actualizada a: `/portal/results?id=job_*&supplement=Magnesium`

### ❌ NO Debe Aparecer

**Console NO debe mostrar:**
```
❌ GET /api/portal/enrichment-status/job_* 404
❌ Job not found
❌ Invalid response: {status: 404}
```

**Network NO debe mostrar:**
```
❌ 404 errors en /api/portal/enrichment-status/*
```

## Paso 4: Test de Error Handling

### Acción
1. Busca: **xyz123invalid**
2. Presiona Enter

### ✅ Resultado Esperado
- Mensaje de error: "No encontramos estudios científicos..."
- Sugerencias de supplements alternativos
- Botón "Buscar de nuevo"

## Paso 5: Test de Múltiples Búsquedas

### Acción
1. Busca: **omega 3**
2. Espera resultado
3. Busca: **vitamin c**
4. Espera resultado

### ✅ Resultado Esperado
- Ambas búsquedas completan exitosamente
- Cada una crea un nuevo jobId
- No hay errores en consola

## Reportar Resultados

### Si TODO Funciona ✅
Responde con:
```
✅ Test 1 (Búsqueda Directa): PASS
✅ Test 2 (Error Handling): PASS
✅ Test 3 (Múltiples Búsquedas): PASS

Listo para deployment.
```

### Si Algo Falla ❌
Comparte:
1. **Screenshot de Console** (con los logs)
2. **Screenshot de Network tab** (filtrado por Fetch/XHR)
3. **Qué término buscaste**
4. **Qué esperabas vs qué obtuviste**

## Troubleshooting

### Problema: No aparecen logs en Console
**Solución:**
1. Verifica que dev server esté corriendo
2. Hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
3. Limpia cache del navegador

### Problema: Sigue apareciendo 404
**Solución:**
1. Verifica que el código esté actualizado: `git pull`
2. Reinstala dependencias: `npm install`
3. Reinicia dev server: `Ctrl+C` y `npm run dev`

### Problema: Infinite loading
**Solución:**
1. Revisa console para errores
2. Revisa network para requests fallidos
3. Verifica que el backend esté respondiendo

## Siguiente Paso

Una vez que los tests pasen, procederemos con:
1. Commit de cambios
2. Push a main
3. Deploy automático a Vercel
4. Smoke tests en producción

## Tiempo Estimado

- **Testing**: 5-10 minutos
- **Deployment**: 5 minutos (automático)
- **Monitoring**: 24 horas

## Preguntas Frecuentes

### ¿Qué pasa si el test falla?
No hay problema. Compartirás los logs y ajustaremos el código.

### ¿Necesito hacer algo en el backend?
No. El fix es solo frontend. El backend ya está funcionando correctamente.

### ¿Puedo probar con otros términos?
Sí. Prueba con: calcium, ashwagandha, creatine, vitamin d, etc.

### ¿Qué pasa si veo warnings en console?
Los warnings son normales. Solo nos preocupan los errores (en rojo).

## Contacto

Si tienes dudas o problemas durante el testing, comparte:
- Screenshot de console
- Screenshot de network
- Descripción del problema

---

**Status**: ⏳ Awaiting User Testing

**Next**: Run Test 1 (Búsqueda Directa) above
