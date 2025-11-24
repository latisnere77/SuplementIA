# 🎯 Plan Sistemático: Sugerencias Inteligentes en Autocomplete

## 📋 Resumen Ejecutivo

**Objetivo:** Implementar sugerencias inteligentes en el autocomplete que prevengan errores ANTES de que el usuario busque, integrándose con `supplement-suggestions.ts` para corregir typos y variaciones en tiempo real.

**Duración Estimada:** 3 días (modular, sin breaking changes)

**Principios de Diseño:**
- ✅ Arquitectura modular (cada componente es independiente)
- ✅ Sin código monolítico (separación de responsabilidades)
- ✅ Prevención de efecto cascada (interfaces estables)
- ✅ Debugging sistemático (logging estructurado)
- ✅ Graceful degradation (si falla, sistema actual sigue funcionando)

---

## 🗺️ X-Ray Mapping: Arquitectura Actual

### Flujo Completo Actual
```
Usuario escribe → useAutocomplete hook → API /autocomplete → getSuggestions()
                                                                    ↓
                                        ┌──────────────────────────┴────────────────────────┐
                                        │                                                     │
                                   Fuse.js Local                                      PubMed Fallback
                                (< 5ms, ~100 supplements)                       (> 1s, Lambda call)
                                        │                                                     │
                                        └──────────────────────────┬────────────────────────┘
                                                                   │
                                                          Merge + Sort by score
                                                                   │
                                                          Return to UI (Combobox)
```

### Componentes Clave (Mapeados con X-Ray)

#### 1. UI Layer
- **Archivo:** `app/portal/page.tsx`
- **Líneas:** 30-34, 251-384
- **Responsabilidad:** Capturar input del usuario
- **Dependencias:** useAutocomplete hook, Combobox (Headless UI)
- **Co-dependencias:** validateSupplementQuery

#### 2. Hook Layer
- **Archivo:** `lib/portal/useAutocomplete.tsx`
- **Líneas:** 1-126
- **Responsabilidad:** Debouncing (300ms), state management, API calls
- **Dependencias:** API /api/portal/autocomplete
- **Co-dependencias:** Ninguna (standalone)

#### 3. API Layer
- **Archivo:** `app/api/portal/autocomplete/route.ts`
- **Líneas:** 1-257
- **Responsabilidad:** Validaciones, cache headers, error handling
- **Dependencias:** getSuggestions() service
- **Co-dependencias:** Sentry logging

#### 4. Service Layer
- **Archivo:** `lib/portal/autocomplete-suggestions-fuzzy.ts`
- **Líneas:** 1-283
- **Responsabilidad:** Fuzzy matching (Fuse.js) + PubMed fallback
- **Dependencias:** Fuse.js, supplements-database, studies-fetcher Lambda
- **Co-dependencias:** Ninguna

#### 5. Data Layer
- **Archivo:** `lib/portal/supplements-database.ts`
- **Responsabilidad:** Base de datos estática (~100 supplements)
- **Dependencias:** Ninguna
- **Co-dependencias:** autocomplete-suggestions-fuzzy, query-validator

### Puntos Críticos de Integración

| Punto | Archivo | Línea | Modificable | Impacto | Notas |
|-------|---------|-------|-------------|---------|-------|
| 🟢 **IDEAL** | `autocomplete-suggestions-fuzzy.ts` | 134-203 | ✅ Sí | Bajo | Añadir fallback adicional |
| 🟡 **SEGURO** | `supplements-database.ts` | EOF | ✅ Sí | Mínimo | Expandir DB estática |
| 🟠 **CUIDADO** | `autocomplete/route.ts` | 132 | ⚠️ Sí | Medio | Requiere tests adicionales |
| 🔴 **EVITAR** | `useAutocomplete.tsx` | Any | ❌ No | Alto | Rompe UI, difícil debug |

---

## 📐 Arquitectura Propuesta (Modular)

### Nuevo Componente: Intelligent Suggestion Engine

