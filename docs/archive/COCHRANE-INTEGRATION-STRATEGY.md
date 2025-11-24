# Estrategia de Integración con Cochrane Reviews

## Descubrimiento Clave

**Cochrane Reviews ya están en PubMed** con identificadores especiales:
- Subset: `cochrane[sb]`
- Publication Type: `systematic review[pt]`
- Journal: "Cochrane Database Syst Rev"

## Ventajas de Cochrane Reviews

1. **Máxima Calidad**: Gold standard de systematic reviews
2. **Metodología Rigurosa**: Protocolo estandarizado
3. **Actualizaciones Regulares**: Reviews se actualizan periódicamente
4. **Sin Conflictos de Interés**: Independiente de industria farmacéutica
5. **GRADE Assessment**: Evaluación de calidad de evidencia

## Estrategia de Búsqueda

### Opción 1: Búsqueda Directa en PubMed (Recomendado)

```typescript
// Buscar Cochrane reviews específicamente
async function searchCochraneReviews(supplementName: string): Promise<Study[]> {
  const query = `${supplementName}[tiab] AND cochrane[sb]`;
  
  return await eSearch({
    term: query,
    retmax: 20,
    sort: 'pub_date', // Más recientes primero
  });
}
```

**Ventajas:**
- Gratis
- Ya implementado en PubMed
- No requiere API adicional
- Rate limiting ya manejado

### Opción 2: Búsqueda por Journal

```typescript
async function searchCochraneByJournal(supplementName: string): Promise<Study[]> {
  const query = `${supplementName}[tiab] AND "Cochrane Database Syst Rev"[ta]`;
  
  return await eSearch({
    term: query,
    retmax: 20,
    sort: 'pub_date',
  });
}
```

### Opción 3: Combinación con Systematic Reviews

```typescript
async function searchHighQualityReviews(supplementName: string): Promise<Study[]> {
  const query = `
    ${supplementName}[tiab] AND (
      cochrane[sb] OR 
      (systematic review[pt] AND high quality)
    )
  `.replace(/\s+/g, ' ').trim();
  
  return await eSearch({
    term: query,
    retmax: 30,
    sort: 'relevance',
  });
}
```

## Scoring Mejorado para Cochrane

Cochrane reviews deben recibir el score más alto:

```typescript
function scoreMethodology(studyType?: string, journal?: string): number {
  // Cochrane review: Máximo score
  if (journal?.toLowerCase().includes('cochrane')) {
    return 50; // Bonus extra
  }
  
  if (studyType?.includes('meta-analysis')) return 40;
  if (studyType?.includes('systematic review')) return 35;
  // ... resto
}
```

## Integración en Multi-Strategy Search

```typescript
async function multiStrategySearchWithCochrane(
  supplementName: string
): Promise<Study[]> {
  const queries = [
    // Strategy 1: Cochrane reviews (highest priority)
    `${supplementName}[tiab] AND cochrane[sb]`,
    
    // Strategy 2: Other systematic reviews
    `${supplementName}[tiab] AND systematic review[pt] NOT cochrane[sb]`,
    
    // Strategy 3: High-quality RCTs
    buildHighQualityQuery(supplementName),
    
    // Strategy 4: Recent studies
    buildRecentQuery(supplementName, 5),
    
    // Strategy 5: Negative results
    buildNegativeQuery(supplementName),
  ];
  
  return await multiSearchWithHistory(queries, {
    retmax: 200,
    sort: 'relevance',
  });
}
```

## Identificación de Cochrane Reviews

Agregar campo al tipo Study:

```typescript
interface Study {
  // ... campos existentes
  isCochraneReview?: boolean;
  qualityRating?: 'cochrane' | 'systematic_review' | 'rct' | 'clinical_trial' | 'other';
}
```

Detectar automáticamente:

```typescript
function identifyCochraneReview(study: Study): boolean {
  const journal = study.journal?.toLowerCase() || '';
  const title = study.title?.toLowerCase() || '';
  
  return (
    journal.includes('cochrane') ||
    title.includes('cochrane review') ||
    study.studyType === 'systematic review' && journal.includes('cochrane')
  );
}
```

## Presentación en UI

Marcar Cochrane reviews con badge especial:

```tsx
{study.isCochraneReview && (
  <Badge variant="gold">
    <Star className="w-3 h-3" />
    Cochrane Review
  </Badge>
)}
```

## Ejemplo de Búsqueda Completa

```typescript
// Buscar "magnesium" con prioridad a Cochrane
const results = await multiStrategySearchWithCochrane('magnesium');

// Resultados esperados:
// 1. Cochrane Review: Magnesium for... (Score: 95)
// 2. Systematic Review: Effects of... (Score: 85)
// 3. RCT: Randomized trial of... (Score: 75)
// ...
```

## Ventajas de Esta Estrategia

1. **Sin Costos Adicionales**: Todo vía PubMed
2. **Máxima Calidad**: Cochrane = gold standard
3. **Fácil Implementación**: Solo ajustar queries
4. **Mejor Scoring**: Prioriza evidencia de mayor calidad
5. **Transparente**: Usuario ve que priorizamos Cochrane

## Implementación Inmediata

Solo necesitamos:
1. Agregar `cochrane[sb]` a las búsquedas
2. Aumentar score para Cochrane reviews
3. Marcar visualmente en UI

**No requiere:**
- API adicional
- Autenticación
- Costos extra
- Cambios arquitectónicos mayores

## Próximos Pasos

1. Agregar búsqueda de Cochrane a `strategies.ts`
2. Actualizar scoring en `scorer.ts`
3. Agregar campo `isCochraneReview` al tipo Study
4. Actualizar UI para mostrar badge especial

¿Implementamos esto ahora?
