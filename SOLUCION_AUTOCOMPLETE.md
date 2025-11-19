# Propuesta de Solución: Implementación de Autocomplete Multiidioma

**Fecha:** 19 de noviembre de 2025
**Basado en:** `TRAZABILIDAD_AUTOCOMPLETE.md`
**Estado:** Propuesta - Pendiente de aprobación del usuario

---

## 📋 Resumen Ejecutivo

**Problema identificado:** La funcionalidad de autocomplete en la barra de búsqueda NO existe.

**Solución propuesta:** Implementar sistema de autocomplete con las siguientes características:
1. Sugerencias en tiempo real según el idioma seleccionado (ES/EN)
2. Endpoint de API optimizado para respuestas rápidas
3. Traducciones de búsquedas populares
4. Componente UI con navegación por teclado
5. Debouncing para evitar llamadas excesivas

---

## 🎯 Objetivos de la Solución

### Funcionales:
- ✅ Mostrar sugerencias mientras el usuario escribe
- ✅ Sugerencias en español o inglés según idioma de la página
- ✅ Incluir categorías de salud + búsquedas populares
- ✅ Navegación con teclado (↑↓ Enter Esc)
- ✅ Performance: respuestas < 100ms

### No Funcionales:
- ✅ Mantener arquitectura serverless existente
- ✅ Seguir patrones de código del proyecto
- ✅ Integración con sistema i18n actual
- ✅ Monitoreo con Sentry + CloudWatch
- ✅ Caching para reducir costos de Lambda

---

## 🏗️ Arquitectura de la Solución

### Opción 1: Autocomplete con Endpoint de API (Recomendada)

**Ventajas:**
- Permite búsquedas dinámicas en el futuro
- Escalable para agregar machine learning
- Puede conectarse a base de datos de búsquedas populares reales
- Mejor para analytics y tracking

**Desventajas:**
- Requiere crear endpoint de API
- Llamadas adicionales a Lambda (costo mínimo)
- Más complejo de implementar

```
┌─────────────────────────────────────────────────┐
│  Frontend: HealthSearchForm.tsx                 │
│  ┌────────────────────────────────────────────┐ │
│  │ Usuario escribe: "sueñ"                    │ │
│  │         ↓                                  │ │
│  │ useDebounce(300ms)                         │ │
│  │         ↓                                  │ │
│  │ GET /api/portal/autocomplete               │ │
│  │     ?q=sueñ&lang=es                        │ │
│  │         ↓                                  │ │
│  │ Recibe: ["Sueño", "Mejorar calidad de     │ │
│  │          sueño", "Sueño profundo"]         │ │
│  │         ↓                                  │ │
│  │ Muestra dropdown con sugerencias           │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  API Route: /app/api/portal/autocomplete/       │
│             route.ts                            │
│  ┌────────────────────────────────────────────┐ │
│  │ 1. Valida query & idioma                   │ │
│  │ 2. Filtra sugerencias hardcodeadas         │ │
│  │ 3. Retorna top 10 matches                  │ │
│  │ 4. Cache: 5 minutos (Next.js)              │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Estimación de costo:**
- Llamadas API: ~1,000/día = $0.00035/día
- Lambda ejecución: ~50ms avg = $0.0001/día
- **Total:** ~$0.01/mes (despreciable)

---

### Opción 2: Autocomplete Solo en Frontend (Más Simple)

**Ventajas:**
- Cero latencia de red
- Sin costos de Lambda
- Más simple de implementar
- Funciona offline

**Desventajas:**
- Sugerencias limitadas a lo hardcodeado
- No puede aprender de búsquedas reales
- Menos flexible para futuras mejoras

```
┌─────────────────────────────────────────────────┐
│  Frontend: HealthSearchForm.tsx                 │
│  ┌────────────────────────────────────────────┐ │
│  │ Usuario escribe: "sueñ"                    │ │
│  │         ↓                                  │ │
│  │ Filtra POPULAR_SEARCHES_I18N[lang]         │ │
│  │         ↓                                  │ │
│  │ Matches: ["Sueño", "Mejorar sueño"]       │ │
│  │         ↓                                  │ │
│  │ Muestra dropdown (sin API call)            │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Estimación de costo:**
- $0/mes (todo en frontend)

---

## 🛠️ Plan de Implementación

### **RECOMENDACIÓN: Opción 1 (Con Endpoint de API)**

Razón: Permite evolución futura sin refactorización mayor.

---

## 📝 Tareas de Implementación

### **Fase 1: Backend (Endpoint de API)**