```
┌────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA MODULAR                             │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         EXISTING SYSTEM                              │
│  (NO SE MODIFICA, SIGUE FUNCIONANDO IGUAL)                          │
│                                                                       │
│  useAutocomplete → API → getSuggestions()                           │
│                            ↓                                          │
│                       Fuse.js Local                                  │
│                            ↓                                          │
│                      Score >= 60? ──YES──> Return                   │
│                            │                                          │
│                           NO                                          │
│                            ↓                                          │
│                    [PUNTO DE INYECCIÓN]                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW INTELLIGENT MODULE                            │
│  (MODULAR, INDEPENDIENTE, GRACEFUL DEGRADATION)                     │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │  1. Intelligent Suggestion Coordinator                     │     │
│  │  Archivo: autocomplete-intelligent-coordinator.ts          │     │
│  │  Responsabilidad: Orquestar múltiples fuentes              │     │
│  └────────────┬───────────────────────────────────────────────┘     │
│               │                                                       │
│               ├──────────────┬───────────────┬─────────────────┐    │
│               ▼              ▼               ▼                 ▼    │
│  ┌────────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐│
│  │ 2a. Correction │  │ 2b. Context│  │ 2c. Trending│  │ 2d. LLM  ││
│  │    Engine      │  │    Engine  │  │    Engine   │  │  Engine  ││
│  │                │  │            │  │             │  │          ││
│  │ Usa:           │  │ Usa:       │  │ Usa:        │  │ Usa:     ││
│  │ supplement-    │  │ User       │  │ Analytics   │  │ Bedrock  ││
│  │ suggestions.ts │  │ history    │  │ data        │  │ API      ││
│  └────────────────┘  └────────────┘  └────────────┘  └───────────┘│
│               │              │               │                 │     │
│               └──────────────┴───────────────┴─────────────────┘     │
│                                      │                                │
│                                      ▼                                │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │  3. Intelligent Cache Manager                              │     │
│  │  Archivo: autocomplete-intelligent-cache.ts                │     │
│  │  Responsabilidad: Cache con TTL, deduplicación             │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  Merge con resultados existentes
                           │
                           ▼
                     Sort by score total
                           │
                           ▼
                    Return to user (UI)
```

### Módulos Independientes

#### Módulo 1: Correction Engine (Priority 1)
**Archivo:** `lib/portal/autocomplete-correction-engine.ts`

```typescript
/**
 * Correction Engine
 * Integra con supplement-suggestions.ts para corregir typos
 */
import { suggestSupplementCorrection } from './supplement-suggestions';

export async function getCorrectionSuggestions(
  query: string,
  lang: 'en' | 'es'
): Promise<CorrectionSuggestion[]> {
  const correction = suggestSupplementCorrection(query);

  if (!correction) return [];

  return [{
    text: correction.suggestion,
    originalQuery: query,
    type: 'correction',
    score: 95, // High confidence for corrections
    reason: correction.reason,
    category: 'supplement',
  }];
}
```

**Dependencias:**
- ✅ `supplement-suggestions.ts` (ya existe)
- ❌ NO depende de PubMed
- ❌ NO depende de Fuse.js

**Testing:**
```typescript
// test/autocomplete-correction-engine.test.ts
describe('CorrectionEngine', () => {
  it('should correct "enzima q15" to "CoQ10"', async () => {
    const result = await getCorrectionSuggestions('enzima q15', 'es');
    expect(result[0].text).toBe('CoQ10');
    expect(result[0].score).toBeGreaterThan(90);
  });

  it('should return empty for valid queries', async () => {
    const result = await getCorrectionSuggestions('ashwagandha', 'en');
    expect(result).toHaveLength(0);
  });
});
```

---

#### Módulo 2: Context Engine (Priority 2)
**Archivo:** `lib/portal/autocomplete-context-engine.ts`

```typescript
/**
 * Context Engine
 * Sugiere basado en contexto del usuario (historial, búsquedas recientes)
 */

interface UserContext {
  recentSearches?: string[];
  currentConditions?: string[];
  preferredCategories?: string[];
}

export async function getContextualSuggestions(
  query: string,
  context: UserContext,
  lang: 'en' | 'es'
): Promise<ContextualSuggestion[]> {
  const suggestions: ContextualSuggestion[] = [];

  // Si el usuario ha buscado "sleep" antes y ahora busca "mag"
  // Sugerir "Magnesium" con nota de contexto
  if (context.recentSearches?.includes('sleep') && query.startsWith('mag')) {
    suggestions.push({
      text: 'Magnesium',
      type: 'contextual',
      score: 88,
      reason: 'Often used with sleep supplements',
      category: 'mineral',
      contextNote: 'Based on your recent searches',
    });
  }

  return suggestions;
}
```

