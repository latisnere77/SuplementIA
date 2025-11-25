# 🚀 Estrategias para Mejorar el Motor de Búsqueda

## Problema Actual
Cuando un suplemento no está en `supplement-mappings.ts`, el sistema falla y muestra error al usuario.

**Ejemplo:** "Citrulina Malato" no estaba mapeado → Error 404 → Usuario ve ErrorState

---

## ✅ Soluciones Propuestas (Ordenadas por Prioridad)

### 1. **Fallback Automático a PubMed** ⭐⭐⭐⭐⭐
**Concepto:** Si no hay mapping, generar uno dinámicamente usando PubMed

#### Implementación:

```typescript
// lib/portal/supplement-mappings.ts

export function getSupplementMapping(normalizedName: string): SupplementMapping | null {
  // 1. Buscar en mappings existentes
  const existing = SUPPLEMENT_MAPPINGS[normalizedName];
  if (existing) return existing;
  
  // 2. FALLBACK: Generar mapping dinámico
  console.log(`⚠️ No mapping found for "${normalizedName}", generating dynamic mapping...`);
  
  return generateDynamicMapping(normalizedName);
}

function generateDynamicMapping(normalizedName: string): SupplementMapping {
  // Detectar categoría automáticamente
  const category = detectCategory(normalizedName);
  
  return {
    normalizedName,
    scientificName: normalizedName,
    commonNames: [normalizedName],
    pubmedQuery: `(${normalizedName}) AND (health OR benefits OR effects OR clinical trial)`,
    pubmedFilters: {
      yearFrom: 2010,
      rctOnly: false,
      maxStudies: 10,
    },
    category,
    popularity: 'low', // Marcar como bajo para priorizar mappings manuales
  };
}

function detectCategory(name: string): SupplementMapping['category'] {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('vitamin') || lowerName.includes('vitamina')) return 'vitamin';
  if (lowerName.includes('mineral') || lowerName.includes('zinc') || lowerName.includes('magnesium')) return 'mineral';
  if (lowerName.includes('omega') || lowerName.includes('fish oil')) return 'fatty-acid';
  if (lowerName.includes('mushroom') || lowerName.includes('reishi') || lowerName.includes('cordyceps')) return 'mushroom';
  if (lowerName.includes('acid') || lowerName.includes('ine') || lowerName.includes('carnitine')) return 'amino-acid';
  
  return 'other';
}
```

**Ventajas:**
- ✅ Nunca falla - siempre genera una respuesta
- ✅ Funciona para cualquier suplemento
- ✅ Se puede mejorar con el tiempo agregando mappings manuales
- ✅ Experiencia de usuario sin interrupciones

**Desventajas:**
- ⚠️ Queries de PubMed pueden no ser óptimas
- ⚠️ Puede tardar más (30-60s vs <1s)

---

### 2. **Sistema de Sugerencias Inteligentes** ⭐⭐⭐⭐
**Concepto:** Cuando no hay mapping exacto, sugerir alternativas similares

#### Implementación:

```typescript
// lib/portal/supplement-suggestions.ts

import Fuse from 'fuse.js';

export function suggestSupplementCorrection(query: string): {
  found: boolean;
  suggestions: Array<{
    name: string;
    confidence: number;
    mapping: SupplementMapping;
  }>;
} {
  const allSupplements = Object.values(SUPPLEMENT_MAPPINGS);
  
  // Configurar búsqueda fuzzy
  const fuse = new Fuse(allSupplements, {
    keys: ['normalizedName', 'commonNames', 'scientificName'],
    threshold: 0.4, // 60% de similitud mínima
    includeScore: true,
  });
  
  const results = fuse.search(query);
  
  if (results.length === 0) {
    return { found: false, suggestions: [] };
  }
  
  return {
    found: true,
    suggestions: results.slice(0, 3).map(result => ({
      name: result.item.normalizedName,
      confidence: 1 - (result.score || 0),
      mapping: result.item,
    })),
  };
}
```

