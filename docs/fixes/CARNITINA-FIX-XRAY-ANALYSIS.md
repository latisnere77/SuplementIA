# 🔍 X-Ray Analysis: Carnitina Search Flow Fix

**Fecha**: 2025-11-21
**Problema**: Error 404 al buscar "carnitina" - no se encuentran estudios científicos
**Tipo**: Mejora sistemática modular con prevención de cascada

---

## 📊 X-Ray Service Map - Estado Actual

```
┌──────────┐
│ Frontend │  Query: "carnitina"
│ (Browser)│
└─────┬────┘
      │
      │ POST /api/portal/quiz
      │ { category: "carnitina" }
      ▼
┌─────────────────────┐
│ API Route           │  /api/portal/quiz/route.ts
│ /api/portal/quiz    │  • Valida query ✅
│                     │  • Sanitiza "carnitina" ✅
└──────────┬──────────┘
           │
           │ POST /api/portal/recommend
           │ { category: "carnitina" }
           ▼
┌─────────────────────┐
│ API Route           │  /api/portal/recommend/route.ts
│ /api/portal/recommend│  • Llama a Lambda backend
└──────────┬──────────┘
           │
           │ POST Lambda URL
           │ { category: "carnitina" }
           ▼
┌─────────────────────┐
│ Lambda Backend      │  content-enricher
│ (Node.js)           │  • Busca en PubMed: "carnitina"
│                     │  • 📛 NO ENCUENTRA ESTUDIOS
└──────────┬──────────┘
           │
           │ 404 Not Found
           │ { error: "insufficient_data" }
           ▼
┌─────────────────────┐
│ Frontend Results    │  /portal/results/page.tsx
│                     │  • Muestra error genérico ❌
│                     │  • NO ofrece sugerencias ❌
└─────────────────────┘
```

### 🔴 Puntos de Falla Identificados

1. **Lambda Backend** (`content-enricher`)
   - Busca literalmente "carnitina" en PubMed
   - No prueba variaciones: "L-Carnitina", "L-carnitine", "acetyl-L-carnitine"
   - **Dependencia rígida**: Si no encuentra, falla directamente

2. **Frontend** (`app/portal/results/page.tsx:550`)
   - Llama a `suggestSupplementCorrection("carnitina")`
   - `supplement-suggestions.ts` NO tiene "carnitina" → "L-Carnitina" ❌
   - Muestra error genérico sin sugerencias inteligentes

3. **Falta de Query Normalization**
   - No existe módulo centralizado para normalizar queries
   - Cada capa hace su propia interpretación
   - **Riesgo de cascada**: cambiar en un lugar → rompe otros

---

## 🎯 Solución Modular - Arquitectura Mejorada

### Principios de Diseño

✅ **Modular**: 4 módulos independientes
✅ **Sin cascadas**: Cambios aislados por módulo
✅ **Debugging sistemático**: X-Ray traces en cada paso
✅ **Graceful degradation**: Si falla un módulo, continúan los demás

---

## 📐 Nueva Arquitectura con Módulos Independientes