#### 1.1. Crear archivo de sugerencias multiidioma

**Archivo:** `/lib/portal/autocomplete-suggestions.ts`

```typescript
export const AUTOCOMPLETE_SUGGESTIONS = {
  en: {
    categories: [
      'Muscle Gain & Exercise',
      'Memory & Focus',
      'Sleep',
      'Immune System',
      'Heart Health',
      'Fat Loss',
    ],
    popularSearches: [
      'How to build muscle',
      'Improve sleep quality',
      'Boost cognitive function',
      'Support immune system',
      'Increase energy levels',
      'Reduce inflammation',
      'Better focus and concentration',
      'Enhance athletic performance',
      'Improve recovery after exercise',
      'Support joint health',
    ],
    // Mapeo de search terms a categorías
    keywords: {
      'muscle': ['Muscle Gain & Exercise', 'Enhance athletic performance'],
      'sleep': ['Sleep', 'Improve sleep quality'],
      'brain': ['Memory & Focus', 'Boost cognitive function'],
      'immune': ['Immune System', 'Support immune system'],
      // ... más keywords
    }
  },
  es: {
    categories: [
      'Ganancia de Músculo y Ejercicio',
      'Memoria y Concentración',
      'Sueño',
      'Sistema Inmunológico',
      'Salud Cardíaca',
      'Pérdida de Grasa',
    ],
    popularSearches: [
      'Cómo ganar músculo',
      'Mejorar calidad del sueño',
      'Aumentar función cognitiva',
      'Apoyar sistema inmunológico',
      'Aumentar niveles de energía',
      'Reducir inflamación',
      'Mejor concentración y enfoque',
      'Mejorar rendimiento atlético',
      'Mejorar recuperación después del ejercicio',
      'Apoyar salud de las articulaciones',
    ],
    keywords: {
      'musculo': ['Ganancia de Músculo y Ejercicio', 'Mejorar rendimiento atlético'],
      'sueño': ['Sueño', 'Mejorar calidad del sueño'],
      'cerebro': ['Memoria y Concentración', 'Aumentar función cognitiva'],
      'inmune': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],
      // ... más keywords
    }
  }
};
```

**Notas:**
- Mantener sincronizado con `HEALTH_CATEGORIES` existente
- Agregar más términos según análisis de búsquedas reales (futuro)

---

#### 1.2. Crear endpoint de autocomplete

**Archivo:** `/app/api/portal/autocomplete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AUTOCOMPLETE_SUGGESTIONS } from '@/lib/portal/autocomplete-suggestions';
import * as Sentry from '@sentry/nextjs';

// Tipos
type Language = 'en' | 'es';

interface AutocompleteRequest {
  q: string;        // Query del usuario
  lang: Language;   // Idioma
  limit?: number;   // Límite de resultados (default: 10)
}

interface AutocompleteSuggestion {
  text: string;
  type: 'category' | 'popular' | 'keyword';
  score: number; // Para ordenar por relevancia
}

/**
 * GET /api/portal/autocomplete
 *
 * Query params:
 *   - q: string (requerido) - Búsqueda del usuario
 *   - lang: 'en' | 'es' (default: 'en')
 *   - limit: number (default: 10)
 *
 * Ejemplo: /api/portal/autocomplete?q=sueño&lang=es&limit=5
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Extraer parámetros
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase().trim();
    const lang = (searchParams.get('lang') || 'en') as Language;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 2. Validaciones
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!['en', 'es'].includes(lang)) {
      return NextResponse.json(
        { error: 'Language must be "en" or "es"' },
        { status: 400 }
      );
    }

    // 3. Obtener sugerencias según idioma
    const suggestions = getSuggestions(query, lang, limit);

    // 4. Métricas
    const duration = Date.now() - startTime;
    console.log(`[Autocomplete] query="${query}" lang=${lang} results=${suggestions.length} duration=${duration}ms`);

    // 5. Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'autocomplete',
      message: `Query: ${query}`,
      level: 'info',
      data: { lang, resultsCount: suggestions.length, duration }
    });

    // 6. Respuesta con cache
    return NextResponse.json(
      { suggestions, meta: { query, lang, count: suggestions.length } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache
        }
      }
    );

  } catch (error) {
    console.error('[Autocomplete] Error:', error);
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Obtiene sugerencias filtradas y ordenadas por relevancia
 */
function getSuggestions(
  query: string,
  lang: Language,
  limit: number
): AutocompleteSuggestion[] {
  const data = AUTOCOMPLETE_SUGGESTIONS[lang];
  const suggestions: AutocompleteSuggestion[] = [];

  // 1. Buscar en categorías
  data.categories.forEach(category => {
    if (category.toLowerCase().includes(query)) {
      suggestions.push({
        text: category,
        type: 'category',
        score: calculateScore(query, category.toLowerCase())
      });
    }
  });

  // 2. Buscar en búsquedas populares
  data.popularSearches.forEach(search => {
    if (search.toLowerCase().includes(query)) {
      suggestions.push({
        text: search,
        type: 'popular',
        score: calculateScore(query, search.toLowerCase())
      });
    }
  });

  // 3. Buscar en keywords
  Object.entries(data.keywords).forEach(([keyword, relatedSearches]) => {
    if (keyword.includes(query)) {
      relatedSearches.forEach(relatedSearch => {
        // Evitar duplicados
        if (!suggestions.find(s => s.text === relatedSearch)) {
          suggestions.push({
            text: relatedSearch,
            type: 'keyword',
            score: calculateScore(query, keyword)
          });
        }
      });
    }
  });

  // 4. Ordenar por score y limitar
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calcula score de relevancia (0-100)
 * Prioriza:
 *  - Match al inicio de la palabra (score más alto)
 *  - Match exacto (score máximo)
 *  - Coincidencias más largas
 */
function calculateScore(query: string, text: string): number {
  const index = text.indexOf(query);

  if (index === -1) return 0;

  // Exact match
  if (query === text) return 100;

  // Starts with query
  if (index === 0) return 80 + (query.length / text.length) * 20;

  // Contains query (not at start)
  return 50 + (query.length / text.length) * 30;
}
```

