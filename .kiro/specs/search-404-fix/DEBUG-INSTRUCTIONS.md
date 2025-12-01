# Instrucciones de Debugging - Búsqueda No Funciona

## Cambios Realizados

He agregado logging detallado en el código para diagnosticar el problema. Ahora cada paso del flujo de búsqueda imprimirá información en la consola del navegador.

## Cómo Reproducir y Capturar Logs

### Paso 1: Abrir DevTools
1. Abre el sitio en Chrome/Firefox
2. Presiona `F12` o `Cmd+Option+I` (Mac) para abrir DevTools
3. Ve a la pestaña **Console**
4. Ve a la pestaña **Network** (en otra ventana/panel)

### Paso 2: Limpiar y Preparar
1. En Console: Click en el ícono 🚫 para limpiar logs anteriores
2. En Network: Click en el ícono 🚫 para limpiar requests anteriores
3. En Network: Asegúrate de que el filtro "Fetch/XHR" esté seleccionado

### Paso 3: Intentar Búsqueda
1. Ve a la página principal del portal (`/portal`)
2. Escribe un término de búsqueda (ej: "vitamina d", "ashwagandha", "omega-3")
3. Presiona Enter o click en el botón "Ir"

### Paso 4: Capturar Información

#### En Console, deberías ver logs como:
```
[PortalPage] 📝 Form submit triggered
[PortalPage] 📝 searchQuery value: vitamina d
[PortalPage] 📝 searchQuery trimmed: vitamina d
[PortalPage] 📝 searchQuery length: 10
[PortalPage] ✅ searchQuery is valid, calling handleSearch
[handleSearch] 🔍 Called with query: vitamina d
[handleSearch] ✅ Query is not empty, proceeding with validation
[handleSearch] 📋 Validation result: { valid: true, error: null, severity: null }
[handleSearch] ✅ Validation passed
[handleSearch] 🔄 Normalized query: { original: "vitamina d", normalized: "vitamin-d", confidence: 0.95, finalSearchTerm: "vitamin-d" }
[handleSearch] 🚀 Navigating to: /portal/results?q=vitamin-d&supplement=vitamin-d
```

#### En Network, deberías ver requests a:
- `/api/portal/quiz` (POST)
- `/api/portal/recommend` (POST)
- `/api/portal/enrich-v2` (POST)

### Paso 5: Reportar Resultados

Por favor, comparte:

1. **Screenshot de Console** con todos los logs
2. **Screenshot de Network** mostrando los requests (o la ausencia de ellos)
3. **El término de búsqueda** que intentaste usar
4. **Cualquier error en rojo** que aparezca en Console

## Escenarios Posibles

### Escenario A: No aparece ningún log
**Significado:** El código no se está ejecutando en absoluto
**Posibles causas:**
- Error de JavaScript bloqueando la ejecución
- Código no desplegado correctamente
- Cache del navegador

**Solución:**
1. Hacer hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
2. Verificar que estás en la URL correcta
3. Revisar si hay errores en rojo en Console

### Escenario B: Logs aparecen pero se detienen en validación
**Ejemplo:**
```
[handleSearch] 🔍 Called with query: test
[handleSearch] ✅ Query is not empty, proceeding with validation
[handleSearch] 📋 Validation result: { valid: false, error: "Query inválido", severity: "high" }
[handleSearch] ❌ Validation failed, showing error
```

**Significado:** La validación está bloqueando la búsqueda
**Solución:** Necesitamos ajustar las reglas de validación

### Escenario C: Logs completos pero no hay requests en Network
**Ejemplo:**
```
[handleSearch] 🚀 Navigating to: /portal/results?q=...
```
Pero no hay requests en Network tab.

**Significado:** La navegación funciona pero la página de resultados no hace requests
**Solución:** El problema está en `/portal/results/page.tsx`

### Escenario D: Requests aparecen pero fallan
**Ejemplo:**
Network muestra:
- `/api/portal/quiz` → 404 Not Found
- `/api/portal/quiz` → 500 Internal Server Error
- `/api/portal/quiz` → (pending forever)

**Significado:** El backend tiene problemas
**Solución:** Revisar logs del servidor

## Comandos Útiles para Debugging

### En Console del navegador:
```javascript
// Ver estado actual de React
window.__REACT_DEVTOOLS_GLOBAL_HOOK__

// Forzar navegación manual
window.location.href = '/portal/results?q=vitamina-d&supplement=vitamina-d'

// Test de validación
// (Nota: esto solo funciona si el módulo está expuesto)
```

### En terminal (para ver logs del servidor):
```bash
# Ver logs de Vercel (si está desplegado)
vercel logs

# Ver logs locales (si está corriendo localmente)
npm run dev
```

## Próximos Pasos Según Resultados

1. **Si no hay logs:** Verificar despliegue y cache
2. **Si validación falla:** Ajustar reglas de validación
3. **Si navegación falla:** Revisar router de Next.js
4. **Si requests fallan:** Revisar backend y APIs

## Contacto

Una vez que tengas los logs y screenshots, compártelos para continuar con el debugging.