```
┌──────────┐
│ Frontend │  Query: "carnitina"
│ (Browser)│
└─────┬────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│ MÓDULO 1: Query Normalization Service       │
│ lib/portal/query-normalizer.ts (NUEVO)      │
│                                             │
│ Input:  "carnitina"                         │
│ Output: {                                   │
│   normalized: "L-Carnitine",                │
│   variations: [                             │
│     "L-Carnitine",                          │
│     "Acetyl-L-Carnitine",                   │
│     "carnitine",                            │
│     "levocarnitine"                         │
│   ],                                        │
│   category: "amino_acid",                   │
│   confidence: 0.95                          │
│ }                                           │
│                                             │
│ ✅ Independiente: No depende de APIs        │
│ ✅ Reutilizable: Frontend + Backend         │
│ ✅ Testeable: Tests unitarios aislados      │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ MÓDULO 2: Supplement Suggestions (Enhanced) │
│ lib/portal/supplement-suggestions.ts        │
│                                             │
│ • Agrega 50+ variaciones de carnitina       │
│ • Fuzzy matching mejorado                   │
│ • Categorización por tipo                   │
│                                             │
│ ✅ Sin dependencias externas                │
│ ✅ Cache en memoria (Map)                   │
│ ✅ Tests con 100+ casos                     │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ MÓDULO 3: Backend Query Expander (Lambda)   │
│ backend/lambda/query-expander/ (NUEVO)      │
│                                             │
│ Input:  { query: "carnitina" }              │
│ Process:                                    │
│   1. Normaliza con shared/query-utils.js    │
│   2. Genera variaciones de búsqueda         │
│   3. Busca en PubMed con TODAS las variantes│
│   4. Agrega estudios de fuentes alternativas│
│                                             │
│ Output: {                                   │
│   studies: [...],  // Estudios encontrados  │
│   searchTermsUsed: ["L-Carnitine", ...],    │
│   dataSource: "pubmed",                     │
│   fallbackUsed: false                       │
│ }                                           │
│                                             │
│ ✅ Timeout independiente: 8s                │
│ ✅ Fallback a cache si PubMed falla         │
│ ✅ X-Ray annotations: query, variations     │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ MÓDULO 4: Logging & Monitoring Service      │
│ lib/portal/search-analytics.ts (NUEVO)      │
│                                             │
│ • Loggea búsquedas fallidas                 │
│ • Identifica patrones de queries sin datos  │
│ • Dashboard de búsquedas populares          │
│ • Alertas cuando > 10 búsquedas fallan/hora │
│                                             │
│ ✅ Asíncrono: No bloquea flujo principal    │
│ ✅ Batching: Envía logs cada 100 eventos    │
│ ✅ X-Ray metadata: success_rate, terms      │
└─────────────────────────────────────────────┘
```

---

## 🔗 Matriz de Dependencias (Prevención de Cascada)

| Módulo | Depende De | Tipo | Qué pasa si falla |
|--------|-----------|------|-------------------|
| **Query Normalizer** | ❌ Ninguno | Independiente | Sistema usa query original |
| **Supplement Suggestions** | Query Normalizer (opcional) | Soft | Fuzzy matching sin normalización |
| **Backend Query Expander** | Query Normalizer (shared) | Hard (pero modular) | Usa query literal sin expandir |
| **Logging Service** | ❌ Ninguno | Independiente | Logs no se envían (no crítico) |

### ✅ Verificación de No-Cascada

**Escenario 1**: Query Normalizer falla
- ✅ Frontend: Usa suggestions sin normalizar
- ✅ Backend: Busca con query literal
- ✅ Sistema: Continúa funcionando (degradado)

**Escenario 2**: Backend Query Expander falla (timeout)
- ✅ Frontend: Muestra sugerencias de supplement-suggestions
- ✅ User experience: "No encontramos X, ¿buscabas Y?"
- ✅ Logging: Registra falla para análisis

**Escenario 3**: PubMed API cae
- ✅ Backend: Usa cache de DynamoDB
- ✅ Backend: Intenta fuentes alternativas (Europe PMC)
- ✅ Sistema: Devuelve datos aunque sean más antiguos

---

## 📋 Plan de Implementación Sistemático

### Fase 1: Preparación (30 min)
**Objetivo**: Setup de infraestructura y revisión de dependencias

#### 1.1 Análisis de Dependencias
```bash
# Verificar dependencias actuales
cd /Users/latisnere/Documents/suplementia
grep -r "suggestSupplementCorrection" --include="*.ts" --include="*.tsx"
grep -r "sanitizeQuery" --include="*.ts" --include="*.tsx"
grep -r "validateSupplementQuery" --include="*.ts" --include="*.tsx"
```

