# 🔍 Diagnóstico: PQQ → EPA Mismatch

## 🚨 Problema Reportado

**Usuario buscó**: PQQ (Pyrroloquinoline quinone)  
**Sistema retornó**: EPA (Eicosapentaenoic acid)  
**Resultado**: ❌ ERROR CRÍTICO - Son sustancias completamente diferentes

---

## 🔎 Causa Raíz Identificada

### Problema en Fuzzy Matching

**Archivo**: `lib/portal/query-normalization.ts`

```typescript
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  const threshold = 3;  // ❌ PROBLEMA AQUÍ
  let bestMatch: { match: string; distance: number } | null = null;
  
  for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
    const cleanedKey = cleanQuery(key);
    const distance = levenshteinDistance(query, cleanedKey);
    
    if (distance <= threshold && distance > 0) {  // ❌ ACEPTA DISTANCIA 3
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { match: value, distance };
      }
    }
  }
  
  return bestMatch;
}
```

### ¿Por Qué Falla?

1. **Usuario busca**: "PQQ" (3 caracteres)
2. **Sistema limpia**: "pqq" (lowercase, sin acentos)
3. **Fuzzy matching busca en diccionario**:
   - Encuentra "epa" → "EPA"
   - Calcula distancia: `levenshteinDistance("pqq", "epa") = 3`
   - Threshold es 3, así que **lo acepta como match válido** ❌

4. **Resultado**: PQQ se mapea incorrectamente a EPA

---

## 📊 Análisis del Problema

### Levenshtein Distance: PQQ → EPA

```
P → E (substitución)
Q → P (substitución)  
Q → A (substitución)
Total: 3 cambios
```

**Distancia = 3** (100% de los caracteres son diferentes)

### Threshold Actual

```typescript
const threshold = 3;  // Acepta hasta 3 cambios
```

**Problema**: Para palabras cortas (3 caracteres), un threshold de 3 significa que acepta palabras **completamente diferentes**.

---

## 🎯 Soluciones Propuestas

### Solución 1: Threshold Relativo (RECOMENDADO)

En lugar de threshold fijo, usar **porcentaje de similitud**:

```typescript
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  const maxSimilarityThreshold = 0.4; // Máximo 40% de diferencia
  let bestMatch: { match: string; distance: number } | null = null;
  
  for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
    const cleanedKey = cleanQuery(key);
    const distance = levenshteinDistance(query, cleanedKey);
    const maxLength = Math.max(query.length, cleanedKey.length);
    const similarity = 1 - (distance / maxLength);
    
    // Solo aceptar si similitud > 60% (diferencia < 40%)
    if (similarity >= (1 - maxSimilarityThreshold) && distance > 0) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { match: value, distance };
      }
    }
  }
  
  return bestMatch;
}
```

**Ejemplo**:
- PQQ vs EPA: similitud = 1 - (3/3) = 0% → ❌ RECHAZADO
- PQQ vs PQO: similitud = 1 - (1/3) = 67% → ✅ ACEPTADO
- Magnesio vs Magenesio: similitud = 1 - (1/9) = 89% → ✅ ACEPTADO

### Solución 2: Threshold Mínimo de Longitud

No aplicar fuzzy matching a palabras muy cortas:

```typescript
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  // No fuzzy matching para palabras < 4 caracteres
  if (query.length < 4) {
    return null;
  }
  
  const threshold = 3;
  // ... resto del código
}
```

**Ventajas**: Simple, evita falsos positivos en acrónimos  
**Desventajas**: No corrige typos en palabras cortas (EPA → EAP)

### Solución 3: Threshold Adaptativo

Ajustar threshold según longitud de palabra:

```typescript
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  // Threshold adaptativo: 1 para palabras cortas, 2-3 para largas
  const threshold = Math.min(Math.floor(query.length / 3), 3);
  
  // query.length = 3 → threshold = 1
  // query.length = 6 → threshold = 2
  // query.length = 9+ → threshold = 3
  
  // ... resto del código
}
```

---

## 🧪 Casos de Prueba

### Casos que DEBEN funcionar después del fix

| Input | Expected | Current | After Fix |
|-------|----------|---------|-----------|
| PQQ | PQQ | EPA ❌ | PQQ ✅ |
| EPA | EPA | EPA ✅ | EPA ✅ |
| DHA | DHA | DHA ✅ | DHA ✅ |
| CoQ10 | CoQ10 | CoQ10 ✅ | CoQ10 ✅ |
| HMB | HMB | HMB ✅ | HMB ✅ |
| BCAA | BCAA | BCAA ✅ | BCAA ✅ |

### Casos de typos que DEBEN seguir funcionando

| Input | Expected | Current | After Fix |
|-------|----------|---------|-----------|
| magenesio | Magnesium | Magnesium ✅ | Magnesium ✅ |
| vitamina d | Vitamin D | Vitamin D ✅ | Vitamin D ✅ |
| curcuma | Turmeric | Turmeric ✅ | Turmeric ✅ |

---

## 📋 Plan de Implementación

### Paso 1: Agregar PQQ al Diccionario

```typescript
const TYPO_CORRECTIONS: Record<string, string> = {
  // ... existing entries
  
  // Antioxidantes y Coenzimas
  'pqq': 'PQQ',
  'pirroloquinolina quinona': 'PQQ',
  'pyrroloquinoline quinone': 'PQQ',
  'coenzima q10': 'CoQ10',
  'coq10': 'CoQ10',
  // ...
};
```

### Paso 2: Implementar Threshold Relativo

Cambiar `findFuzzyMatch()` para usar similitud porcentual en lugar de threshold fijo.

### Paso 3: Testing

Crear suite de tests para validar:
- ✅ PQQ no se mapea a EPA
- ✅ Typos comunes siguen funcionando
- ✅ Acrónimos cortos no se confunden

### Paso 4: Monitoreo

Agregar logging para detectar futuros mismatches:

```typescript
if (bestMatch && similarity < 0.7) {
  console.warn(`Low confidence fuzzy match: "${query}" → "${bestMatch.match}" (${Math.round(similarity * 100)}% similar)`);
}
```

---

## 🎯 Impacto

### Antes (ROTO)
- ❌ PQQ → EPA (100% incorrecto)
- ❌ Cualquier acrónimo de 3 letras puede mapear a otro
- ❌ Falsos positivos en fuzzy matching

### Después (FIXED)
- ✅ PQQ → PQQ (correcto)
- ✅ Fuzzy matching solo para similitud > 60%
- ✅ Acrónimos cortos protegidos
- ✅ Typos comunes siguen funcionando

---

## 🔍 Otros Acrónimos en Riesgo

Estos acrónimos también podrían tener problemas similares:

- NAC (N-Acetyl Cysteine)
- SAM (S-Adenosyl Methionine)
- TMG (Trimethylglycine)
- NMN (Nicotinamide Mononucleotide)
- NAD (Nicotinamide Adenine Dinucleotide)

**Recomendación**: Agregar todos al diccionario explícitamente.

---

## ✅ Conclusión

**Causa Raíz**: Threshold fijo de 3 en fuzzy matching permite que palabras completamente diferentes se consideren matches válidos.

**Solución**: Implementar threshold relativo basado en porcentaje de similitud (60% mínimo).

**Impacto**: Alto - Previene confusión entre suplementos completamente diferentes.

**Urgencia**: Crítica - Afecta la confiabilidad del sistema.
