# Enhancement: Sistema Inteligente de Traducción y Fuzzy Search

**Fecha**: 2025-01-21
**Status**: 💡 **PROPUESTA**

---

## 🎯 Sistema Actual (Ya Existe)

### ✅ Lo Que YA Funciona

**Archivo**: `lib/services/abbreviation-expander.ts` + `app/api/portal/enrich/route.ts`

**Estrategia Híbrida en 3 Capas**:

```typescript
// Capa 1: Fallback Map (GRATIS, instantáneo)
if (COMMON_ABBREVIATIONS[lowerTerm]) {
  searchTerm = COMMON_ABBREVIATIONS[lowerTerm];
}

// Capa 2: Claude Haiku LLM (BARATO, inteligente)
else {
  const expansion = await expandAbbreviation(supplementName);
  searchTerm = expansion.alternatives[0]; // "glicinato de magnesio" → "magnesium glycinate"
}

// Capa 3: PubMed Search
fetchStudies(searchTerm);
```

**Costos**:
- Capa 1: $0 (map lookup)
- Capa 2: ~$0.0001 por búsqueda (Claude Haiku)
- Total: **~$0.01 por cada 100 búsquedas**

### ❌ El Problema Actual

```
┌─────────────────────────────────────────────────────────┐
│ "glicinato de magnesio"                                 │
│   ↓                                                      │
│ LLM → ["magnesium glycinate", "magnesium"]             │
│   ↓                                                      │
│ PubMed search: "magnesium glycinate"                    │
│   ↓                                                      │
│ ❌ 0 estudios (demasiado específico)                    │
│   ↓                                                      │
│ 404 insufficient_data                                   │
└─────────────────────────────────────────────────────────┘
```

**PubMed Problem**: "magnesium glycinate" puede ser demasiado específico
- Hay ~200,000 estudios para "magnesium"
- Solo ~500 estudios para "magnesium glycinate"
- El sistema puede no encontrar suficientes estudios RCT recientes

---

## ✅ Solución: Fuzzy Search con Fallback Inteligente

### Estrategia Mejorada

```typescript
// Paso 1: LLM traduce (ya existe)
const translations = ["magnesium glycinate", "magnesium"];

// Paso 2: Search con TODAS las variaciones (NUEVO)
for (const variant of translations) {
  const studies = await fetchStudies(variant);

  if (studies.length >= MIN_STUDIES) {
    return { success: true, studies, searchTerm: variant };
  }
}

// Paso 3: Fallback al término más genérico (NUEVO)
const generic = translations[translations.length - 1]; // "magnesium"
return await fetchStudies(generic);
```

### Código Propuesto

**Archivo**: `app/api/portal/enrich/route.ts`

Reemplazar la lógica de búsqueda actual (línea ~220) con:

```typescript
// STEP 1: Intelligent Query Translation & Expansion
const searchVariations = await generateSearchVariations(searchTerm);

console.log(
  JSON.stringify({
    event: 'SEARCH_VARIATIONS_GENERATED',
    requestId,
    correlationId,
    originalQuery: originalQuery,
    searchTerm: searchTerm,
    variations: searchVariations,
    timestamp: new Date().toISOString(),
  })
);

// STEP 2: Try variations with fallback logic
let studies: any[] = [];
let usedSearchTerm = searchTerm;
let searchMethod = 'primary';

for (let i = 0; i < searchVariations.length; i++) {
  const variant = searchVariations[i];

  console.log(
    JSON.stringify({
      event: 'TRYING_SEARCH_VARIATION',
      requestId,
      correlationId,
      variationIndex: i,
      variant,
      timestamp: new Date().toISOString(),
    })
  );

  try {
    const response = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: variant,
        maxResults: maxStudies || 10,
        rctOnly: rctOnly || false,
        yearFrom: yearFrom || 2010,
        yearTo,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (data.success && data.studies && data.studies.length >= 3) {
      // SUCCESS: Found sufficient studies
      studies = data.studies;
      usedSearchTerm = variant;
      searchMethod = i === 0 ? 'primary' : `fallback_${i}`;

      console.log(
        JSON.stringify({
          event: 'SEARCH_VARIATION_SUCCESS',
          requestId,
          correlationId,
          variationIndex: i,
          variant,
          studiesFound: studies.length,
          searchMethod,
          timestamp: new Date().toISOString(),
        })
      );

      break; // Stop trying variations
    } else {
      console.log(
        JSON.stringify({
          event: 'SEARCH_VARIATION_INSUFFICIENT',
          requestId,
          correlationId,
          variationIndex: i,
          variant,
          studiesFound: data.studies?.length || 0,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (searchError: any) {
    console.error(
      JSON.stringify({
        event: 'SEARCH_VARIATION_ERROR',
        requestId,
        correlationId,
        variationIndex: i,
        variant,
        error: searchError.message,
        timestamp: new Date().toISOString(),
      })
    );
    // Continue to next variation
  }
}

// Check if we found any studies
if (studies.length === 0) {
  console.error(
    JSON.stringify({
      event: 'ALL_SEARCH_VARIATIONS_FAILED',
      requestId,
      correlationId,
      originalQuery,
      searchTerm,
      variationsTried: searchVariations,
      timestamp: new Date().toISOString(),
    })
  );

  return NextResponse.json(
    {
      success: false,
      error: 'no_studies_found',
      message: `No se encontraron estudios científicos para "${originalQuery}" ni sus variaciones.`,
      metadata: {
        searchTerm,
        variationsTried: searchVariations,
      },
    },
    { status: 404 }
  );
}
```

### Nueva Función: `generateSearchVariations`

**Archivo**: `lib/services/abbreviation-expander.ts`

```typescript
/**
 * Generate search variations for fuzzy matching
 *
 * For "glicinato de magnesio":
 * 1. LLM translation → ["magnesium glycinate", "magnesium"]
 * 2. Add variations → ["magnesium glycinate", "glycinate magnesium", "magnesium"]
 * 3. Return ordered by specificity (most specific first)
 */
export async function generateSearchVariations(term: string): Promise<string[]> {
  const variations: string[] = [];

  // Step 1: Get LLM translations/expansions
  const expansion = await expandAbbreviation(term);

  if (expansion.alternatives.length > 0) {
    // Use LLM alternatives
    variations.push(...expansion.alternatives);
  } else {
    // No LLM alternatives, use original
    variations.push(term);
  }

  // Step 2: Add word-order variations for multi-word terms
  for (const variant of [...variations]) {
    if (variant.includes(' ')) {
      const words = variant.split(' ');
      if (words.length === 2) {
        // "magnesium glycinate" → also try "glycinate magnesium"
        const reversed = `${words[1]} ${words[0]}`;
        if (!variations.includes(reversed)) {
          variations.push(reversed);
        }
      }
    }
  }

  // Step 3: Extract base ingredient (most generic)
  // "magnesium glycinate" → ensure "magnesium" is last (broadest search)
  const baseIngredient = extractBaseIngredient(variations[0] || term);
  if (baseIngredient && !variations.includes(baseIngredient)) {
    variations.push(baseIngredient);
  }

  // Step 4: Remove duplicates while preserving order
  const unique = [...new Set(variations)];

  console.log(
    JSON.stringify({
      event: 'SEARCH_VARIATIONS_GENERATED',
      originalTerm: term,
      variations: unique,
      timestamp: new Date().toISOString(),
    })
  );

  return unique;
}

/**
 * Extract base ingredient from compound name
 *
 * Examples:
 * - "magnesium glycinate" → "magnesium"
 * - "vitamin d3" → "vitamin d"
 * - "omega-3 fatty acids" → "omega-3"
 */
function extractBaseIngredient(term: string): string | null {
  const lower = term.toLowerCase();

  // Common patterns
  const patterns = [
    // "vitamin X form" → "vitamin X"
    /^(vitamin [a-z]\d*)/i,

    // "mineral form" → "mineral"
    /^(magnesium|calcium|zinc|iron|selenium|potassium|chromium|copper|manganese|iodine)/i,

    // "omega-X ..." → "omega-X"
    /^(omega-[0-9])/i,

    // "supplement form" → "supplement"
    /^([a-z-]+)\s+(glycinate|citrate|oxide|malate|threonate|picolinate|gluconate|carbonate|chloride|sulfate|acetate)/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // No pattern match - return first word if multi-word
  const words = lower.split(' ');
  if (words.length > 1) {
    return words[0];
  }

  return null;
}
```