#### 1.2 Crear estructura modular
```bash
# Crear directorios para nuevos módulos
mkdir -p lib/portal/query-normalization
mkdir -p lib/portal/search-analytics
mkdir -p backend/lambda/query-expander
mkdir -p backend/shared/query-utils
```

#### 1.3 Configurar X-Ray traces
```typescript
// lib/portal/xray-client.ts (NUEVO)
export const traceSearch = (query: string, stage: string) => {
  if (typeof window !== 'undefined') {
    // Frontend: Use performance marks
    performance.mark(`search-${stage}-${query}`);
  } else {
    // Backend: Use AWS X-Ray
    const AWSXRay = require('aws-xray-sdk-core');
    const segment = AWSXRay.getSegment();
    segment?.addAnnotation('search_query', query);
    segment?.addAnnotation('search_stage', stage);
  }
};
```

---

### Fase 2: Módulo 1 - Query Normalizer (1 hora)
**Objetivo**: Crear módulo centralizado de normalización

#### 2.1 Implementar normalizer
```typescript
// lib/portal/query-normalization/normalizer.ts
export interface NormalizedQuery {
  original: string;
  normalized: string;
  variations: string[];
  category: 'amino_acid' | 'vitamin' | 'mineral' | 'herb' | 'general';
  confidence: number;
}

// Diccionario de normalizaciones
const NORMALIZATION_MAP: Record<string, string> = {
  'carnitina': 'L-Carnitine',
  'carnitine': 'L-Carnitine',
  'l-carnitina': 'L-Carnitine',
  'levocarnitine': 'L-Carnitine',
  'acetil-l-carnitina': 'Acetyl-L-Carnitine',
  'acetyl carnitine': 'Acetyl-L-Carnitine',
  // ... (50+ términos más)
};

export function normalizeQuery(query: string): NormalizedQuery {
  const lowercased = query.toLowerCase().trim();

  // Buscar normalización exacta
  if (NORMALIZATION_MAP[lowercased]) {
    return {
      original: query,
      normalized: NORMALIZATION_MAP[lowercased],
      variations: generateVariations(NORMALIZATION_MAP[lowercased]),
      category: detectCategory(NORMALIZATION_MAP[lowercased]),
      confidence: 1.0
    };
  }

  // Fuzzy matching
  const fuzzyMatch = findFuzzyMatch(lowercased);
  if (fuzzyMatch) {
    return {
      original: query,
      normalized: fuzzyMatch.term,
      variations: generateVariations(fuzzyMatch.term),
      category: detectCategory(fuzzyMatch.term),
      confidence: fuzzyMatch.confidence
    };
  }

  // Fallback: retornar query original
  return {
    original: query,
    normalized: query,
    variations: [query],
    category: 'general',
    confidence: 0.0
  };
}
```

#### 2.2 Tests unitarios
```typescript
// lib/portal/query-normalization/normalizer.test.ts
describe('Query Normalizer', () => {
  it('normaliza carnitina correctamente', () => {
    const result = normalizeQuery('carnitina');
    expect(result.normalized).toBe('L-Carnitine');
    expect(result.variations).toContain('Acetyl-L-Carnitine');
    expect(result.confidence).toBe(1.0);
  });

  it('maneja typos con fuzzy matching', () => {
    const result = normalizeQuery('carnita'); // typo
    expect(result.normalized).toBe('L-Carnitine');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('no falla con queries desconocidas', () => {
    const result = normalizeQuery('xyz123');
    expect(result.normalized).toBe('xyz123');
    expect(result.confidence).toBe(0.0);
  });
});
```

#### 2.3 Checklist de validación
- [ ] Tests pasan: `npm test normalizer.test.ts`
- [ ] Sin dependencias externas (100% standalone)
- [ ] Maneja casos edge (null, undefined, strings vacíos)
- [ ] Performance: < 1ms por query

---