**Características:**
- ✅ Validación de inputs
- ✅ Scoring para ordenar por relevancia
- ✅ Logging estructurado
- ✅ Integración con Sentry
- ✅ Cache de 5 minutos (Next.js edge cache)
- ✅ Manejo de errores robusto

---

### **Fase 2: Frontend (Componente de Autocomplete)**

#### 2.1. Actualizar traducciones

**Archivo:** `/lib/i18n/translations.ts`

**Agregar las siguientes keys:**

```typescript
export const translations = {
  en: {
    // ... traducciones existentes ...

    // Autocomplete
    'autocomplete.no.results': 'No suggestions found',
    'autocomplete.loading': 'Loading suggestions...',
    'autocomplete.categories': 'Categories',
    'autocomplete.popular': 'Popular Searches',

    // Popular Searches (nuevas keys)
    'popular.search.muscle': 'How to build muscle',
    'popular.search.sleep': 'Improve sleep quality',
    'popular.search.cognitive': 'Boost cognitive function',
    'popular.search.immune': 'Support immune system',
    'popular.search.energy': 'Increase energy levels',
    'popular.search.inflammation': 'Reduce inflammation',
  },
  es: {
    // ... traducciones existentes ...

    // Autocomplete
    'autocomplete.no.results': 'No se encontraron sugerencias',
    'autocomplete.loading': 'Cargando sugerencias...',
    'autocomplete.categories': 'Categorías',
    'autocomplete.popular': 'Búsquedas Populares',

    // Popular Searches (nuevas keys)
    'popular.search.muscle': 'Cómo ganar músculo',
    'popular.search.sleep': 'Mejorar calidad del sueño',
    'popular.search.cognitive': 'Aumentar función cognitiva',
    'popular.search.immune': 'Apoyar sistema inmunológico',
    'popular.search.energy': 'Aumentar niveles de energía',
    'popular.search.inflammation': 'Reducir inflamación',
  },
};
```

---

#### 2.2. Crear hook de autocomplete

