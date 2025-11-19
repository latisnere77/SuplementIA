# Debug: Autocomplete No Funciona en Producción

**Fecha:** 19 de noviembre de 2025
**URL:** https://suplementia.vercel.app/portal
**Problema:** Autocomplete no muestra sugerencias

---

## ✅ Verificaciones Realizadas

### 1. API Endpoint - ✅ FUNCIONA
```bash
# Endpoint responde correctamente
curl "https://suplementia.vercel.app/api/portal/autocomplete?q=sleep&lang=en&limit=5"

# Resultado:
{
  "success": true,
  "suggestions": [
    {"text": "Sleep", "type": "category", "score": 100},
    {"text": "Improve sleep quality", "type": "popular", "score": 57}
  ],
  "meta": {
    "query": "sleep",
    "lang": "en",
    "count": 2,
    "requestId": "...",
    "duration": 1
  }
}
```

**Conclusión:** El backend funciona perfectamente. El problema está en el frontend.

---

## 🔍 Pasos de Debugging

### Paso 1: Verificar Consola del Navegador

1. Abre https://suplementia.vercel.app/portal
2. Presiona F12 para abrir DevTools
3. Ve a la pestaña "Console"
4. Escribe algo en la barra de búsqueda
5. **Busca errores en rojo**

**Posibles errores a buscar:**
- `Failed to fetch`
- `useAutocomplete is not defined`
- `AutocompleteDropdown is not defined`
- `Cannot read property of undefined`
- Errores de CORS
- Errores de TypeScript

### Paso 2: Verificar Network Tab

1. En DevTools, ve a la pestaña "Network"
2. Filtra por "autocomplete"
3. Escribe "sleep" en la barra de búsqueda
4. **Verifica si se hace la llamada al API**

**Qué verificar:**
- ¿Se hace una request a `/api/portal/autocomplete`?
- ¿Cuál es el status code? (debería ser 200)
- ¿Qué devuelve la response?
- ¿Hay algún error CORS o 404?

### Paso 3: Verificar Elementos DOM

1. En DevTools, ve a la pestaña "Elements"
2. Busca el input de búsqueda
3. Inspecciona el div padre
4. **Busca si existe `<AutocompleteDropdown>` o el div del dropdown**

**Qué verificar:**
- ¿El dropdown se está renderizando pero está oculto (display: none)?
- ¿Hay problemas de z-index?
- ¿El div del dropdown existe en el DOM?

### Paso 4: Agregar Logging Temporal

Si no ves errores obvios, agrega logging temporal al código:

**Edita:** `lib/portal/useAutocomplete.tsx`

```typescript
useEffect(() => {
  console.log('[useAutocomplete] Query changed:', query);
  console.log('[useAutocomplete] Language:', language);

  if (query.length < minQueryLength) {
    console.log('[useAutocomplete] Query too short, skipping');
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
    return;
  }

  console.log('[useAutocomplete] Starting debounce...');

  const timeoutId = setTimeout(async () => {
    console.log('[useAutocomplete] Making API call...');
    setIsLoading(true);
    // ... resto del código
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: Build Fallido

**Síntomas:** Código viejo se está sirviendo
**Verificar:**
```bash
# Ver último deployment
vercel ls suplementia --prod
```

**Solución:**
```bash
# Forzar re-deploy
vercel --prod
```

### Problema 2: Cache del Navegador

**Síntomas:** Cambios no se reflejan
**Solución:**
1. Hard refresh: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
2. O abre en modo incógnito

### Problema 3: Variables de Entorno Faltantes

**Verificar en Vercel Dashboard:**
- Settings → Environment Variables
- Verificar que estén configuradas:
  - `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
  - `NEXT_PUBLIC_COGNITO_CLIENT_ID`
  - (otras variables...)

### Problema 4: Componente No Se Renderiza

**Causa posible:** Error en el import
**Verificar:**
```typescript
// En HealthSearchForm.tsx
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { useAutocomplete } from '@/lib/portal/useAutocomplete';
```

### Problema 5: TypeScript Error en Build

**Síntomas:** Build falla en Vercel
**Verificar logs de Vercel:**
- Dashboard → Deployments → [último deployment] → Build Logs

**Buscar errores como:**
```
Type error: ...
Property 'suggestions' does not exist on type...
```

### Problema 6: Runtime Error en Cliente

**Síntomas:** Página carga pero autocomplete no funciona
**Verificar:**
- Console del navegador
- Buscar errores de "Cannot read property" o "undefined"

---

## 🔧 Soluciones Rápidas

### Opción 1: Re-deploy Limpio

```bash
# En tu terminal local
cd /Users/latisnere/Documents/suplementia

# Limpiar cache
rm -rf .next

# Re-deploy a Vercel
git push origin main
```

### Opción 2: Verificar que el Código Está Actualizado

```bash
# Ver el último commit en GitHub
git log --oneline -1

# Debería mostrar:
# b69fc77 feat: agregar autocomplete multiidioma en barra de búsqueda
```

### Opción 3: Test Local

```bash
# Instalar dependencias limpias
rm -rf node_modules package-lock.json
npm install

# Iniciar dev server
npm run dev

# Abrir http://localhost:3000/portal
# Probar autocomplete
```

---

## 📊 Checklist de Verificación

Marca cada item después de verificarlo:

**Frontend:**
- [ ] Abrir https://suplementia.vercel.app/portal
- [ ] Abrir DevTools (F12)
- [ ] Console: ¿Hay errores?
- [ ] Network: ¿Se hace llamada a /api/portal/autocomplete?
- [ ] Elements: ¿Existe el dropdown en el DOM?
- [ ] Escribir "sleep" en input → ¿aparece dropdown?

**Backend:**
- [x] API endpoint funciona
- [x] Devuelve JSON válido
- [x] Responde en < 100ms

**Deployment:**
- [ ] Último commit es b69fc77
- [ ] Build en Vercel exitoso
- [ ] No hay errores en build logs
- [ ] Variables de entorno configuradas

---

## 📝 Información a Recopilar

Si el problema persiste, necesito esta información:

1. **Screenshot de la consola del navegador** (con errores si hay)
2. **Screenshot del Network tab** (mostrando si se hace la llamada)
3. **Build logs de Vercel** (si hay errores)
4. **¿El autocomplete funciona en local?** (npm run dev)

---

## 🚀 Próximos Pasos

1. **Primero:** Abre DevTools y verifica console
2. **Segundo:** Verifica Network tab
3. **Tercero:** Reporta los errores que encuentres
4. **Cuarto:** Probaré localmente si es necesario

---

**Esperando tu feedback con los resultados del debugging.**