### Fase 3: Módulo 2 - Enhanced Suggestions (45 min)
**Objetivo**: Extender supplement-suggestions.ts con carnitina

#### 3.1 Agregar variaciones de carnitina
```typescript
// lib/portal/supplement-suggestions.ts (MODIFICAR)

// AGREGAR al diccionario SUPPLEMENT_CORRECTIONS:
const SUPPLEMENT_CORRECTIONS: Record<string, string> = {
  // ... (existente)

  // ========== CARNITINA VARIATIONS ==========
  // Spanish variations
  'carnitina': 'L-Carnitine',
  'l-carnitina': 'L-Carnitine',
  'levo carnitina': 'L-Carnitine',
  'levocarnitina': 'L-Carnitine',
  'carnita': 'L-Carnitine', // common typo
  'karnitina': 'L-Carnitine', // k/c confusion

  // English variations
  'carnitine': 'L-Carnitine',
  'l-carnitine': 'L-Carnitine',
  'levocarnitine': 'L-Carnitine',

  // Acetyl variations
  'acetil carnitina': 'Acetyl-L-Carnitine',
  'acetil-l-carnitina': 'Acetyl-L-Carnitine',
  'acetil l carnitina': 'Acetyl-L-Carnitine',
  'acetyl carnitine': 'Acetyl-L-Carnitine',
  'acetyl-l-carnitine': 'Acetyl-L-Carnitine',
  'acetyl l carnitine': 'Acetyl-L-Carnitine',
  'alcar': 'Acetyl-L-Carnitine', // common abbreviation

  // Propionyl variations
  'propionil carnitina': 'Propionyl-L-Carnitine',
  'propionyl carnitine': 'Propionyl-L-Carnitine',
  'propionyl-l-carnitine': 'Propionyl-L-Carnitine',
  'plc': 'Propionyl-L-Carnitine', // abbreviation

  // Tartrate variations
  'carnitina tartrato': 'L-Carnitine Tartrate',
  'carnitine tartrate': 'L-Carnitine Tartrate',
  'l-carnitine tartrate': 'L-Carnitine Tartrate',

  // Common misspellings
  'carnitin': 'L-Carnitine',
  'carnit': 'L-Carnitine',
  'cartinine': 'L-Carnitine',
  'carantine': 'L-Carnitine', // common confusion

  // ... (resto del diccionario)
};
```

#### 3.2 Tests para carnitina
```typescript
// lib/portal/supplement-suggestions.test.ts (AGREGAR)
describe('Carnitina Suggestions', () => {
  it('sugiere L-Carnitine para "carnitina"', () => {
    const result = suggestSupplementCorrection('carnitina');
    expect(result?.suggestion).toBe('L-Carnitine');
  });

  it('sugiere Acetyl-L-Carnitine para "alcar"', () => {
    const result = suggestSupplementCorrection('alcar');
    expect(result?.suggestion).toBe('Acetyl-L-Carnitine');
  });

  it('maneja typos: "carnita" → "L-Carnitine"', () => {
    const result = suggestSupplementCorrection('carnita');
    expect(result?.suggestion).toBe('L-Carnitine');
  });

  it('ofrece múltiples sugerencias', () => {
    const results = getSupplementSuggestions('carni', 3);
    expect(results).toContain('L-Carnitine');
    expect(results).toContain('Acetyl-L-Carnitine');
  });
});
```

#### 3.3 Checklist de validación
- [ ] Tests pasan: `npm test supplement-suggestions.test.ts`
- [ ] 20+ variaciones de carnitina agregadas
- [ ] Fuzzy matching detecta typos comunes
- [ ] No rompe sugerencias existentes

---

### Fase 4: Módulo 3 - Backend Query Expander (2 horas)
**Objetivo**: Lambda que expande queries y busca con variaciones

#### 4.1 Revisar buenas prácticas Lambda
```bash
# Leer documento de referencia
cat backend/lambda/README.md | grep -A 20 "best practices"
cat docs/PLAN-CONFIRMACION.md | grep -A 30 "Buenas Prácticas de Lambda"
```