**Archivo:** `/lib/portal/useAutocomplete.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/useTranslation';

interface AutocompleteSuggestion {
  text: string;
  type: 'category' | 'popular' | 'keyword';
  score: number;
}

interface UseAutocompleteOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

interface UseAutocompleteReturn {
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
}

export function useAutocomplete(
  query: string,
  options: UseAutocompleteOptions = {}
): UseAutocompleteReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 10
  } = options;

  const { language } = useLanguage();
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset si query es muy corto
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/portal/autocomplete?q=${encodeURIComponent(query)}&lang=${language}&limit=${limit}`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[useAutocomplete] Error:', err);
          setError(err.message);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, language, debounceMs, minQueryLength, limit]);

  return { suggestions, isLoading, error };
}
```

**Características:**
- ✅ Debouncing (300ms default)
- ✅ Cancelación de requests previos
- ✅ AbortController para cleanup
- ✅ Integración automática con idioma actual
- ✅ Manejo de errores

---

#### 2.3. Actualizar HealthSearchForm.tsx

**Archivo:** `/components/portal/HealthSearchForm.tsx`

**Cambios necesarios:**

1. **Importar hook y componente:**
```typescript
import { useAutocomplete } from '@/lib/portal/useAutocomplete';
import { AutocompleteDropdown } from './AutocompleteDropdown'; // nuevo componente
```

2. **Agregar estado para autocomplete:**
```typescript
const [showAutocomplete, setShowAutocomplete] = useState(false);
const [selectedIndex, setSelectedIndex] = useState(-1);
const { suggestions, isLoading: isLoadingSuggestions } = useAutocomplete(searchQuery);
```

3. **Actualizar sección POPULAR_SEARCHES:**
```typescript
// ANTES (hardcoded):
const POPULAR_SEARCHES = [
  'How to build muscle',
  'Improve sleep quality',
  // ...
];

// DESPUÉS (usando traducciones):
const POPULAR_SEARCHES_KEYS = [
  'popular.search.muscle',
  'popular.search.sleep',
  'popular.search.cognitive',
  'popular.search.immune',
  'popular.search.energy',
  'popular.search.inflammation',
];

// En el render:
{POPULAR_SEARCHES_KEYS.map((key) => (
  <button
    key={key}
    onClick={() => handlePopularSearch(t(key as any))}
    className="..."
  >
    {t(key as any)}
  </button>
))}
```

4. **Agregar dropdown de autocomplete:**
```typescript
{/* Autocomplete Dropdown */}
{showAutocomplete && suggestions.length > 0 && (
  <AutocompleteDropdown
    suggestions={suggestions}
    selectedIndex={selectedIndex}
    onSelect={(suggestion) => {
      setSearchQuery(suggestion.text);
      onSearch(suggestion.text);
      setShowAutocomplete(false);
    }}
    onClose={() => setShowAutocomplete(false)}
  />
)}
```

5. **Manejar navegación con teclado:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!showAutocomplete || suggestions.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
      break;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selected = suggestions[selectedIndex];
        setSearchQuery(selected.text);
        onSearch(selected.text);
        setShowAutocomplete(false);
      }
      break;
    case 'Escape':
      setShowAutocomplete(false);
      setSelectedIndex(-1);
      break;
  }
};

// Aplicar al input:
<input
  type="text"
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value);
    setShowAutocomplete(true);
  }}
  onKeyDown={handleKeyDown}
  onFocus={() => setShowAutocomplete(true)}
  // ...
/>
```

---

#### 2.4. Crear componente AutocompleteDropdown

