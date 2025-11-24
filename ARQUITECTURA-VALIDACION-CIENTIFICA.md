# 🔬 Arquitectura de Validación Científica

## Problema Identificado

El sistema actual tiene una **desconexión crítica**:

1. ✅ Backend genera mappings dinámicos (funciona al 100%)
2. ❌ Frontend rechaza datos sin estudios (correcto, pero sin feedback claro)
3. ❌ No hay comunicación clara entre ambas capas

**Resultado**: Usuario ve error genérico cuando debería ver:
- "No encontramos estudios científicos para X"
- "¿Quizás buscabas Y?"
- Sugerencias inteligentes basadas en fuzzy search

## Principio Fundamental

> **NUNCA mostrar información sin respaldo científico**
> 
> Si no hay estudios en PubMed/Perplexity, el sistema debe:
> 1. Rechazar la búsqueda
> 2. Explicar claramente por qué
> 3. Ofrecer alternativas inteligentes

## Arquitectura Propuesta

### Capa 1: Normalización y Mapping
```typescript
// lib/portal/query-normalization.ts
normalizeQuery("Rutina") → { normalized: "Rutin", confidence: 1.0 }

// lib/portal/supplement-mappings.ts
getSupplementMapping("Rutin") → {
  searchTerms: ["Rutin", "Quercetin-3-rutinoside"],
  category: "flavonoid",
  query: "(Rutin) AND (supplement OR clinical trial...)"
}
```

### Capa 2: Búsqueda Científica
```typescript
// backend/lambdas/perplexity-search.ts
searchPubMed(query) → {
  studies: [...],
  totalStudies: 0,  // ← CRÍTICO: Si es 0, rechazar
  metadata: {...}
}
```

### Capa 3: Validación y Enriquecimiento
```typescript
// app/api/portal/recommend/route.ts
if (searchResult.totalStudies === 0) {
  // NO continuar con enriquecimiento
  // NO generar datos falsos
  // SÍ buscar sugerencias alternativas
  
  const suggestions = getSuggestions(supplement);
  
  return {
    success: false,
    error: 'insufficient_scientific_data',
    message: `No encontramos estudios científicos para "${supplement}"`,
    suggestions: suggestions,
    metadata: {
      searchAttempted: true,
      queriesUsed: [...],
      alternativesAvailable: suggestions.length > 0
    }
  }
}
```

### Capa 4: Frontend - Manejo de Errores Inteligente
```typescript
// app/portal/results/page.tsx

// Caso 1: Datos científicos válidos
if (data.success && data.recommendation && data.totalStudies > 0) {
  setRecommendation(data.recommendation);
  setError(null);
}

// Caso 2: Sin datos científicos (NO es un error del sistema)
else if (data.error === 'insufficient_scientific_data') {
  setRecommendation(null);
  setError({
    type: 'no_scientific_data',
    message: data.message,
    suggestions: data.suggestions,
    searchedFor: supplement,
    metadata: data.metadata
  });
}

// Caso 3: Error real del sistema
else {
  setRecommendation(null);
  setError({
    type: 'system_error',
    message: data.error || 'Error inesperado',
  });
}
```

## Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario busca: "Rutina"                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. NORMALIZACIÓN                                             │
│    "Rutina" → "Rutin" (confidence: 1.0)                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. MAPPING (con fallback dinámico)                          │
│    ✅ Genera query optimizada                                │
│    ✅ Detecta categoría: "flavonoid"                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BÚSQUEDA CIENTÍFICA (PubMed + Perplexity)               │
│    Query: "(Rutin) AND (supplement OR clinical trial...)"   │
│    Resultado: 0 estudios encontrados                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDACIÓN CIENTÍFICA ⚠️                                  │
│    totalStudies === 0 → RECHAZAR                            │
│    NO generar datos falsos                                   │
│    SÍ buscar alternativas                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BÚSQUEDA DE SUGERENCIAS                                  │
│    Fuzzy search: "Rutin" → ["Biotin", "L-Carnitine"]       │
│    Suplementos populares: ["Ashwagandha", "Omega-3"]       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. RESPUESTA AL USUARIO                                      │
│    ❌ "No encontramos estudios científicos para 'Rutina'"   │
│    💡 "¿Quizás buscabas 'Biotin' o 'L-Carnitine'?"         │
│    🔍 Botones para buscar alternativas                       │
└─────────────────────────────────────────────────────────────┘
```

## Implementación por Capas

### 1. Backend: Validación Científica Estricta

**Archivo**: `app/api/portal/recommend/route.ts`

```typescript
// Después de búsqueda en PubMed/Perplexity
const searchResult = await searchScientificData(query);

