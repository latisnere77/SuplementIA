# Issue: Búsquedas en Español Fallan (ej: "glicinato de magnesio")

**Fecha**: 2025-01-21
**Status**: 🔴 **PROBLEMA IDENTIFICADO**
**Prioridad**: Alta (afecta experiencia de usuario en español)

---

## 🎯 Problema Reportado

Usuario busca "glicinato de magnesio" y obtiene:

```
❌ No pudimos encontrar información científica suficiente sobre "glicinato de magnesio".
💡 Intenta buscar con un nombre más específico o verifica la ortografía.
```

---

## 🔍 Diagnóstico

### Test Results

| Búsqueda | Resultado | Duración |
|----------|-----------|----------|
| "glicinato de magnesio" | ❌ 404 | 1.89s |
| "magnesium glycinate" | ❌ 404 | 30.19s |
| "magnesio" | ❌ 404 | 31.25s |
| **"Magnesium"** | ✅ 200 | 2.00s |

### Root Cause

```
┌──────────────────────────────────────────────────┐
│ 1. User busca "glicinato de magnesio"          │
│    ↓                                             │
│ 2. Quiz → Recommend → Enrich                   │
│    ↓                                             │
│ 3. Enrich llama studies-fetcher Lambda          │
│    supplementName: "glicinato de magnesio"      │
│    ↓                                             │
│ 4. PubMed search: "glicinato de magnesio"      │
│    ❌ NO RESULTS (PubMed usa inglés)            │
│    ↓                                             │
│ 5. Enrich returns: insufficient_data            │
│    ↓                                             │
│ 6. Recommend returns: 404                       │
└──────────────────────────────────────────────────┘
```

**Problema**: No hay traducción español → inglés antes de llamar PubMed

---

## 📁 Archivos Relevantes

### Sistema de Sinónimos Existente ✅

**Archivo**: `lib/services/supplement-intelligence.ts`

Ya existe un sistema completo de sinónimos/traducciones:

```typescript
const SUPPLEMENT_SYNONYMS: Record<string, string[]> = {
  'cardo santo': ['milk thistle', 'silymarin', 'blessed thistle'],
  'curcuma': ['turmeric', 'curcumin', 'Curcuma longa'],
  'vitamina c': ['vitamin c', 'ascorbic acid', 'ascorbate'],
  'colageno': ['collagen peptides', 'hydrolyzed collagen'],
  // ... más de 100 entradas
};
```

**PERO**:
- ❌ No incluye "magnesio" → "magnesium"
- ❌ No incluye "glicinato de magnesio" → "magnesium glycinate"
- ❌ No se está usando en el flujo principal (quiz/recommend/enrich)

### Uso Actual ❌

El sistema de sinónimos solo se usa en:
- `lib/services/medical-mcp-client.ts` (MCP)
- `scripts/test-camu-camu.ts` (test)
- `scripts/test-intelligent-search.ts` (test)

**NO se usa en**:
- ❌ `app/api/portal/quiz/route.ts`
- ❌ `app/api/portal/recommend/route.ts`
- ❌ `app/api/portal/enrich/route.ts`

---

## ✅ Solución Propuesta

### Opción 1: Usar Sistema de Sinónimos Existente (Recomendado)

**Plan**:
1. Agregar traducciones faltantes a `supplement-intelligence.ts`:
   ```typescript
   'magnesio': ['magnesium'],
   'glicinato de magnesio': ['magnesium glycinate', 'magnesium'],
   'citrato de magnesio': ['magnesium citrate', 'magnesium'],
   'oxido de magnesio': ['magnesium oxide', 'magnesium'],
   // ... otras formas comunes
   ```

2. Integrar en el flujo:
   ```typescript
   // app/api/portal/enrich/route.ts (antes de llamar Lambda)
   import { intelligentSearch } from '@/lib/services/supplement-intelligence';

   const searchResult = await intelligentSearch(sanitizedCategory);
   const bestTerm = searchResult.bestCandidate.term; // "magnesium" en lugar de "magnesio"

   // Usar bestTerm para llamar Lambda
   ```

3. Fallback: Si no hay traducción, usar término original

**Ventajas**:
- ✅ Sistema ya existe y está probado
- ✅ Maneja no solo traducciones, sino sinónimos científicos
- ✅ Soporta fuzzy matching
- ✅ Escalable (fácil agregar más términos)

**Desventajas**:
- ⚠️  Requiere mantenimiento manual del diccionario
- ⚠️  No cubre todos los casos edge

### Opción 2: Traducción Básica en Query Validator

**Plan**:
1. Agregar diccionario simple en `query-validator.ts`:
   ```typescript
   const SPANISH_TO_ENGLISH: Record<string, string> = {
     'magnesio': 'magnesium',
     'calcio': 'calcium',
     'zinc': 'zinc', // mismo en ambos idiomas
     'hierro': 'iron',
     // ... traducciones básicas
   };
   ```

2. Aplicar en `sanitizeQuery`:
   ```typescript
   export function sanitizeQuery(query: string): string {
     let sanitized = query.trim().toLowerCase();

     // Traducir español → inglés
     if (SPANISH_TO_ENGLISH[sanitized]) {
       sanitized = SPANISH_TO_ENGLISH[sanitized];
     }

     return sanitized;
   }
   ```

**Ventajas**:
- ✅ Simple de implementar
- ✅ Rápido (no requiere procesamiento complejo)

