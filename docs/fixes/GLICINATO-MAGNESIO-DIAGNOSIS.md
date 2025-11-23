# Diagnóstico: Datos Faltantes en "Glicinato de Magnesio"

## Problema Reportado

El usuario ve una página de resultados para "glicinato de magenesio" (con typo) que está muy incompleta:

### ❌ Datos que FALTAN:
1. **Datos tipo A** - Información más relevante respaldada por estudios de alta calidad
2. **"Para qué sirve"** - Descripción clara del propósito del suplemento (aparece vacía o genérica)
3. **Información general** - Contexto sobre qué es el compuesto
4. **Estudios reales** - La sección dice "Ver Estudios" pero no hay datos
5. **Detalles específicos** - Números, porcentajes, tamaños de efecto

### ✅ Lo que SÍ aparece (pero incompleto):
- Calificación: C (Evidencia Emergente)
- Algunas secciones de "Funciona para" y "No funciona para"
- Estructura básica de la página

## Análisis Técnico

### 1. Flujo de Datos

```
Usuario busca "glicinato de magenesio"
    ↓
/api/portal/quiz (normaliza query)
    ↓
Lambda studies-fetcher (busca en PubMed)
    ↓
Lambda content-enricher (genera contenido con Claude)
    ↓
Frontend transforma EnrichedContent → EvidenceSummaryNew
    ↓
EvidenceAnalysisPanelNew.tsx renderiza
```

### 2. Problemas Identificados

#### A. Typo en el nombre del suplemento
- Usuario busca: "glicinato de **magenesio**" (typo)
- Debería ser: "glicinato de **magnesio**" o "Magnesium Glycinate"

**Impacto**: PubMed no encuentra estudios porque el término está mal escrito.

#### B. Normalización de Query Insuficiente
Archivo: `lib/portal/query-normalization.ts`

El sistema actual normaliza algunos términos comunes, pero NO maneja:
- Typos ortográficos ("magenesio" → "magnesio")
- Variantes en español → inglés para compuestos específicos
- Formas químicas específicas (glicinato, citrato, etc.)

#### C. Prompt de Claude Muy Exigente
Archivo: `backend/lambda/content-enricher/src/prompts.ts`

El prompt pide información ULTRA-DETALLADA:
- Números exactos, porcentajes, tamaños de efecto
- PMIDs específicos
- Metodología de estudios
- Rangos de dosis precisos

**Problema**: Si no hay estudios (por typo o falta de datos), Claude genera:
- Información genérica sin números
- Secciones vacías o con "No especificado"
- Grade C/D por falta de evidencia

#### D. Falta de Fallback Inteligente
Cuando NO hay estudios científicos, el sistema debería:
1. ✅ Detectar el typo y sugerir corrección
2. ❌ Mostrar información básica del compuesto (qué es, para qué sirve)
3. ❌ Explicar claramente por qué no hay datos
4. ❌ Ofrecer alternativas relacionadas

### 3. Estructura de Datos Esperada

#### EnrichedContent (Lambda Output)
```typescript
{
  whatIsIt: string;              // ❌ FALTA: Descripción detallada
  totalStudies: number;          // ❌ FALTA: 0 estudios
  primaryUses: string[];         // ❌ FALTA: Array vacío o genérico
  mechanisms: Mechanism[];       // ❌ FALTA: Sin mecanismos específicos
  worksFor: WorksForItem[];      // ⚠️ INCOMPLETO: Sin datos tipo A
  doesntWorkFor: WorksForItem[]; // ⚠️ INCOMPLETO: Datos limitados
  limitedEvidence: WorksForItem[];
  dosage: Dosage;                // ❌ FALTA: Sin dosis específicas
  safety: Safety;                // ⚠️ INCOMPLETO: Genérico
  keyStudies: KeyStudy[];        // ❌ FALTA: Array vacío
}
```

#### WorksForItem (Datos tipo A esperados)
```typescript
{
  condition: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';  // ❌ FALTA: Grade A
  effectSize: string;                     // ❌ FALTA: "Very Large", "Large", etc.
  magnitude: string;                      // ❌ FALTA: "Aumenta 8-15%"
  studyCount: number;                     // ❌ FALTA: 0
  rctCount: number;                       // ❌ FALTA: 0
  metaAnalysis: boolean;                  // ❌ FALTA: false
  totalParticipants: number;              // ❌ FALTA: 0
  notes: string;                          // ❌ FALTA: Detalles específicos
}
```

## Soluciones Propuestas

### 🔧 Solución 1: Mejorar Normalización de Query (PRIORITARIO)

**Archivo**: `lib/portal/query-normalization.ts`

```typescript
// Agregar corrección de typos comunes
const typoCorrections: Record<string, string> = {
  'magenesio': 'magnesio',
  'glicinato de magenesio': 'magnesium glycinate',
  'citrato de magenesio': 'magnesium citrate',
  // ... más correcciones
};

// Agregar mapeo de formas químicas
const chemicalForms: Record<string, string> = {
  'glicinato de magnesio': 'magnesium glycinate',
  'citrato de magnesio': 'magnesium citrate',
  'óxido de magnesio': 'magnesium oxide',
  // ... más formas
};
```

### 🔧 Solución 2: Fallback con Información Básica

**Archivo**: `backend/lambda/content-enricher/src/prompts.ts`

Modificar el prompt para que cuando NO haya estudios:
1. Genere información básica del compuesto (qué es, origen)
2. Explique claramente la falta de evidencia
3. Sugiera términos relacionados con más evidencia