---

## 📊 Ejemplo Completo

### Input: "glicinato de magnesio"

```
Step 1: Fallback Map
  ❌ Not in map

Step 2: Claude Haiku LLM
  ✅ "glicinato de magnesio" → ["magnesium glycinate", "magnesium"]

Step 3: Generate Variations
  ✅ ["magnesium glycinate", "glycinate magnesium", "magnesium"]

Step 4: Try Each Variation
  Try 1: "magnesium glycinate"
    PubMed → 12 estudios ✅ (sufficient)
    STOP - Use this

Output:
  searchTerm: "magnesium glycinate"
  studies: 12
  searchMethod: "primary"
```

### Input: "glicinato de magnesio" (si glycinate no tiene estudios)

```
Step 4: Try Each Variation
  Try 1: "magnesium glycinate"
    PubMed → 2 estudios ❌ (insufficient, need 3+)

  Try 2: "glycinate magnesium"
    PubMed → 1 estudio ❌ (insufficient)

  Try 3: "magnesium"
    PubMed → 10,000 estudios ✅ (sufficient)
    STOP - Use this

Output:
  searchTerm: "magnesium"
  studies: 10,000
  searchMethod: "fallback_2"
```

---

## 💰 Costos

### Por Búsqueda

```
Capa 1 (Fallback Map): $0
Capa 2 (Claude Haiku LLM): ~$0.0001
Capa 3 (PubMed variations): $0

Total por búsqueda: ~$0.0001
```

### Por 1,000 Búsquedas

```
Cache hit rate: ~80% (no LLM call)
Cache miss: 20% → 200 LLM calls

200 × $0.0001 = $0.02

Total: $0.02 por 1,000 búsquedas
```

**Conclusión**: Extremadamente barato y escalable

---

## ✅ Ventajas de Esta Solución

1. **Inteligente**: USA LLM para traducción (no hardcoded)
2. **Barato**: Claude Haiku (~$0.25 por 1M tokens)
3. **Fuzzy**: Prueba múltiples variaciones automáticamente
4. **Fallback**: Siempre tiene término genérico como último recurso
5. **Sin mantenimiento**: No requiere agregar traducciones manualmente
6. **Escalable**: Funciona para CUALQUIER idioma o término

---

## 🔮 Mejoras Futuras

### 1. Cache de Traducciones

```typescript
const TRANSLATION_CACHE = new Map<string, string[]>();

if (TRANSLATION_CACHE.has(term)) {
  return TRANSLATION_CACHE.get(term);
}

const translation = await llm.translate(term);
TRANSLATION_CACHE.set(term, translation);
```

**Beneficio**: Reduce llamadas LLM en ~95%

### 2. Multi-Language Support

```typescript
const prompt = `Translate "${term}" to English.
Detect language: Spanish, Portuguese, French, German, Italian.
Return JSON: {"language": "es", "translations": [...]}`
```

### 3. Smart Confidence Scoring

```typescript
if (studies.length < 5 && searchMethod === 'fallback_2') {
  metadata.confidence = 'low';
  metadata.warning = 'Used generic term due to insufficient specific studies';
}
```

---

🎯 **Generated with Claude Code**
Co-Authored-By: Claude <noreply@anthropic.com>
