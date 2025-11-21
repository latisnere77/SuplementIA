# Fix: Búsqueda de Cilantro y Traducciones Español→Inglés

**Fecha**: 2025-01-21
**Issue**: Búsquedas de ingredientes en español (como "cilantro") no retornaban datos reales
**Causa Raíz**: Faltaban traducciones en el mapa de fallback y el LLM no estaba siendo suficientemente agresivo con traducciones
**Estado**: ✅ Resuelto

---

## 🐛 Problema Identificado

Cuando se buscaba "cilantro" (o otros términos en español), el sistema mostraba:
- ⚠️ Warning: "No real data found for: Cilantro"
- Metadata vacío: `{}`
- Datos mock genéricos en lugar de datos reales de PubMed

### Causa Raíz

1. **"cilantro" no estaba en el mapa de traducciones** - El mapa `COMMON_ABBREVIATIONS` no incluía la traducción "cilantro" → "coriander"
2. **El LLM no era suficientemente agresivo** - El prompt del LLM no enfatizaba lo suficiente la necesidad de traducir términos en español
3. **Logging insuficiente** - No se podía rastrear fácilmente por qué fallaba la traducción

---

## ✅ Solución Implementada

### 1. Agregadas Traducciones Comunes al Mapa de Fallback

**Archivo**: `app/api/portal/enrich/route.ts`

Se agregaron traducciones de hierbas y especias comunes al mapa `COMMON_ABBREVIATIONS`:

```typescript
// Herbs and spices (Spanish → English)
'cilantro': 'coriander',
'perejil': 'parsley',
'romero': 'rosemary',
'albahaca': 'basil',
'orégano': 'oregano',
'oregano': 'oregano',
'tomillo': 'thyme',
'menta': 'mint',
'canela': 'cinnamon',
'comino': 'cumin',
'ajo': 'garlic',
'cebolla': 'onion',
'pimienta': 'pepper',
'pimienta negra': 'black pepper',
'pimienta cayena': 'cayenne pepper',
```

**Ventaja**: Traducción instantánea sin depender del LLM (más rápido y confiable)

### 2. Mejorado el Prompt del LLM

**Archivo**: `lib/services/abbreviation-expander.ts`

Se mejoró el prompt para ser más agresivo con traducciones español→inglés:

- Agregadas instrucciones explícitas: "Be aggressive with Spanish→English translation"
- Agregados ejemplos específicos: "cilantro" → "coriander", "jengibre" → "ginger"
- Enfatizado que PubMed requiere términos en inglés

**Ventaja**: El LLM ahora traduce términos en español incluso si no están en el mapa de fallback

### 3. Logging Estructurado Mejorado

**Archivos modificados**:
- `app/api/portal/enrich/route.ts`
- `lib/services/abbreviation-expander.ts`

Se agregó logging estructurado en cada paso del proceso de traducción:

- `QUERY_TRANSLATION_START` - Inicio del proceso
- `QUERY_LLM_EXPANSION_START` - LLM comenzando
- `QUERY_LLM_EXPANSION_RESULT` - Resultado del LLM
- `QUERY_TRANSLATED` - Traducción exitosa
- `QUERY_TRANSLATION_FAILED` - Error en traducción
- `LLM_EXPANSION_RESPONSE` - Respuesta raw del LLM
- `LLM_EXPANSION_SUCCESS` / `LLM_EXPANSION_ERROR` - Resultado del LLM

**Ventaja**: Ahora se puede rastrear exactamente qué está pasando en cada paso

### 4. Verificado Manejo de 404

**Archivo**: `app/api/portal/quiz/route.ts`

Se verificó y mejoró el logging para distinguir claramente:
- **404 (insufficient_data)**: Backend responde pero no hay datos → Retorna 404, NO usa mock data
- **Backend unreachable**: Error de red/timeout → Usa mock data como fallback

**Ventaja**: No se usa mock data incorrectamente cuando el backend retorna 404

---

## 📊 Flujo de Traducción

```
Usuario busca "cilantro"
    ↓
/app/api/portal/enrich
    ↓
1. Verifica mapa COMMON_ABBREVIATIONS
   ✅ "cilantro" → "coriander" (encontrado)
    ↓
2. Si no está en mapa, llama LLM
   (No necesario en este caso)
    ↓
3. Busca en PubMed con "coriander"
    ↓
4. Encuentra estudios reales
    ↓
5. Retorna datos reales
```

---

## 🔍 Cómo Agregar Nuevas Traducciones

Si encuentras otro término en español que no funciona:

### Opción 1: Agregar al Mapa de Fallback (Recomendado)