**Archivo:** `/components/portal/AutocompleteDropdown.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Search, TrendingUp, Folder } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Suggestion {
  text: string;
  type: 'category' | 'popular' | 'keyword';
  score: number;
}

interface AutocompleteDropdownProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
}

export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
}: AutocompleteDropdownProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'category':
        return Folder;
      case 'popular':
        return TrendingUp;
      default:
        return Search;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 max-h-96 overflow-y-auto"
    >
      <ul className="py-2">
        {suggestions.map((suggestion, index) => {
          const Icon = getIcon(suggestion.type);
          const isSelected = index === selectedIndex;

          return (
            <li key={`${suggestion.text}-${index}`}>
              <button
                onClick={() => onSelect(suggestion)}
                className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors ${
                  isSelected ? 'bg-blue-100' : ''
                }`}
              >
                <Icon className={`h-4 w-4 ${
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    isSelected ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    {suggestion.type === 'category' && t('autocomplete.categories')}
                    {suggestion.type === 'popular' && t('autocomplete.popular')}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

**Características:**
- ✅ Click outside para cerrar
- ✅ Iconos según tipo de sugerencia
- ✅ Highlighting de item seleccionado
- ✅ Scroll automático
- ✅ Animaciones suaves

---

### **Fase 3: Testing y Validación**

#### 3.1. Tests manuales

**Checklist de testing:**

- [ ] Escribir en español → Sugerencias en español
- [ ] Escribir en inglés → Sugerencias en inglés
- [ ] Cambiar idioma de página → Sugerencias se actualizan
- [ ] Query < 2 caracteres → No muestra sugerencias
- [ ] Tecla ↓ → Navega hacia abajo
- [ ] Tecla ↑ → Navega hacia arriba
- [ ] Tecla Enter → Selecciona sugerencia
- [ ] Tecla Esc → Cierra dropdown
- [ ] Click fuera → Cierra dropdown
- [ ] Click en sugerencia → Ejecuta búsqueda
- [ ] Debouncing → Solo 1 request después de dejar de escribir
- [ ] Performance → Respuesta < 100ms

#### 3.2. Monitoreo post-deployment

**CloudWatch Metrics:**
- Latencia promedio del endpoint `/autocomplete`
- Número de requests por minuto
- Tasa de errores

**Sentry:**
- Errores en frontend (componente)
- Errores en backend (API route)
- Breadcrumbs de queries

**Logging esperado:**
```
[Autocomplete] query="sueño" lang=es results=5 duration=12ms
[Autocomplete] query="muscle" lang=en results=8 duration=8ms
```

---

## 📊 Estimación de Esfuerzo

| Tarea | Tiempo Estimado | Complejidad |
|-------|----------------|-------------|
| 1.1. Archivo de sugerencias | 30 min | Baja |
| 1.2. Endpoint de API | 1-2 horas | Media |
| 2.1. Actualizar traducciones | 20 min | Baja |
| 2.2. Hook useAutocomplete | 1 hora | Media |
| 2.3. Actualizar HealthSearchForm | 1 hora | Media |
| 2.4. Componente AutocompleteDropdown | 1.5 horas | Media |
| 3.1. Testing manual | 1 hora | Baja |
| 3.2. Configurar monitoreo | 30 min | Baja |
| **TOTAL** | **6-7 horas** | **Media** |

---

## 🚀 Plan de Deployment

### Pre-deployment:
1. ✅ Revisar código con el usuario
2. ✅ Aprobar diseño de UI
3. ✅ Confirmar sugerencias en español
4. ✅ Testing en dev environment

### Deployment:
1. Crear branch: `feature/autocomplete-multiidioma`
2. Implementar código según especificaciones
3. Test local con `npm run dev`
4. Push a GitHub
5. Deploy a Vercel (automático)
6. Validar en staging

### Post-deployment:
1. Monitorear CloudWatch por 24h
2. Revisar Sentry por errores
3. Validar analytics de uso
4. Ajustar sugerencias según feedback

---

## 📈 Métricas de Éxito

**KPIs:**
- ✅ Tasa de uso de autocomplete > 60% (vs búsqueda directa)
- ✅ Tasa de selección de sugerencias > 40%
- ✅ Tiempo de respuesta < 100ms (p95)
- ✅ Tasa de error < 0.1%
- ✅ Cero quejas de usuarios sobre idioma incorrecto

---

## 🔮 Mejoras Futuras (Post-MVP)

1. **Machine Learning:**
   - Aprender de búsquedas reales de usuarios
   - Personalizar sugerencias según perfil

2. **Analytics:**
   - Tracking de queries más populares
   - A/B testing de diferentes sugerencias

3. **Performance:**
   - Precarga de sugerencias comunes
   - Service Worker para offline support

4. **UX:**
   - Resaltar parte del texto que coincide con query
   - Categorización visual más clara
   - Teclado shortcuts (Ctrl+K para abrir búsqueda)

5. **Backend:**
   - Conectar a DynamoDB para sugerencias dinámicas
   - Implementar rate limiting
   - Agregar telemetría avanzada con X-Ray

---

## ❓ Preguntas para el Usuario

Antes de proceder con la implementación, necesito confirmar:

1. **¿Prefieres Opción 1 (con API) u Opción 2 (solo frontend)?**
   - Recomiendo Opción 1 por flexibilidad futura

2. **¿Cuántas sugerencias quieres mostrar?**
   - Sugerencia: 5-10 sugerencias máximo

3. **¿Hay búsquedas populares adicionales que debería incluir?**
   - Actualmente tengo 6 por idioma

4. **¿El diseño del dropdown debe seguir exactamente el estilo actual de la página?**
   - O prefieres que proponga un diseño específico?

5. **¿Quieres que implemente tests automatizados (Jest/React Testing Library)?**
   - Agregaría ~2 horas al estimado

---

## 📌 Resumen

**Problema:** Autocomplete no existe
**Solución:** Implementar sistema completo de autocomplete multiidioma
**Tiempo:** 6-7 horas
**Costo:** ~$0.01/mes (despreciable)
**Riesgo:** Bajo - No afecta funcionalidad existente

**Próximo paso:** Esperar aprobación del usuario para proceder con la implementación.

---

**FIN DEL DOCUMENTO DE SOLUCIÓN**