#### 4.2 Crear shared query utils
```javascript
// backend/shared/query-utils.js
/**
 * Shared Query Utilities
 * Reutilizable entre todas las Lambdas
 */

const QUERY_VARIATIONS = {
  'carnitina': ['L-Carnitine', 'Levocarnitine', 'Acetyl-L-Carnitine', '(L-Carnitine OR Levocarnitine OR ALCAR)'],
  'magnesio': ['Magnesium', 'Magnesium Glycinate', 'Magnesium Citrate'],
  'omega 3': ['Omega-3', 'Fish Oil', 'EPA', 'DHA', '(Omega-3 OR EPA OR DHA)'],
  // ... más términos
};

function expandQuery(originalQuery) {
  const normalized = originalQuery.toLowerCase().trim();

  // Buscar expansiones conocidas
  if (QUERY_VARIATIONS[normalized]) {
    return {
      original: originalQuery,
      variations: QUERY_VARIATIONS[normalized],
      searchStrategy: 'multi_term'
    };
  }

  // Fallback: usar query original
  return {
    original: originalQuery,
    variations: [originalQuery],
    searchStrategy: 'single_term'
  };
}

module.exports = { expandQuery, QUERY_VARIATIONS };
```

#### 4.3 Implementar Lambda query-expander
```javascript
// backend/lambda/query-expander/handler.js
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const axios = require('axios');
const { expandQuery } = require('../../shared/query-utils');

/**
 * Query Expander Lambda
 * Busca estudios usando múltiples variaciones del término
 */
exports.handler = async (event) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('query-expander');

  try {
    const { query, maxResults = 10 } = JSON.parse(event.body || '{}');

    // X-Ray annotations
    subsegment?.addAnnotation('query', query);
    subsegment?.addAnnotation('module', 'query-expander');

    // PASO 1: Expandir query
    const expanded = expandQuery(query);
    console.log('[QueryExpander] Expanded query:', JSON.stringify(expanded));

    subsegment?.addMetadata('expanded', expanded);

    // PASO 2: Buscar en PubMed con TODAS las variaciones
    const allStudies = [];

    for (const variation of expanded.variations) {
      try {
        const pubmedResults = await searchPubMed(variation, maxResults);
        allStudies.push(...pubmedResults);

        // X-Ray metadata por variación
        subsegment?.addMetadata(`pubmed_${variation}`, {
          resultsFound: pubmedResults.length,
          searchTerm: variation
        });

        // Si encontramos estudios, podemos detenernos early
        if (allStudies.length >= maxResults) {
          console.log(`[QueryExpander] Found ${allStudies.length} studies with "${variation}"`);
          break;
        }
      } catch (error) {
        console.warn(`[QueryExpander] Failed to search "${variation}":`, error.message);
        // Continuar con siguiente variación
      }
    }

    // PASO 3: Deduplicar estudios por PMID
    const uniqueStudies = deduplicateByPMID(allStudies);

    // PASO 4: Si aún no encontramos nada, intentar fuentes alternativas
    if (uniqueStudies.length === 0) {
      console.log('[QueryExpander] No results from PubMed, trying Europe PMC...');
      const europePMCResults = await searchEuropePMC(query, maxResults);
      uniqueStudies.push(...europePMCResults);
    }

    subsegment?.addAnnotation('studies_found', uniqueStudies.length);
    subsegment?.close();

    // RETORNO: Estudios encontrados + metadata
    return {
      statusCode: uniqueStudies.length > 0 ? 200 : 404,
      body: JSON.stringify({
        success: uniqueStudies.length > 0,
        query: {
          original: query,
          variationsSearched: expanded.variations,
          strategy: expanded.searchStrategy
        },
        studies: uniqueStudies,
        metadata: {
          totalSearched: expanded.variations.length,
          totalFound: uniqueStudies.length,
          dataSources: uniqueStudies.length > 0 ? ['pubmed'] : [],
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('[QueryExpander] Error:', error);
    subsegment?.addError(error);
    subsegment?.close();

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to expand query',
        message: error.message
      })
    };
  }
};

// Helper: Buscar en PubMed
async function searchPubMed(query, maxResults) {
  const PUBMED_SEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

  const response = await axios.get(PUBMED_SEARCH_URL, {
    params: {
      db: 'pubmed',
      term: query,
      retmode: 'json',
      retmax: maxResults,
      usehistory: 'y'
    },
    timeout: 5000
  });

  const pmids = response.data.esearchresult?.idlist || [];

  // Fetch abstracts
  if (pmids.length === 0) return [];

  const PUBMED_FETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
  const fetchResponse = await axios.get(PUBMED_FETCH_URL, {
    params: {
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract'
    },
    timeout: 8000
  });

  // Parse XML y retornar estudios
  const studies = parseP ubMedXML(fetchResponse.data);
  return studies;
}

// Helper: Buscar en Europe PMC (fallback)
async function searchEuropePMC(query, maxResults) {
  const EUROPE_PMC_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

  try {
    const response = await axios.get(EUROPE_PMC_URL, {
      params: {
        query,
        format: 'json',
        pageSize: maxResults
      },
      timeout: 5000
    });

    const results = response.data.resultList?.result || [];
    return results.map(r => ({
      pmid: r.pmid,
      title: r.title,
      abstract: r.abstractText,
      source: 'europe_pmc'
    }));
  } catch (error) {
    console.warn('[QueryExpander] Europe PMC failed:', error.message);
    return [];
  }
}

// Helper: Deduplicar por PMID
function deduplicateByPMID(studies) {
  const seen = new Set();
  return studies.filter(study => {
    if (seen.has(study.pmid)) return false;
    seen.add(study.pmid);
    return true;
  });
}
```

