# Características Avanzadas de PubMed API - Mejoras Propuestas

## Descubrimientos Clave de la Documentación

### 1. **Best Match Algorithm** (Machine Learning)
PubMed usa un algoritmo de ML de última generación para ordenar por relevancia. Podemos aprovecharlo mejor.

### 2. **Proximity Searching** 
Buscar términos que aparezcan cerca uno del otro en Title/Abstract:
```
"magnesium glycinate"[Title:~3]  // Palabras dentro de 3 palabras de distancia
```

### 3. **History Server** (WebEnv + QueryKey)
Permite combinar búsquedas complejas sin re-ejecutarlas:
```
Search 1: RCTs → WebEnv + QueryKey1
Search 2: Recent → WebEnv + QueryKey2
Combine: #1 AND #2
```

### 4. **ESummary Version 2.0**
Proporciona metadatos más ricos que la versión 1.0

### 5. **Sort Options para PubMed**
- `pub_date` - Por fecha de publicación (descendente)
- `Author` - Por primer autor (ascendente)
- `JournalName` - Por nombre de revista
- `relevance` - Best Match (default)

### 6. **Date Filters Avanzados**
- `reldate` - Últimos N días
- `mindate/maxdate` - Rango específico
- `datetype` - Tipo de fecha (pdat, mdat, edat)

### 7. **Field Tags Específicos**
- `[tiab]` - Title/Abstract
- `[pt]` - Publication Type
- `[mh]` - MeSH Terms (términos médicos controlados)
- `[majr]` - MeSH Major Topic
- `[sb]` - Subset (systematic[sb] para systematic reviews)

## Mejoras Implementables

### **Mejora 1: Búsqueda Multi-Estrategia con History Server**

En lugar de hacer búsquedas separadas, usar el History Server para combinar resultados eficientemente:

```typescript
async function advancedMultiStrategySearch(
  supplementName: string
): Promise<Study[]> {
  // Step 1: Búsqueda de alta calidad con usehistory
  const search1 = await eSearch({
    term: `${supplementName}[tiab] AND (randomized controlled trial[pt] OR meta-analysis[pt])`,
    usehistory: 'y',
    retmax: 100,
    sort: 'relevance',
  });
  // Returns: WebEnv + QueryKey1
  
  // Step 2: Búsqueda de estudios recientes (últimos 3 años)
  const search2 = await eSearch({
    term: `${supplementName}[tiab]`,
    usehistory: 'y',
    WebEnv: search1.WebEnv,
    reldate: 1095, // Últimos 3 años (365 * 3)
    datetype: 'pdat',
  });
  // Returns: Same WebEnv + QueryKey2
  
  // Step 3: Búsqueda de estudios negativos
  const search3 = await eSearch({
    term: `${supplementName}[tiab] AND (no effect[tiab] OR ineffective[tiab] OR placebo[tiab])`,
    usehistory: 'y',
    WebEnv: search1.WebEnv,
  });
  // Returns: Same WebEnv + QueryKey3
  
  // Step 4: Combinar todos los resultados (OR)
  const combined = await eSearch({
    term: '#1 OR #2 OR #3', // Combina los 3 query keys
    usehistory: 'y',
    WebEnv: search1.WebEnv,
    retmax: 200,
  });
  
  // Step 5: Fetch todos los resultados de una vez
  const studies = await eFetch({
    WebEnv: combined.WebEnv,
    query_key: combined.QueryKey,
    retmax: 200,
  });
  
  return studies;
}
```

**Ventajas:**
- Más eficiente (menos llamadas a la API)
- Permite combinaciones complejas (AND, OR, NOT)
- Respeta rate limits mejor
- Resultados deduplicados automáticamente por PubMed

### **Mejora 2: Proximity Search para Formas Químicas**

Para búsquedas como "magnesium glycinate", usar proximity search:

```typescript
function buildProximityQuery(supplement: string, form?: string): string {
  if (form) {
    // Buscar ambos términos dentro de 3 palabras de distancia
    return `"${supplement} ${form}"[Title:~3]`;
  }
  return `${supplement}[tiab]`;
}

// Ejemplo:
// "magnesium glycinate"[Title:~3]
// Encuentra: "glycinate form of magnesium", "magnesium in glycinate form", etc.
```

### **Mejora 3: MeSH Terms para Mejor Precisión**

MeSH (Medical Subject Headings) son términos controlados que mejoran la precisión:

```typescript
async function searchWithMeSH(supplementName: string): Promise<Study[]> {
  // Primero, buscar el término MeSH correcto
  const meshTerm = await findMeSHTerm(supplementName);
  
  if (meshTerm) {
    // Búsqueda con MeSH term (más precisa)
    return await eSearch({
      term: `${meshTerm}[mh] AND (clinical trial[pt] OR randomized controlled trial[pt])`,
      retmax: 100,
    });
  }
  
  // Fallback a búsqueda normal
  return await eSearch({
    term: `${supplementName}[tiab]`,
    retmax: 100,
  });
}

// Ejemplos de MeSH terms:
// "Magnesium" → "Magnesium"[Mesh]
// "Vitamin D" → "Vitamin D"[Mesh]
// "Omega-3" → "Fatty Acids, Omega-3"[Mesh]
```