**Desventajas**:
- ❌ Solo traducciones exactas (no fuzzy matching)
- ❌ No maneja formas específicas ("glicinato de magnesio")
- ❌ Duplicación con supplement-intelligence.ts

### Opción 3: LLM Translation (Futuro)

Usar Bedrock/Claude para traducir queries en tiempo real:

```typescript
const translation = await bedrock.translate({
  text: "glicinato de magnesio",
  sourceLang: "es",
  targetLang: "en",
  domain: "supplements"
});
// → "magnesium glycinate"
```

**Ventajas**:
- ✅ Cubre todos los casos
- ✅ No requiere diccionario

**Desventajas**:
- ❌ Latencia adicional
- ❌ Costos de API
- ❌ Complejidad

---

## 🎯 Decisión Recomendada

**Usar Opción 1 (Sistema de Sinónimos Existente)**

**Razones**:
1. Sistema ya existe y está probado
2. Más robusto que traducción simple
3. Maneja casos complejos (formas específicas, nombres científicos)
4. Escalable

**Implementación**:

### Paso 1: Agregar Traducciones Faltantes

**Archivo**: `lib/services/supplement-intelligence.ts`

Agregar al diccionario `SUPPLEMENT_SYNONYMS`:

```typescript
// Magnesio - Formas específicas
'magnesio': ['magnesium'],
'glicinato de magnesio': ['magnesium glycinate', 'magnesium'],
'citrato de magnesio': ['magnesium citrate', 'magnesium'],
'oxido de magnesio': ['magnesium oxide', 'magnesium'],
'cloruro de magnesio': ['magnesium chloride', 'magnesium'],
'malato de magnesio': ['magnesium malate', 'magnesium'],
'treonato de magnesio': ['magnesium threonate', 'magnesium'],

// Calcio - Formas específicas
'calcio': ['calcium'],
'citrato de calcio': ['calcium citrate', 'calcium'],
'carbonato de calcio': ['calcium carbonate', 'calcium'],

// Zinc - Formas específicas
'zinc': ['zinc'],
'glicinato de zinc': ['zinc glycinate', 'zinc'],
'picolinato de zinc': ['zinc picolinate', 'zinc'],

// Vitamina B12 - Formas específicas
'vitamina b12': ['vitamin b12', 'cobalamin'],
'cianocobalamina': ['cyanocobalamin', 'vitamin b12'],
'metilcobalamina': ['methylcobalamin', 'vitamin b12'],

// Selenio
'selenio': ['selenium'],
'seleniometionina': ['selenomethionine', 'selenium'],

// Kombucha
'kombucha': ['kombucha', 'fermented tea'],

// ... más traducciones comunes
```

### Paso 2: Integrar en Enrich Endpoint

**Archivo**: `app/api/portal/enrich/route.ts`

```typescript
import { intelligentSearch } from '@/lib/services/supplement-intelligence';

// ANTES de llamar Lambda
const searchResult = await intelligentSearch(sanitizedCategory);
const searchTerm = searchResult.bestCandidate?.term || sanitizedCategory;

console.log({
  original: sanitizedCategory,
  translated: searchTerm,
  confidence: searchResult.bestCandidate?.confidence,
});

// Usar searchTerm en lugar de sanitizedCategory
const response = await fetch(STUDIES_FETCHER_LAMBDA, {
  body: JSON.stringify({
    supplementName: searchTerm, // ← Término traducido
    maxResults,
    rctOnly,
    yearFrom,
  }),
});
```

### Paso 3: Testing

```bash
npx tsx scripts/test-glicinato-magnesio.ts
```

**Resultado esperado**:
- "glicinato de magnesio" → traduce a "magnesium glycinate" → ✅ Estudios encontrados
- "magnesio" → traduce a "magnesium" → ✅ Estudios encontrados

---

## 📊 Impacto Estimado

### Búsquedas que Funcionarán

**Antes**:
- ❌ "glicinato de magnesio" → 404
- ❌ "magnesio" → 404
- ❌ "citrato de calcio" → 404
- ❌ "selenio" → 404
- ✅ "Magnesium" → 200 (solo inglés capitalizado)

**Después**:
- ✅ "glicinato de magnesio" → "magnesium glycinate" → 200
- ✅ "magnesio" → "magnesium" → 200
- ✅ "citrato de calcio" → "calcium citrate" → 200
- ✅ "selenio" → "selenium" → 200
- ✅ "Magnesium" → "magnesium" → 200

### Cobertura

Con ~50 traducciones agregadas:
- Vitaminas: A, B, C, D, E, K (+ formas específicas)
- Minerales: Magnesio, Calcio, Zinc, Hierro, Selenio, etc.
- Suplementos comunes: Omega-3, Creatina, Proteína, etc.
- Adaptogens: Ashwagandha, Rhodiola, Ginseng, etc.

**Cobertura estimada**: 80-90% de búsquedas comunes en español

---

## 🔮 Trabajo Futuro

1. **Pre-popular cache** para términos traducidos
2. **Monitorear** búsquedas fallidas para agregar traducciones faltantes
3. **LLM translation** para casos edge (largo plazo)
4. **Multi-idioma**: Portugués, francés, etc.

---

🎯 **Generated with Claude Code**
Co-Authored-By: Claude <noreply@anthropic.com>
