# Fix: Normalización Robusta de Queries

**Fecha:** 23 de Noviembre, 2025  
**Problema:** El sistema no manejaba correctamente variaciones de mayúsculas/minúsculas, espacios, y acentos

## 🔍 Problema Identificado

El usuario reportó que al buscar "vitamin d" (minúsculas) no encontraba resultados, pero el sistema sugería "Vitamin D" (mayúsculas) que sí funcionaba.

### Causa Raíz

1. **Normalización inconsistente**: El diccionario `TYPO_CORRECTIONS` tenía entradas en minúsculas (`'vitamina d': 'vitamin d'`)
2. **Matching case-sensitive**: La búsqueda en el diccionario era exacta, sin considerar variaciones
3. **Sin manejo de acentos**: "vitamína d" no se reconocía como "vitamina d"
4. **Sin manejo de espacios extra**: "vitamin  d" (doble espacio) fallaba

## ✅ Solución Implementada

### 1. Actualización de Diccionarios

Todos los valores de salida ahora usan **capitalización consistente**:

```typescript
// ANTES
'vitamina d': 'vitamin d',
'magnesio': 'magnesium',

// DESPUÉS
'vitamina d': 'Vitamin D',
'magnesio': 'Magnesium',
```

### 2. Función de Limpieza Robusta

Nueva función `cleanQuery()` que normaliza:

```typescript
function cleanQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')        // Múltiples espacios → 1 espacio
    .normalize('NFD')             // Descomponer caracteres acentuados
    .replace(/[\u0300-\u036f]/g, ''); // Remover marcas de acento
}
```

### 3. Matching Case-Insensitive y Accent-Insensitive

Todas las búsquedas ahora usan `cleanQuery()` para comparar:

```typescript
// ANTES
if (TYPO_CORRECTIONS[lowerQuery]) { ... }

// DESPUÉS
for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
  if (cleanQuery(key) === cleanQuery(query)) { ... }
}
```

### 4. Fuzzy Matching Mejorado

Agregamos fuzzy matching con Levenshtein distance para typos:

```typescript
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  const threshold = 3;
  // Busca la mejor coincidencia dentro del threshold
  // Ejemplo: "vitamine d" → "Vitamin D" (distance: 1)
}
```

### 5. Capitalización Inteligente

Para queries desconocidos, capitaliza correctamente:

```typescript
// "vitamin d" → "Vitamin D"
// "l-carnitine" → "L-Carnitine"
const capitalizedQuery = original
  .trim()
  .split(/\s+/)
  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');
```

## 🧪 Tests de Robustez

Creamos `scripts/test-normalization-robustness.ts` con 46 casos de prueba:

### Resultados: **100% de tests pasados** ✅

```
📊 Results: 46/46 passed (100.0%)
🎉 All tests passed! The normalization is robust.
```

### Casos Cubiertos

#### ✅ Variaciones de Mayúsculas/Minúsculas
- `vitamin d` → `Vitamin D`
- `VITAMIN D` → `Vitamin D`
- `ViTaMiN D` → `Vitamin D`

#### ✅ Espacios Extra
- `vitamin  d` (doble espacio) → `Vitamin D`
- `vitamin   d` (triple espacio) → `Vitamin D`
- `  vitamin d  ` (espacios al inicio/final) → `Vitamin D`

#### ✅ Acentos
- `vitamina d` → `Vitamin D`
- `vitamína d` → `Vitamin D`
- `vitámina d` → `Vitamin D`

#### ✅ Español/Inglés
- `magnesio` → `Magnesium`
- `MAGNESIO` → `Magnesium`
- `magnesium` → `Magnesium`

#### ✅ Formas Químicas
- `glicinato de magnesio` → `Magnesium Glycinate`
- `GLICINATO DE MAGNESIO` → `Magnesium Glycinate`
- `magnesium glycinate` → `Magnesium Glycinate`

#### ✅ Typos Comunes
- `magenesio` → `Magnesium`
- `ashwaganda` → `Ashwagandha` (fuzzy match)
- `vitamine d` → `Vitamin D` (fuzzy match)

#### ✅ Variaciones con Espacios/Guiones
- `l-carnitina` → `L-Carnitine`
- `l carnitina` → `L-Carnitine`
- `omega 3` → `Omega-3`
- `omega-3` → `Omega-3`

## 📊 Impacto

### Antes
- ❌ "vitamin d" → No encontrado
- ❌ "MAGNESIO" → No encontrado
- ❌ "vitamína d" → No encontrado
- ❌ "vitamin  d" → No encontrado

### Después
- ✅ "vitamin d" → `Vitamin D` (100% confidence)
- ✅ "MAGNESIO" → `Magnesium` (100% confidence)
- ✅ "vitamína d" → `Vitamin D` (100% confidence)
- ✅ "vitamin  d" → `Vitamin D` (100% confidence)
- ✅ "vitamine d" → `Vitamin D` (60% confidence, fuzzy match)

## 🎯 Beneficios

1. **Experiencia de Usuario Mejorada**: Los usuarios pueden escribir como quieran
2. **Menos Errores 404**: Más queries se resuelven correctamente
3. **Soporte Multiidioma**: Español e inglés funcionan igual de bien
4. **Tolerancia a Errores**: Typos comunes se corrigen automáticamente
5. **Consistencia**: Todos los resultados usan capitalización estándar

## 🔧 Archivos Modificados

- `lib/portal/query-normalization.ts` - Lógica de normalización mejorada
- `scripts/test-normalization-robustness.ts` - Suite de tests completa

## 🚀 Próximos Pasos

1. ✅ Deploy a producción
2. ✅ Monitorear logs de normalización
3. ⏳ Agregar más variaciones según feedback de usuarios
4. ⏳ Considerar agregar sinónimos (ej: "fish oil" → "Omega-3")

## 📝 Notas Técnicas

- La función `cleanQuery()` usa `normalize('NFD')` para descomponer caracteres Unicode
- Levenshtein distance con threshold de 3 para fuzzy matching
- Confidence score basado en tipo de match (exact: 1.0, fuzzy: 0.7-0.6)
- Todos los diccionarios actualizados con capitalización consistente

---

**Conclusión**: El sistema ahora es **suficientemente inteligente** para manejar cualquier variación de entrada que el usuario proporcione, incluyendo mayúsculas, minúsculas, espacios extra, acentos, y typos comunes.