// VALIDACIÓN ESTRICTA
if (!searchResult.studies || searchResult.studies.length === 0) {
  console.log(`⚠️ No scientific data found for: ${supplement}`);
  
  // Buscar sugerencias inteligentes
  const suggestions = getSuggestions(supplement);
  
  return NextResponse.json({
    success: false,
    error: 'insufficient_scientific_data',
    errorType: 'NO_STUDIES_FOUND',
    message: `No encontramos estudios científicos publicados sobre "${supplement}"`,
    searchedFor: supplement,
    normalizedQuery: normalizedQuery,
    suggestions: suggestions.map(s => ({
      name: s.name,
      confidence: s.score,
      hasStudies: true // Solo sugerir suplementos con estudios
    })),
    metadata: {
      queriesAttempted: [query, ...alternativeQueries],
      databasesSearched: ['PubMed', 'Perplexity'],
      timestamp: new Date().toISOString()
    }
  }, { status: 404 });
}

// Solo continuar si HAY estudios
console.log(`✅ Found ${searchResult.studies.length} studies for: ${supplement}`);
// ... continuar con enriquecimiento
```

### 2. Frontend: Manejo de Errores Rico

**Archivo**: `app/portal/results/page.tsx`

```typescript
// Manejar respuesta 404 con datos científicos insuficientes
if (response.status === 404 && errorData.errorType === 'NO_STUDIES_FOUND') {
  console.log(`ℹ️ No scientific data: ${errorData.searchedFor}`);
  
  setRecommendation(null);
  setError({
    type: 'no_scientific_data',
    title: 'Sin Evidencia Científica',
    message: errorData.message,
    searchedFor: errorData.searchedFor,
    suggestions: errorData.suggestions || [],
    metadata: errorData.metadata
  });
  setIsLoading(false);
  return;
}
```

### 3. Componente de Error Mejorado

**Archivo**: `components/portal/ErrorState.tsx`

```typescript
interface ErrorStateProps {
  error: {
    type: 'no_scientific_data' | 'system_error' | 'network_error';
    title: string;
    message: string;
    searchedFor?: string;
    suggestions?: Array<{
      name: string;
      confidence: number;
      hasStudies: boolean;
    }>;
    metadata?: any;
  };
  onRetry: () => void;
  onSearchSuggestion: (suggestion: string) => void;
}

export function ErrorState({ error, onRetry, onSearchSuggestion }: ErrorStateProps) {
  if (error.type === 'no_scientific_data') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-yellow-900 mb-4">
            🔬 Sin Evidencia Científica
          </h2>
          <p className="text-yellow-800 mb-6">
            {error.message}
          </p>
          
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                💡 ¿Quizás buscabas alguno de estos?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {error.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.name}
                    onClick={() => onSearchSuggestion(suggestion.name)}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left"
                  >
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-xs text-blue-100">
                      ✓ Con estudios científicos
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              📚 ¿Por qué no encontramos información?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• El suplemento puede no tener estudios publicados en PubMed</li>
              <li>• El nombre puede estar escrito de forma diferente</li>
              <li>• Puede ser un nombre comercial sin respaldo científico</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // ... otros tipos de error
}
```

## Métricas de Calidad

### Indicadores de Éxito
- ✅ 0% de datos mostrados sin estudios científicos
- ✅ 100% de búsquedas sin resultados reciben sugerencias
- ✅ Tiempo de respuesta < 3s para búsquedas sin resultados
- ✅ Tasa de conversión de sugerencias > 40%

### Logging y Monitoreo
```typescript
// Registrar todas las búsquedas sin resultados
searchAnalytics.recordNoResults({
  query: originalQuery,
  normalizedQuery: normalizedQuery,
  queriesAttempted: [...],
  suggestionsOffered: [...],
  userSelectedSuggestion: null, // Actualizar si usuario hace clic
  timestamp: Date.now()
});
```

## Beneficios de esta Arquitectura

1. **Integridad Científica**: Nunca mostramos datos sin respaldo
2. **Experiencia de Usuario**: Errores claros con alternativas útiles
3. **Trazabilidad**: Logging completo de búsquedas fallidas
4. **Mejora Continua**: Analytics para identificar gaps en mappings
5. **Escalabilidad**: Fácil añadir nuevas fuentes de datos científicos

## Próximos Pasos

1. ✅ Implementar validación estricta en `/api/portal/recommend`
2. ✅ Mejorar ErrorState con sugerencias inteligentes
3. ✅ Añadir analytics para búsquedas sin resultados
4. ✅ Crear dashboard de "gaps científicos" para priorizar nuevos mappings
5. ✅ Implementar A/B testing de sugerencias

---

**Fecha**: Noviembre 24, 2025
**Principio**: Integridad científica sobre conveniencia