#### UI Component:

```typescript
// components/portal/SupplementSuggestions.tsx

export function SupplementSuggestions({ query, suggestions }: Props) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-semibold text-yellow-900">
        No encontramos "{query}"
      </h3>
      <p className="text-sm text-yellow-700 mt-1">
        ¿Quisiste decir alguno de estos?
      </p>
      <div className="mt-3 space-y-2">
        {suggestions.map(suggestion => (
          <button
            key={suggestion.name}
            onClick={() => searchSupplement(suggestion.name)}
            className="block w-full text-left px-3 py-2 bg-white rounded hover:bg-yellow-100"
          >
            <span className="font-medium">{suggestion.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              ({Math.round(suggestion.confidence * 100)}% similar)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Ventajas:**
- ✅ Ayuda al usuario a encontrar lo que busca
- ✅ Mejora la experiencia sin cambiar el backend
- ✅ Aprende de errores comunes

---

### 3. **Logging y Auto-Aprendizaje** ⭐⭐⭐⭐
**Concepto:** Registrar búsquedas fallidas para agregar mappings automáticamente

#### Implementación:

```typescript
// lib/portal/search-analytics.ts

interface FailedSearch {
  query: string;
  normalizedQuery: string;
  timestamp: string;
  count: number;
}

export const searchAnalytics = {
  logFailure: async (query: string, normalizedQuery: string) => {
    // Guardar en base de datos o archivo
    await fetch('/api/analytics/failed-search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        normalizedQuery,
        timestamp: new Date().toISOString(),
      }),
    });
  },
  
  getTopFailedSearches: async (limit = 10): Promise<FailedSearch[]> => {
    // Obtener las búsquedas más fallidas
    const response = await fetch(`/api/analytics/failed-searches?limit=${limit}`);
    return response.json();
  },
};
```

#### Dashboard de Analytics:

```typescript
// app/admin/analytics/page.tsx