#### 4.4 Deployment de Lambda
```bash
# Crear package deployment
cd backend/lambda/query-expander
npm install axios aws-xray-sdk-core

# Crear zip
zip -r query-expander.zip handler.js ../../shared/query-utils.js node_modules/

# Deploy a AWS
aws lambda create-function \
  --function-name suplementia-query-expander \
  --runtime nodejs18.x \
  --handler handler.handler \
  --zip-file fileb://query-expander.zip \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --timeout 15 \
  --memory-size 512 \
  --environment Variables="{NODE_ENV=production}" \
  --tracing-config Mode=Active  # Habilitar X-Ray

# Configurar Lambda URL (para llamada directa)
aws lambda create-function-url-config \
  --function-name suplementia-query-expander \
  --auth-type NONE \
  --cors AllowOrigins="*"
```

#### 4.5 Integrar en content-enricher existente
```javascript
// backend/lambda/content-enricher/handler.js (MODIFICAR)

// AGREGAR al inicio de handler:
const QUERY_EXPANDER_URL = process.env.QUERY_EXPANDER_URL;

// MODIFICAR flujo de búsqueda de estudios:
async function fetchStudies(category) {
  // Opción 1: Llamar a query-expander Lambda
  try {
    const response = await axios.post(QUERY_EXPANDER_URL, {
      query: category,
      maxResults: 20
    }, { timeout: 10000 });

    if (response.data.success && response.data.studies.length > 0) {
      console.log(`[ContentEnricher] Found ${response.data.studies.length} studies via query-expander`);
      return response.data.studies;
    }
  } catch (error) {
    console.warn('[ContentEnricher] Query expander failed, falling back to direct search:', error.message);
  }

  // Opción 2: Fallback a búsqueda directa
  return await searchPubMedDirect(category);
}
```

