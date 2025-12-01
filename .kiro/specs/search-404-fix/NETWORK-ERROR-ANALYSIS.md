# Análisis de Errores de Red - Búsqueda No Funciona

## Problema Reportado
El usuario reporta que "no funciona en absoluto la búsqueda" y proporciona logs de red mostrando múltiples requests de chunks de Next.js.

## Análisis del Flujo de Búsqueda

### Flujo Actual
1. Usuario ingresa búsqueda en `/portal` (app/portal/page.tsx)
2. Frontend llama a `/api/portal/quiz` (POST)
3. Quiz endpoint llama a `/api/portal/recommend` (POST)
4. Recommend endpoint llama a `/api/portal/enrich-v2` (POST)
5. Enrich-v2 procesa y retorna datos enriquecidos
6. Recommend transforma y retorna recomendación
7. Quiz retorna recomendación al frontend
8. Frontend navega a `/portal/results?q=...`

### Logs de Red Proporcionados
Los logs muestran SOLO requests de chunks de JavaScript de Next.js:
- `webpack-*.js`
- `fd9d1056-*.js`
- `117-*.js`
- `main-app-*.js`
- etc.

**NO HAY** requests a:
- `/api/portal/quiz`
- `/api/portal/recommend`
- `/api/portal/search`
- `/api/portal/enrich-v2`

## Diagnóstico

### Posibles Causas

#### 1. Error de JavaScript en el Frontend (MÁS PROBABLE)
Si hay un error de JavaScript antes de que se ejecute el fetch, nunca veremos el request en Network.

**Evidencia:**
- Los chunks de JS se cargan correctamente
- NO hay requests API en los logs
- Esto sugiere que el código nunca llega a ejecutar el fetch

**Verificar:**
- Console errors en el navegador
- Errores de TypeScript/compilación
- Errores en useIntelligentSearch hook
- Errores en el form submit handler

#### 2. Validación de Query Fallando
El código tiene validación de queries que puede bloquear la búsqueda:

```typescript
// En app/portal/page.tsx
const validation = validateSupplementQuery(query.trim());
if (!validation.valid) {
  setValidationError(validation.error || 'Búsqueda inválida');
  return; // ❌ BLOQUEA LA BÚSQUEDA
}
```

**Verificar:**
- ¿Qué query está intentando el usuario?
- ¿Está pasando la validación?
- ¿Se muestra el error de validación en la UI?

#### 3. Estado de Loading Bloqueado
Si `isLoading` se queda en `true`, el botón de búsqueda puede estar deshabilitado.

#### 4. Combobox Interfiriendo con Form Submit
El Combobox de Headless UI puede estar capturando el evento de submit.

## Acciones Inmediatas Requeridas

### 1. Verificar Console Errors
```bash
# Abrir DevTools → Console
# Buscar errores en rojo
```

### 2. Verificar Network Tab Completo
```bash
# DevTools → Network
# Filtrar por "Fetch/XHR"
# Intentar búsqueda
# ¿Aparece algún request a /api/?
```

### 3. Verificar Estado del Botón
```bash
# Inspeccionar el botón de búsqueda
# ¿Tiene disabled?
# ¿Qué clases CSS tiene?
```

### 4. Test Manual de Validación
```javascript
// En Console del navegador
import { validateSupplementQuery } from '@/lib/portal/query-validator';
validateSupplementQuery('vitamina d');
validateSupplementQuery('ashwagandha');
validateSupplementQuery('omega-3');
```

## Soluciones Propuestas

### Solución 1: Agregar Logging Detallado
Agregar console.log en puntos críticos:

```typescript
// En app/portal/page.tsx - handleSearch
const handleSearch = (query: string) => {
  console.log('[handleSearch] Called with:', query);
  
  if (!query?.trim()) {
    console.log('[handleSearch] Empty query, returning');
    return;
  }

  const validation = validateSupplementQuery(query.trim());
  console.log('[handleSearch] Validation result:', validation);

  if (!validation.valid) {
    console.log('[handleSearch] Validation failed:', validation.error);
    setValidationError(validation.error || 'Búsqueda inválida');
    return;
  }

  console.log('[handleSearch] Validation passed, navigating...');
  setIsLoading(true);
  router.push(`/portal/results?q=${encodeURIComponent(searchTerm)}`);
};
```

### Solución 2: Bypass Temporal de Validación
Para debugging, temporalmente deshabilitar validación:

```typescript
// TEMPORAL - SOLO PARA DEBUG
const handleSearch = (query: string) => {
  if (!query?.trim()) return;
  
  // SKIP VALIDATION
  setIsLoading(true);
  router.push(`/portal/results?q=${encodeURIComponent(query.trim())}`);
};
```

### Solución 3: Verificar Form Submit
Asegurar que el form submit funciona:

```typescript
<form
  onSubmit={(e) => {
    e.preventDefault();
    console.log('[Form] Submit triggered');
    console.log('[Form] searchQuery:', searchQuery);
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      console.log('[Form] Empty searchQuery');
    }
  }}
>
```

### Solución 4: Verificar Combobox
El Combobox puede estar interfiriendo:

```typescript
<Combobox
  value={searchQuery}
  onChange={(value) => {
    console.log('[Combobox] onChange:', value);
    if (value) {
      handleSearch(value);
    }
  }}
>
```

## Información Adicional Necesaria

Para diagnosticar correctamente, necesitamos:

1. **Console logs completos** del navegador
2. **Network tab completo** (filtrado por Fetch/XHR)
3. **Query específico** que el usuario está intentando buscar
4. **Screenshots** de:
   - La página de búsqueda
   - El error (si hay alguno visible)
   - DevTools Console
   - DevTools Network

## Próximos Pasos

1. ✅ Documentar el problema
2. ⏳ Obtener información adicional del usuario
3. ⏳ Agregar logging detallado
4. ⏳ Reproducir el problema localmente
5. ⏳ Implementar fix
6. ⏳ Verificar en producción

## Notas

- Los chunks de JS se cargan correctamente, lo que indica que Next.js está funcionando
- La ausencia de requests API sugiere que el problema está en el frontend, no en el backend
- Necesitamos más información para diagnosticar correctamente