export default function AnalyticsDashboard() {
  const [failedSearches, setFailedSearches] = useState<FailedSearch[]>([]);
  
  return (
    <div>
      <h1>Búsquedas Fallidas</h1>
      <table>
        <thead>
          <tr>
            <th>Query</th>
            <th>Normalizado</th>
            <th>Veces</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {failedSearches.map(search => (
            <tr key={search.query}>
              <td>{search.query}</td>
              <td>{search.normalizedQuery}</td>
              <td>{search.count}</td>
              <td>
                <button onClick={() => addMapping(search.normalizedQuery)}>
                  Agregar Mapping
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Ventajas:**
- ✅ Identifica gaps en la base de datos
- ✅ Prioriza qué mappings agregar
- ✅ Mejora continua basada en uso real

---

### 4. **Traducción Mejorada con IA** ⭐⭐⭐
**Concepto:** Usar IA para traducir y normalizar mejor

#### Implementación:

```typescript
// lib/portal/ai-normalization.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function aiNormalizeQuery(query: string): Promise<{
  normalized: string;
  scientificName: string;
  category: string;
  confidence: number;
}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a supplement expert. Given a supplement name in any language,
        return the standardized English scientific name, category, and confidence score.
        
        Categories: herb, vitamin, mineral, amino-acid, fatty-acid, mushroom, other
        
        Return JSON: { normalized: string, scientificName: string, category: string, confidence: number }`,
      },
      {
        role: 'user',
        content: query,
      },
    ],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(response.choices[0].message.content || '{}');
}
```

**Uso:**

```typescript
// En query-normalization.ts

export async function normalizeQueryWithAI(query: string) {
  // 1. Intentar normalización local
  const localResult = normalizeQuery(query);
  
  // 2. Si confianza es baja, usar IA
  if (localResult.confidence < 0.7) {
    const aiResult = await aiNormalizeQuery(query);
    
    if (aiResult.confidence > localResult.confidence) {
      return aiResult;
    }
  }
  
  return localResult;
}
```

**Ventajas:**
- ✅ Maneja cualquier idioma
- ✅ Entiende sinónimos y variaciones
- ✅ Mejora con el tiempo

**Desventajas:**
- ⚠️ Costo por llamada a API
- ⚠️ Latencia adicional (~1-2s)

---

### 5. **Base de Datos de Sinónimos Expandida** ⭐⭐⭐
**Concepto:** Agregar más sinónimos y variaciones a los mappings existentes

#### Implementación:

```typescript
// scripts/expand-synonyms.ts

import { SUPPLEMENT_MAPPINGS } from '../lib/portal/supplement-mappings';

// Base de datos de sinónimos comunes
const COMMON_SYNONYMS = {
  // Español → Inglés
  'vitamina': 'vitamin',
  'ácido': 'acid',
  'aceite': 'oil',
  'extracto': 'extract',
  'malato': 'malate',
  'citrato': 'citrate',
  'glicinato': 'glycinate',
  
  // Variaciones comunes
  'omega 3': 'omega-3',
  'omega3': 'omega-3',
  'b12': 'vitamin b12',
  'b6': 'vitamin b6',
};

export function expandSynonyms() {
  Object.entries(SUPPLEMENT_MAPPINGS).forEach(([key, mapping]) => {
    const expandedAliases = new Set(mapping.commonNames);
    
    // Agregar variaciones automáticas
    mapping.commonNames.forEach(name => {
      // Con guiones
      expandedAliases.add(name.replace(/\s+/g, '-'));
      // Sin espacios
      expandedAliases.add(name.replace(/\s+/g, ''));
      // Lowercase
      expandedAliases.add(name.toLowerCase());
      // Uppercase
      expandedAliases.add(name.toUpperCase());
    });
    
    mapping.commonNames = Array.from(expandedAliases);
  });
}
```

---

## 🎯 Recomendación Final

**Implementar en este orden:**

1. **Fallback Automático a PubMed** (Solución inmediata)
2. **Logging y Analytics** (Para identificar gaps)
3. **Sistema de Sugerencias** (Mejor UX)
4. **Base de Datos Expandida** (Mejora continua)
5. **IA como último recurso** (Para casos edge)

### Arquitectura Propuesta:

```
Usuario busca "Citrulina Malato"
         ↓
1. Normalización local (ES → EN)
         ↓
2. Buscar en mappings
         ↓
   ¿Encontrado? → SÍ → Usar mapping
         ↓ NO
3. Buscar sugerencias similares
         ↓
   ¿Hay sugerencias? → SÍ → Mostrar al usuario
         ↓ NO
4. Generar mapping dinámico
         ↓
5. Hacer búsqueda en PubMed
         ↓
6. Log para análisis futuro
         ↓
7. Mostrar resultados al usuario
```

---

## 📊 Métricas de Éxito

- **Tasa de éxito de búsqueda:** >95%
- **Tiempo de respuesta con mapping:** <1s
- **Tiempo de respuesta sin mapping:** <30s
- **Búsquedas fallidas:** <5%
- **Sugerencias aceptadas:** >60%

---

## 🔧 Implementación Rápida (Quick Win)

Para implementar el fallback básico ahora mismo:

```typescript
// lib/portal/supplement-mappings.ts

export function getSupplementMapping(normalizedName: string): SupplementMapping | null {
  const existing = SUPPLEMENT_MAPPINGS[normalizedName];
  if (existing) return existing;
  
  // FALLBACK SIMPLE
  console.warn(`⚠️ No mapping for "${normalizedName}", using dynamic fallback`);
  
  return {
    normalizedName,
    scientificName: normalizedName,
    commonNames: [normalizedName],
    pubmedQuery: `(${normalizedName}) AND (supplement OR health OR clinical)`,
    pubmedFilters: { yearFrom: 2010, rctOnly: false, maxStudies: 10 },
    category: 'other',
    popularity: 'low',
  };
}
```

**Resultado:** Nunca más errores 404, siempre hay una respuesta.