Editar `app/api/portal/enrich/route.ts` y agregar al mapa `COMMON_ABBREVIATIONS`:

```typescript
const COMMON_ABBREVIATIONS: Record<string, string> = {
  // ... traducciones existentes ...
  'nuevo-termino': 'english-term',
};
```

**Ventajas**:
- ✅ Instantáneo (no requiere LLM)
- ✅ Confiable (no depende de API externa)
- ✅ Gratis (no consume tokens de Bedrock)

### Opción 2: Confiar en el LLM

El LLM ahora es más agresivo con traducciones, así que debería traducir automáticamente. Si no funciona, verifica los logs:

```bash
# Buscar en CloudWatch logs
npx tsx scripts/trace-search-cloudwatch.ts "nuevo-termino"
```

Busca eventos:
- `QUERY_LLM_EXPANSION_RESULT` - Ver si el LLM tradujo
- `LLM_EXPANSION_RESPONSE` - Ver respuesta raw del LLM

---

## 🧪 Validación

### Prueba Exitosa: "cilantro"

**Antes**:
- ❌ "No real data found for: Cilantro"
- ❌ Metadata vacío
- ❌ Datos mock genéricos

**Después**:
- ✅ Traducción: "cilantro" → "coriander"
- ✅ Estudios encontrados en PubMed
- ✅ Datos reales retornados
- ✅ Información detallada sobre beneficios, dosis, contraindicaciones

### Cómo Probar Otros Términos

1. Buscar el término en la aplicación
2. Verificar en la consola del navegador que no aparezca el warning "No real data found"
3. Verificar que la metadata tenga `hasRealData: true` y `studiesUsed > 0`
4. Si falla, usar scripts de tracing:
   ```bash
   ./scripts/trace-full-flow.sh "termino-a-probar" --hours 24
   ```

---

## 📝 Archivos Modificados

1. `app/api/portal/enrich/route.ts`
   - Agregadas traducciones al mapa `COMMON_ABBREVIATIONS`
   - Mejorado logging del proceso de traducción

2. `lib/services/abbreviation-expander.ts`
   - Mejorado prompt del LLM para traducciones
   - Agregado logging estructurado completo

3. `app/api/portal/quiz/route.ts`
   - Mejorado logging para distinguir 404 vs backend unreachable

---

## 🚀 Mejora Adicional: Generación Automática de Variaciones

**Fecha**: 2025-01-21 (Post-fix)
**Mejora**: Sistema ahora genera variaciones automáticamente cuando no encuentra estudios

### Problema con "Kefir"

Cuando se buscaba "Kefir" (término ya en inglés), el sistema no encontraba estudios porque:
- No necesita traducción (ya está en inglés)
- Pero puede necesitar variaciones como "kefir milk", "kefir grains", etc.

### Solución Implementada

Se agregó un sistema inteligente que:

1. **Después de 3 intentos sin resultados**, genera variaciones usando el LLM
2. **Prueba cada variación** automáticamente hasta encontrar estudios
3. **Usa la primera variación que funcione**

**Archivo**: `lib/services/abbreviation-expander.ts`
- Nueva función: `generateSearchVariations()`
- Genera 3-5 variaciones inteligentes usando Claude Haiku

**Archivo**: `app/api/portal/enrich/route.ts`
- Modificado para probar variaciones cuando no encuentra estudios
- Logging estructurado para rastrear qué variación funcionó

### Ejemplo de Flujo Mejorado

```
Usuario busca "Kefir"
    ↓
1. Verifica traducción (no necesaria - ya en inglés)
    ↓
2. Busca "Kefir" en PubMed (3 intentos con diferentes filtros)
    ↓
3. No encuentra estudios
    ↓
4. Genera variaciones: ["kefir", "kefir milk", "kefir grains", "kefir supplementation"]
    ↓
5. Prueba "kefir milk" → ✅ Encuentra estudios
    ↓
6. Retorna datos reales
```

---

## 🚀 Próximos Pasos

Si encuentras más términos que no funcionan:

1. **Agregar al mapa de fallback** si es un término común
2. **El sistema ahora genera variaciones automáticamente** - debería funcionar para la mayoría de casos
3. **Verificar logs** para ver qué variación funcionó
4. **Documentar** nuevas traducciones agregadas si es necesario

---

## 📚 Referencias

- [TRACING-GUIDE.md](./TRACING-GUIDE.md) - Guía completa de debugging con CloudWatch y X-Ray
- [SPANISH-QUERY-FIX.md](./SPANISH-QUERY-FIX.md) - Fix anterior para búsquedas en español