**Dependencias:**
- ✅ localStorage (para leer historial)
- ❌ NO depende de backend
- ❌ NO depende de Lambda

**Testing:**
```typescript
describe('ContextEngine', () => {
  it('should suggest related supplements based on history', async () => {
    const context = { recentSearches: ['sleep', 'anxiety'] };
    const result = await getContextualSuggestions('mag', context, 'en');
    expect(result).toContainEqual(
      expect.objectContaining({ text: 'Magnesium' })
    );
  });
});
```

---

#### Módulo 3: Intelligent Coordinator (Core)
**Archivo:** `lib/portal/autocomplete-intelligent-coordinator.ts`

```typescript
/**
 * Intelligent Coordinator
 * Orquesta todos los engines y devuelve sugerencias unificadas
 */

import { getCorrectionSuggestions } from './autocomplete-correction-engine';
import { getContextualSuggestions } from './autocomplete-context-engine';

export interface IntelligentOptions {
  enableCorrections: boolean;
  enableContext: boolean;
  enableTrending: boolean;
  maxSuggestions: number;
}

const DEFAULT_OPTIONS: IntelligentOptions = {
  enableCorrections: true,
  enableContext: true,
  enableTrending: false, // Fase 2
  maxSuggestions: 10,
};

export async function getIntelligentSuggestions(
  query: string,
  lang: 'en' | 'es',
  userContext?: UserContext,
  options: Partial<IntelligentOptions> = {}
): Promise<IntelligentSuggestion[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const allSuggestions: IntelligentSuggestion[] = [];

  // Parallel execution (no bloqueante)
  const promises: Promise<any[]>[] = [];

  if (opts.enableCorrections) {
    promises.push(
      getCorrectionSuggestions(query, lang).catch(err => {
        console.warn('[Intelligent] Correction engine failed:', err);
        return []; // Graceful degradation
      })
    );
  }

  if (opts.enableContext && userContext) {
    promises.push(
      getContextualSuggestions(query, userContext, lang).catch(err => {
        console.warn('[Intelligent] Context engine failed:', err);
        return [];
      })
    );
  }

  // Wait for all engines (with timeout)
  const results = await Promise.race([
    Promise.allSettled(promises),
    new Promise(resolve => setTimeout(() => resolve([]), 3000)), // 3s timeout
  ]);

  // Merge results
  for (const result of results as PromiseSettledResult<any[]>[]) {
    if (result.status === 'fulfilled') {
      allSuggestions.push(...result.value);
    }
  }

  // Deduplicate by text (case insensitive)
  const unique = Array.from(
    new Map(allSuggestions.map(s => [s.text.toLowerCase(), s])).values()
  );

  // Sort by score descending
  unique.sort((a, b) => b.score - a.score);

  return unique.slice(0, opts.maxSuggestions);
}
```

**Dependencias:**
- ✅ Correction Engine
- ✅ Context Engine
- ❌ NO depende de getSuggestions() existente

**Testing:**
```typescript
describe('IntelligentCoordinator', () => {
  it('should merge suggestions from multiple engines', async () => {
    const result = await getIntelligentSuggestions(
      'enzima q15',
      'es',
      { recentSearches: ['heart'] }
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBeGreaterThan(85);
  });

  it('should handle engine failures gracefully', async () => {
    // Mock one engine to fail
    jest.spyOn(CorrectionEngine, 'getCorrectionSuggestions')
      .mockRejectedValue(new Error('API down'));

    const result = await getIntelligentSuggestions('test', 'en');
    // Should still return results from other engines
    expect(result).toBeDefined();
  });
});
```

---

#### Módulo 4: Integration Layer
**Archivo:** `lib/portal/autocomplete-suggestions-fuzzy.ts` (MODIFICAR)