```typescript
// Agregar al prompt:
`
SI NO HAY ESTUDIOS DISPONIBLES:
1. Proporciona una descripción básica del compuesto (qué es, origen químico)
2. Explica claramente en "whatIsIt" que no hay evidencia científica suficiente
3. En "primaryUses", lista usos TEÓRICOS o tradicionales (marcados como "no verificado")
4. Deja "worksFor" vacío o con grade D
5. En "notes", sugiere términos alternativos con más evidencia
`
```

### 🔧 Solución 3: Sugerencias Inteligentes en Frontend

**Archivo**: `app/portal/results/page.tsx`

Ya existe `suggestSupplementCorrection()`, pero necesita:
1. Base de datos de typos comunes
2. Algoritmo de distancia de Levenshtein para detectar similitudes
3. Mapeo de términos en español → inglés

```typescript
// Mejorar suggestSupplementCorrection
function suggestSupplementCorrection(query: string) {
  // 1. Corregir typos comunes
  const corrected = correctCommonTypos(query);
  
  // 2. Buscar términos similares
  const similar = findSimilarTerms(corrected);
  
  // 3. Traducir español → inglés si es necesario
  const translated = translateToEnglish(corrected);
  
  return {
    suggestion: translated || similar || corrected,
    confidence: calculateConfidence(),
  };
}
```

### 🔧 Solución 4: Enriquecer Prompt con Contexto

**Archivo**: `backend/lambda/content-enricher/src/prompts.ts`

Agregar al prompt información sobre formas químicas comunes:

```typescript
const CHEMICAL_FORMS_CONTEXT = `
FORMAS QUÍMICAS COMUNES DE MINERALES:
- Magnesio: glicinato, citrato, óxido, malato, treonato
- Zinc: picolinato, gluconato, citrato
- Calcio: carbonato, citrato, malato

Si el usuario busca una forma específica (ej: "glicinato de magnesio"):
1. Busca estudios sobre esa forma específica
2. Si no hay, busca estudios sobre el mineral base (magnesio)
3. Menciona en "notes" que la evidencia es del mineral base, no de la forma específica
`;
```

### 🔧 Solución 5: Mejorar Búsqueda en PubMed

**Archivo**: `backend/lambda/studies-fetcher/src/index.ts`

Implementar búsqueda con fallback:

```typescript
async function searchPubMed(query: string) {
  // 1. Buscar término exacto
  let results = await pubmedSearch(query);
  
  // 2. Si no hay resultados, buscar término base
  if (results.length === 0) {
    const baseCompound = extractBaseCompound(query); // "magnesio" de "glicinato de magnesio"
    results = await pubmedSearch(baseCompound);
  }
  
  // 3. Si aún no hay resultados, buscar en inglés
  if (results.length === 0) {
    const englishTerm = translateToEnglish(query);
    results = await pubmedSearch(englishTerm);
  }
  
  return results;
}
```

## Plan de Implementación

### Fase 1: Quick Fixes (1-2 horas)
1. ✅ Agregar corrección de typos comunes en `query-normalization.ts`
2. ✅ Mejorar mensaje de error cuando no hay estudios
3. ✅ Agregar sugerencias inteligentes en frontend

### Fase 2: Mejoras de Búsqueda (2-3 horas)
1. ✅ Implementar búsqueda con fallback en studies-fetcher
2. ✅ Agregar mapeo de formas químicas
3. ✅ Mejorar normalización español → inglés

### Fase 3: Mejoras de Contenido (3-4 horas)
1. ✅ Modificar prompt para generar información básica sin estudios
2. ✅ Agregar contexto de formas químicas al prompt
3. ✅ Implementar fallback con información general

### Fase 4: Testing (1-2 horas)
1. ✅ Probar con "glicinato de magnesio" (correcto)
2. ✅ Probar con "glicinato de magenesio" (typo)
3. ✅ Probar con otros compuestos con formas químicas
4. ✅ Verificar que se muestren todos los datos esperados

## Ejemplo de Resultado Esperado

### Para "Glicinato de Magnesio" (correcto)

```
🟢 Calificación: B (Evidencia Sólida)

¿Para qué sirve?
El glicinato de magnesio es una forma altamente biodisponible de magnesio 
quelado con glicina. Se utiliza principalmente para mejorar la absorción de 
magnesio y reducir efectos gastrointestinales. Estudios muestran que puede 
mejorar la calidad del sueño, reducir la ansiedad y apoyar la función muscular.

✅ Funciona para:
- Mejora de calidad del sueño (Grade A)
  • Efecto: Moderado a Grande
  • Magnitud: Reduce latencia del sueño 15-20%
  • Estudios: 12 RCTs, 850 participantes
  • Dosis: 300-500mg antes de dormir

- Reducción de ansiedad (Grade B)
  • Efecto: Moderado
  • Magnitud: Reduce síntomas 20-25%
  • Estudios: 8 RCTs, 600 participantes
  • Dosis: 200-400mg/día

❌ No funciona para:
- Aumento de masa muscular (Grade D)
  • 5 estudios no mostraron diferencia vs placebo

Dosificación Recomendada:
- Dosis Efectiva: 200-400mg/día de magnesio elemental
- Dosis Común: 300mg/día
- Momento: Noche antes de dormir para mejor absorción
```

## Conclusión

El problema principal es la **combinación de typo + falta de normalización + prompt muy exigente**.

**Solución inmediata**: Implementar Fase 1 (corrección de typos y mejores mensajes de error)

**Solución a largo plazo**: Implementar todas las fases para un sistema robusto que maneje:
- Typos comunes
- Formas químicas específicas
- Falta de evidencia científica
- Sugerencias inteligentes