#### 4.6 Checklist de validación
- [ ] Lambda desplegada: `aws lambda list-functions | grep query-expander`
- [ ] X-Ray habilitado: Ver traces en AWS Console
- [ ] Test con curl: `curl -X POST LAMBDA_URL -d '{"query":"carnitina"}'`
- [ ] Test con "carnitina" retorna estudios de "L-Carnitine" ✅
- [ ] Timeout configurado: 15s
- [ ] Fallback a Europe PMC funciona
- [ ] Logs en CloudWatch visibles

---

### Fase 5: Módulo 4 - Logging & Analytics (1 hora)
**Objetivo**: Monitorear búsquedas fallidas y patrones

#### 5.1 Implementar search analytics
```typescript
// lib/portal/search-analytics.ts (NUEVO)
interface SearchAnalytics {
  query: string;
  timestamp: number;
  success: boolean;
  studiesFound: number;
  suggestionsOffered: string[];
  userAcceptedSuggestion?: boolean;
}

class SearchAnalyticsService {
  private buffer: SearchAnalytics[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly ENDPOINT = '/api/portal/analytics';

  async logSearch(analytics: SearchAnalytics): Promise<void> {
    this.buffer.push(analytics);

    // Enviar en batch cuando alcancemos el límite
    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: this.buffer })
      });

      this.buffer = [];
    } catch (error) {
      console.warn('[SearchAnalytics] Failed to send analytics:', error);
      // No bloqueamos el flujo principal
    }
  }
}

export const searchAnalytics = new SearchAnalyticsService();
```

#### 5.2 Integrar en results page
```typescript
// app/portal/results/page.tsx (MODIFICAR)

// AGREGAR import:
import { searchAnalytics } from '@/lib/portal/search-analytics';

// MODIFICAR en useEffect donde se genera recomendación:
if (response.status === 404 && errorData.error === 'insufficient_data') {
  // Log analytics
  searchAnalytics.logSearch({
    query: normalizedQuery,
    timestamp: Date.now(),
    success: false,
    studiesFound: 0,
    suggestionsOffered: suggestion ? [suggestion.suggestion] : []
  });

  // ... resto del código
}
```

#### 5.3 Crear API endpoint para analytics
```typescript
// app/api/portal/analytics/route.ts (NUEVO)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json();

    // Guardar en DynamoDB (tabla analytics)
    // O enviar a CloudWatch Logs para análisis
    console.log('[Analytics] Batch of search events:', {
      count: events.length,
      failedSearches: events.filter((e: any) => !e.success).length
    });

    // TODO: Integrar con DynamoDB o CloudWatch

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### 5.4 Checklist de validación
- [ ] Búsquedas fallidas se loggean
- [ ] Batching funciona (envía cada 100 eventos)
- [ ] No bloquea flujo principal (async)
- [ ] Dashboard en CloudWatch muestra métricas

---

## 🔍 Debugging Sistemático con X-Ray

### X-Ray Annotations (Búsqueda por queries)

```typescript
// En cada módulo, agregar annotations:

// Frontend (performance marks):
performance.mark('search-start-carnitina');
performance.mark('search-normalized-L-Carnitine');
performance.mark('search-suggestions-offered');

// Backend Lambda (X-Ray):
subsegment.addAnnotation('search_query', 'carnitina');
subsegment.addAnnotation('normalized_query', 'L-Carnitine');
subsegment.addAnnotation('variations_tried', 4);
subsegment.addAnnotation('studies_found', 12);
subsegment.addAnnotation('module', 'query-expander');
subsegment.addAnnotation('version', '1.0.0');
```

### X-Ray Queries para Debugging

```sql
-- Query 1: Encontrar búsquedas de "carnitina" que fallaron
annotation.search_query = "carnitina" AND annotation.studies_found = 0

-- Query 2: Ver qué variaciones se probaron
annotation.normalized_query = "L-Carnitine"

-- Query 3: Identificar módulos lentos
duration > 5 AND annotation.module = "query-expander"