```typescript
// LÍNEA 5: Añadir import
import { getIntelligentSuggestions } from './autocomplete-intelligent-coordinator';

// LÍNEA 182: Modificar fallback section
if (shouldUseFallback && normalizedQuery.length >= 3) {
  // EXISTING: PubMed fallback
  const pubmedExists = await checkPubMedExists(query);
  if (pubmedExists) {
    suggestions.push({
      text: capitalizeWords(query),
      type: 'supplement',
      score: FALLBACK_SCORE,
      category: 'other',
      healthConditions: [],
    });
  }

  // ✅ NEW: Intelligent suggestions fallback
  try {
    const intelligentSuggestions = await getIntelligentSuggestions(
      query,
      lang,
      undefined, // Context: TODO en fase 2
      { maxSuggestions: 3 } // Limit para no saturar
    );

    // Transform to AutocompleteSuggestion format
    intelligentSuggestions.forEach(s => {
      suggestions.push({
        text: s.text,
        type: s.type || 'supplement',
        score: s.score,
        category: s.category || 'other',
        healthConditions: s.healthConditions || [],
        metadata: {
          reason: s.reason,
          originalQuery: s.originalQuery,
        },
      });
    });
  } catch (error) {
    // Graceful degradation: log but don't break
    console.warn('[Autocomplete] Intelligent suggestions failed:', error);
  }
}

// EXISTING: Sort and return
suggestions.sort((a, b) => b.score - a.score);
return suggestions.slice(0, limit);
```

**Cambios Mínimos:**
- ✅ Solo 15 líneas agregadas
- ✅ Envuelto en try/catch (graceful degradation)
- ✅ No modifica flujo existente (PubMed sigue funcionando)
- ✅ Fácil de rollback (comentar bloque NEW)

---

## 🔒 Prevención de Efecto Cascada

### Contratos de Interfaz (Estables)

#### Interface 1: AutocompleteSuggestion (NO CAMBIAR)
```typescript
// lib/portal/autocomplete-suggestions-fuzzy.ts
export interface AutocompleteSuggestion {
  text: string;                    // REQUERIDO
  type: 'supplement' | 'condition'; // REQUERIDO
  score: number;                    // REQUERIDO (0-100)
  category: string;                 // REQUERIDO
  healthConditions?: string[];      // OPCIONAL
  metadata?: Record<string, any>;   // OPCIONAL (para extensión)
}
```

**Garantía:** Todos los nuevos engines DEBEN retornar este formato.

#### Interface 2: IntelligentSuggestion (NUEVA)
```typescript
// lib/portal/autocomplete-intelligent-coordinator.ts
export interface IntelligentSuggestion extends AutocompleteSuggestion {
  reason?: string;         // Explicación de por qué se sugiere
  originalQuery?: string;  // Query original del usuario
  contextNote?: string;    // Nota contextual
}
```

**Garantía:** Compatible con AutocompleteSuggestion (hereda).

---

### Matriz de Dependencias

| Módulo | Depende De | Consumido Por | Impacto si Falla |
|--------|-----------|---------------|------------------|
| **Correction Engine** | supplement-suggestions.ts | Coordinator | Bajo (solo correcciones) |
| **Context Engine** | localStorage | Coordinator | Bajo (solo contextuales) |
| **Intelligent Coordinator** | Engines | Integration Layer | Medio (fallback a PubMed) |
| **Integration Layer** | Coordinator | API Route | Alto (pero con try/catch) |

### Estrategia de Rollback

```typescript
// Feature flag en config
export const INTELLIGENT_AUTOCOMPLETE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_INTELLIGENT_AUTOCOMPLETE === 'true';

// En autocomplete-suggestions-fuzzy.ts
if (INTELLIGENT_AUTOCOMPLETE_ENABLED) {
  try {
    const intelligent = await getIntelligentSuggestions(...);
    suggestions.push(...intelligent);
  } catch (error) {
    console.warn('[Autocomplete] Intelligent disabled due to error:', error);
  }
}
```

**Ventaja:** Puedes desactivar con variable de entorno sin redeploy.

---

## 🧪 Plan de Testing Sistemático

### Fase 1: Unit Tests (Cada Módulo Aislado)