### **Mejora 4: Filtros por Subset para Systematic Reviews**

PubMed tiene subsets predefinidos:

```typescript
async function findSystematicReviews(supplementName: string): Promise<Study[]> {
  return await eSearch({
    term: `${supplementName}[tiab] AND systematic[sb]`,
    retmax: 50,
    sort: 'pub_date', // Más recientes primero
  });
}

// Otros subsets útiles:
// systematic[sb] - Systematic reviews
// cochrane[sb] - Cochrane reviews
// medline[sb] - MEDLINE indexed
```

### **Mejora 5: Búsqueda por Calidad de Evidencia**

Combinar múltiples indicadores de calidad:

```typescript
async function searchHighQualityEvidence(supplementName: string): Promise<Study[]> {
  const query = `
    ${supplementName}[tiab] AND (
      (randomized controlled trial[pt] AND humans[mh]) OR
      (meta-analysis[pt]) OR
      (systematic review[pt] AND cochrane[sb])
    ) AND (
      english[la]
    ) AND (
      "last 10 years"[pdat]
    )
  `.replace(/\s+/g, ' ').trim();
  
  return await eSearch({
    term: query,
    retmax: 100,
    sort: 'relevance',
  });
}
```

### **Mejora 6: ESummary 2.0 para Metadatos Ricos**

Usar version 2.0 para obtener más información:

```typescript
async function getEnrichedSummaries(pmids: string[]): Promise<EnrichedStudy[]> {
  const summaries = await eSummary({
    db: 'pubmed',
    id: pmids.join(','),
    version: '2.0', // ← Importante!
    retmode: 'json',
  });
  
  // Version 2.0 incluye:
  // - Más detalles de autores
  // - Información de grants/funding
  // - Referencias cruzadas
  // - Estadísticas de uso
  
  return summaries;
}
```

### **Mejora 7: Búsqueda Inteligente de Estudios Negativos**

Estrategia específica para encontrar estudios que muestran NO efectividad:

```typescript
async function searchNegativeStudies(supplementName: string): Promise<Study[]> {
  const negativeTerms = [
    'no effect',
    'not effective',
    'ineffective',
    'no significant difference',
    'no benefit',
    'failed to show',
    'did not improve',
    'placebo',
    'null result',
  ];
  
  // Usar proximity search para cada término negativo
  const queries = negativeTerms.map(term => 
    `${supplementName}[tiab] AND "${term}"[tiab]`
  );
  
  // Combinar con OR
  const combinedQuery = queries.join(' OR ');
  
  return await eSearch({
    term: `(${combinedQuery}) AND (clinical trial[pt] OR randomized controlled trial[pt])`,
    retmax: 50,
    sort: 'relevance',
  });
}
```

### **Mejora 8: Rate Limiting Inteligente con API Key**

Implementar rate limiting correcto:

```typescript
class PubMedClient {
  private apiKey?: string;
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }
  
  private async throttle(): Promise<void> {
    // Con API key: 10 req/seg
    // Sin API key: 3 req/seg
    const minDelay = this.apiKey ? 100 : 334;
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, minDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
  
  async request(url: string): Promise<any> {
    await this.throttle();
    
    // Agregar API key si existe
    const urlWithKey = this.apiKey 
      ? `${url}&api_key=${this.apiKey}`
      : url;
    
    return fetch(urlWithKey);
  }
}
```

## Plan de Implementación Mejorado

### **Fase 1: Búsqueda Avanzada con History Server** (4-5 horas)
- Implementar History Server workflow
- Proximity search para formas químicas
- Búsqueda multi-estrategia optimizada

### **Fase 2: MeSH Terms y Subsets** (3-4 horas)
- Mapeo de suplementos a MeSH terms
- Uso de systematic[sb] para reviews
- Filtros de calidad de evidencia

### **Fase 3: Búsqueda Inteligente de Negativos** (2-3 horas)
- Términos negativos específicos
- Proximity search para contexto
- Deduplicación inteligente

### **Fase 4: ESummary 2.0 y Metadatos** (2-3 horas)
- Migrar a version 2.0
- Extraer metadatos adicionales
- Enriquecer scoring con nueva data

### **Fase 5: Rate Limiting y Optimización** (2 horas)
- Implementar throttling correcto
- Usar API key si disponible
- Batch requests eficientemente

## Beneficios Esperados

1. **Mejor Precisión**: MeSH terms y proximity search
2. **Más Eficiencia**: History Server reduce llamadas API
3. **Mejor Balance**: Búsqueda específica de estudios negativos
4. **Más Metadatos**: ESummary 2.0 proporciona más contexto
5. **Más Rápido**: Rate limiting optimizado con API key

## Próximos Pasos

¿Quieres que implemente estas mejoras? Puedo empezar con:
1. History Server + Proximity Search (lo más impactante)
2. MeSH Terms mapping
3. Búsqueda inteligente de negativos

¿Por cuál prefieres empezar?