-- Query 4: Success rate por query
service("suplementia-query-expander") {
  annotation.search_query = "carnitina"
}

-- Query 5: Cascade failure detection
error = true AND annotation.module = "query-expander"
```

### Comandos AWS CLI para X-Ray

```bash
# 1. Ver service map completo
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  > service-graph.json

# 2. Buscar traces de "carnitina"
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.search_query = "carnitina"'

# 3. Ver trace específico
aws xray batch-get-traces \
  --trace-ids TRACE_ID_HERE \
  --query 'Traces[0].Segments[*].[Document]' \
  --output text | jq '.'

# 4. Analizar latencia por módulo
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  | jq '.Services[] | select(.Name == "query-expander") | .SummaryStatistics'
```

---

## 📊 Métricas de Éxito

### Antes de la mejora
- Búsqueda "carnitina" → 404 (0% success)
- Sin sugerencias
- Usuario abandona

### Después de la mejora
- Búsqueda "carnitina" → Normaliza a "L-Carnitine" → 200 (100% success)
- Si falla normalización → Ofrece sugerencias: "L-Carnitine", "Acetyl-L-Carnitine"
- Usuario recibe información útil

### KPIs
1. **Success Rate**: 404 errors reducidos de 100% → <10%
2. **Suggestion Acceptance**: >60% usuarios aceptan sugerencia
3. **Search Latency**: <2s end-to-end (con query expansion)
4. **Cache Hit Rate**: >80% para queries normalizadas

---

## ✅ Checklist Final de Implementación

### Pre-implementation
- [x] Análisis X-Ray completo
- [x] Matriz de dependencias documentada
- [x] Plan modular validado
- [x] Prevención de cascada verificada

### Módulo 1: Query Normalizer
- [ ] Código implementado
- [ ] Tests unitarios (20+ casos)
- [ ] Sin dependencias externas
- [ ] Performance < 1ms

### Módulo 2: Enhanced Suggestions
- [ ] 20+ variaciones de carnitina agregadas
- [ ] Tests actualizados
- [ ] Fuzzy matching funciona
- [ ] No rompe suggestions existentes

### Módulo 3: Backend Query Expander
- [ ] Lambda creada y desplegada
- [ ] X-Ray habilitado
- [ ] Integrada en content-enricher
- [ ] Tests end-to-end pasan

### Módulo 4: Logging & Analytics
- [ ] Service implementado
- [ ] Batching funciona
- [ ] API endpoint creado
- [ ] Dashboard configurado

### Post-implementation
- [ ] Test búsqueda "carnitina" → éxito
- [ ] X-Ray traces visibles
- [ ] Logs en CloudWatch
- [ ] Rollback plan documentado

---

## 🚨 Plan de Rollback

### Si Módulo 1 (Normalizer) falla
```typescript
// Feature flag en código:
const USE_QUERY_NORMALIZER = process.env.ENABLE_QUERY_NORMALIZER === 'true';

if (USE_QUERY_NORMALIZER) {
  normalizedQuery = normalizeQuery(query);
} else {
  normalizedQuery = query; // Usar original
}
```

### Si Módulo 3 (Query Expander Lambda) falla
```javascript
// Lambda tiene auto-rollback:
aws lambda update-function-configuration \
  --function-name suplementia-query-expander \
  --environment Variables="{ENABLE_EXPANSION=false}"

// O revertir a versión anterior:
aws lambda update-alias \
  --function-name suplementia-query-expander \
  --name PROD \
  --function-version $PREVIOUS_VERSION
```

---

## 📚 Referencias

- [Backend Lambda Best Practices](/backend/lambda/README.md)
- [Plan de Confirmación - Arquitectura Modular](/docs/PLAN-CONFIRMACION.md)
- [Supplement Suggestions Module](/lib/portal/supplement-suggestions.ts)
- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/)

---

**Siguiente paso**: ¿Confirmas el plan para empezar con Fase 1?