```bash
# Test structure
tests/
├── autocomplete-correction-engine.test.ts
├── autocomplete-context-engine.test.ts
├── autocomplete-intelligent-coordinator.test.ts
└── autocomplete-integration.test.ts
```

**Coverage Target:** 90%+

### Fase 2: Integration Tests

```typescript
// tests/integration/autocomplete-flow.test.ts
describe('Autocomplete Integration', () => {
  it('should return intelligent suggestions when local search fails', async () => {
    const query = 'enzima q15'; // Typo
    const result = await getSuggestions(query, 'es', 10);

    // Debe sugerir CoQ10
    expect(result).toContainEqual(
      expect.objectContaining({ text: 'CoQ10' })
    );
  });

  it('should not break when intelligent system fails', async () => {
    // Mock intelligent coordinator to throw
    jest.spyOn(IntelligentCoordinator, 'getIntelligentSuggestions')
      .mockRejectedValue(new Error('Service down'));

    const query = 'ashwagandha';
    const result = await getSuggestions(query, 'en', 10);

    // Should still return Fuse.js results
    expect(result.length).toBeGreaterThan(0);
  });
});
```

### Fase 3: Performance Tests

```typescript
// tests/performance/autocomplete-perf.test.ts
describe('Autocomplete Performance', () => {
  it('should return suggestions within 500ms', async () => {
    const start = Date.now();
    await getSuggestions('ashwagandha', 'en', 10);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('should not slow down when intelligent system is enabled', async () => {
    const queries = ['ash', 'magn', 'omega', 'vit', 'coq'];
    const results = [];

    for (const query of queries) {
      const start = Date.now();
      await getSuggestions(query, 'en', 10);
      results.push(Date.now() - start);
    }

    const avgTime = results.reduce((a, b) => a + b) / results.length;
    expect(avgTime).toBeLessThan(300); // Average < 300ms
  });
});
```

---

## 🔍 Debugging Sistemático

### Structured Logging

```typescript
// lib/portal/autocomplete-logger.ts
export const autocompleteLogger = {
  logEngineStart: (engineName: string, query: string) => {
    console.log(JSON.stringify({
      event: 'ENGINE_START',
      engine: engineName,
      query,
      timestamp: Date.now(),
    }));
  },

  logEngineSuccess: (engineName: string, count: number, duration: number) => {
    console.log(JSON.stringify({
      event: 'ENGINE_SUCCESS',
      engine: engineName,
      suggestionsCount: count,
      duration,
      timestamp: Date.now(),
    }));
  },

  logEngineError: (engineName: string, error: Error) => {
    console.error(JSON.stringify({
      event: 'ENGINE_ERROR',
      engine: engineName,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    }));
  },
};

// Usar en cada engine
export async function getCorrectionSuggestions(...) {
  autocompleteLogger.logEngineStart('CorrectionEngine', query);
  const start = Date.now();

  try {
    const suggestions = await ...;
    autocompleteLogger.logEngineSuccess(
      'CorrectionEngine',
      suggestions.length,
      Date.now() - start
    );
    return suggestions;
  } catch (error) {
    autocompleteLogger.logEngineError('CorrectionEngine', error);
    throw error;
  }
}
```

### Debugging Dashboard (Opcional)

```typescript
// components/portal/AutocompleteDebugger.tsx
export function AutocompleteDebugger({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Intercept console.log
    const original = console.log;
    console.log = (...args) => {
      if (args[0]?.includes?.('ENGINE_')) {
        setLogs(prev => [...prev, JSON.parse(args[0])]);
      }
      original.apply(console, args);
    };

    return () => {
      console.log = original;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-black text-green-400 p-4 rounded font-mono text-xs">
      {logs.map((log, i) => (
        <div key={i} className="border-b border-gray-700 pb-2 mb-2">
          <div className="font-bold">{log.event}</div>
          <div>Engine: {log.engine}</div>
          {log.duration && <div>Duration: {log.duration}ms</div>}
        </div>
      ))}
    </div>
  );
}
```

---

## 📅 Plan de Implementación (3 Días)

### DÍA 1: Setup + Correction Engine
**Tareas:**
- [ ] Crear estructura de archivos modular
- [ ] Implementar Correction Engine
- [ ] Escribir unit tests para Correction Engine
- [ ] Integrar con supplement-suggestions.ts
- [ ] Testing manual con queries conocidos

**Entregable:** Correction Engine funcional y testeado

**Tiempo:** 8 horas

---

### DÍA 2: Context Engine + Coordinator
**Tareas:**
- [ ] Implementar Context Engine (localStorage)
- [ ] Escribir unit tests para Context Engine
- [ ] Implementar Intelligent Coordinator
- [ ] Escribir unit tests para Coordinator
- [ ] Integration tests (Correction + Context)

**Entregable:** Sistema completo funcionando en aislado

**Tiempo:** 8 horas

---

### DÍA 3: Integration + Testing + Deployment
**Tareas:**
- [ ] Integrar con autocomplete-suggestions-fuzzy.ts
- [ ] Feature flag implementation
- [ ] Performance testing
- [ ] Integration testing (end-to-end)
- [ ] Debugging dashboard (opcional)
- [ ] Code review
- [ ] Deployment a staging
- [ ] Testing en staging
- [ ] Deployment a production (con feature flag OFF)
- [ ] Activar feature flag gradualmente (10% → 50% → 100%)

**Entregable:** Sistema en producción, monitoreado, rollback ready

**Tiempo:** 8 horas

---

## ✅ Checklist de Confirmación

Antes de implementar, confirma cada punto:

### Arquitectura
- [ ] ¿El código es modular? (cada engine es independiente)
- [ ] ¿No hay código monolítico? (separación clara de responsabilidades)
- [ ] ¿Las interfaces están bien definidas? (contratos estables)
- [ ] ¿Hay graceful degradation? (sistema actual sigue funcionando si falla)

### Dependencias
- [ ] ¿Mapeaste TODAS las dependencias? (X-Ray completo)
- [ ] ¿Identificaste co-dependencias? (quién más usa esto)
- [ ] ¿Definiste estrategia de rollback? (feature flags, etc.)
- [ ] ¿Evitaste circular dependencies? (imports limpios)

### Testing
- [ ] ¿Hay unit tests para cada módulo? (90%+ coverage)
- [ ] ¿Hay integration tests? (flujo completo)
- [ ] ¿Hay performance tests? (< 500ms target)
- [ ] ¿Simulaste failures? (graceful degradation funciona)

### Debugging
- [ ] ¿Implementaste structured logging? (JSON logs)
- [ ] ¿Cada engine logea start/success/error? (observabilidad)
- [ ] ¿Tienes métricas de performance? (durations)
- [ ] ¿Puedes debuggear en producción? (logs claros)

### Deployment
- [ ] ¿Tienes feature flag? (activar/desactivar sin redeploy)
- [ ] ¿Deployment gradual? (10% → 50% → 100%)
- [ ] ¿Rollback plan? (cómo revertir si falla)
- [ ] ¿Monitoring post-deployment? (alertas configuradas)

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Intelligent system aumenta latencia | Media | Alto | Timeout 3s + cache + parallel execution |
| Breaking changes en UI | Baja | Alto | Interface estable + unit tests |
| Correction engine falla | Media | Bajo | Graceful degradation + fallback a PubMed |
| Cache memory leak | Baja | Medio | TTL + max size limit + periodic cleanup |
| Feature flag no funciona | Baja | Alto | Test en staging primero |

---

## 📊 Métricas de Éxito

### Antes de Implementar (Baseline)
- Autocomplete response time: ~150ms (Fuse.js)
- PubMed fallback rate: ~30% de queries
- User satisfaction: (medir con analytics)

### Después de Implementar (Target)
- Autocomplete response time: < 300ms (con intelligent)
- Correction success rate: > 80% (typos corregidos)
- Reduced 404 searches: -30%
- User clicks on suggestions: +40%

---

## 🎯 Conclusión

Este plan garantiza:
1. ✅ **Modularidad:** Cada engine es independiente
2. ✅ **Sin breaking changes:** Sistema actual sigue funcionando
3. ✅ **Debugging sistemático:** Logs estructurados
4. ✅ **Rollback fácil:** Feature flags
5. ✅ **Testing completo:** Unit + Integration + Performance

**Listo para empezar:** Confirma este plan y procedo con la implementación.
