# Plan Profesional: Sistema de Ranking Inteligente

## 🎯 Objetivo
Implementar el sistema de ranking inteligente (5 estudios positivos + 5 negativos) de manera robusta, sin efectos cascada, y con arquitectura profesional.

## 📊 Análisis del Estado Actual

### ✅ Lo que funciona
1. **Lambda studies-fetcher**: Devuelve ranking correctamente
   - Endpoint: `https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search`
   - Response: `data.ranked.positive` (5 estudios) + `data.ranked.negative` (5 estudios)
   - Metadata: `consensus`, `confidenceScore`

2. **Lambda content-enricher**: Genera contenido basado en estudios
   - Endpoint: `https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/`
   - Usa estudios reales para análisis

3. **Normalización de queries**: Funciona correctamente
   - "l-carnitina" → "l-carnitine"
   - Spanish → English translation

4. **Sistema async**: Implementado y funcional
   - Evita timeouts de Vercel
   - Frontend hace polling

### ❌ El Problema Raíz
**El ranking se pierde en el flujo de datos entre lambdas y frontend**

```
studies-fetcher (✅ tiene ranking)
    ↓
/api/portal/enrich (❌ no preserva ranking)
    ↓
content-enricher (❌ no recibe ranking)
    ↓
Frontend (❌ no muestra ranking)
```

## 🏗️ Arquitectura Propuesta (Sin Efectos Cascada)

### Opción 1: Dual Response Pattern (RECOMENDADA)
**Separar datos de estudios y contenido enriquecido**

```typescript
// Response structure
{
  success: true,
  data: {
    // Contenido enriquecido (de content-enricher)
    description: "...",
    mechanisms: [...],
    worksFor: [...],
    
    // Estudios rankeados (de studies-fetcher) - NUEVO
    studies: {
      ranked: {
        positive: [...],  // 5 estudios
        negative: [...],  // 5 estudios
        metadata: {
          consensus: "strong_positive",
          confidenceScore: 85
        }
      },
      all: [...]  // Todos los estudios
    }
  }
}
```

**Ventajas:**
- ✅ No modifica content-enricher (sin efectos cascada)
- ✅ Datos de ranking siempre disponibles
- ✅ Frontend puede mostrar ambos independientemente
- ✅ Fácil de implementar y testear

**Implementación:**
1. `/api/portal/enrich` guarda `studiesData` completo
2. Pasa solo `studies` array a content-enricher (como ahora)
3. En la respuesta final, agrega `studies.ranked` del `studiesData` original
4. Frontend recibe todo en una sola respuesta

### Opción 2: Metadata Enrichment (Alternativa)
**Agregar ranking a metadata del content-enricher**

```typescript
// Modificar content-enricher para aceptar y preservar ranking
{
  supplementId: "l-carnitine",
  studies: [...],
  ranking: {  // NUEVO parámetro
    positive: [...],
    negative: [...],
    metadata: {...}
  }
}
```

**Desventajas:**
- ❌ Requiere modificar content-enricher Lambda
- ❌ Requiere re-deploy de Lambda
- ❌ Posibles efectos cascada en cache

## 📋 Plan de Implementación (Opción 1)

### Fase 1: Preservar Ranking en /api/portal/enrich ✅
**Archivo:** `app/api/portal/enrich/route.ts`

```typescript
// Después de obtener studiesData
const studiesData = result.data;
const studies = studiesData.success ? studiesData.data?.studies || [] : [];
const rankedData = studiesData?.data?.ranked || null; // ✅ Ya implementado

// Al construir respuesta final
return NextResponse.json({
  ...enrichData,
  data: {
    ...enrichData.data,
    // AGREGAR: Estudios rankeados
    studies: {
      ranked: rankedData,
      all: studies,
      total: studies.length
    }
  },
  metadata: {
    ...enrichData.metadata,
    // Metadata del ranking
    hasRanking: !!rankedData,
    rankingMetadata: rankedData?.metadata || null
  }
});
```

### Fase 2: Actualizar Frontend para Mostrar Ranking
**Archivo:** `components/portal/EvidenceAnalysisPanelNew.tsx`

```typescript
interface EvidenceAnalysisPanelProps {
  evidenceSummary: any;
  supplementName: string;
  studies?: {
    ranked?: {
      positive: Study[];
      negative: Study[];
      metadata: {
        consensus: string;
        confidenceScore: number;
      };
    };
    all: Study[];
  };
}

// Agregar sección de ranking
{studies?.ranked && (
  <div className="mt-8">
    <h3>Análisis de Evidencia</h3>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4>✅ Evidencia Positiva ({studies.ranked.positive.length})</h4>
        {studies.ranked.positive.map(study => (
          <StudyCard key={study.pmid} study={study} sentiment="positive" />
        ))}
      </div>
      <div>
        <h4>❌ Evidencia Negativa ({studies.ranked.negative.length})</h4>
        {studies.ranked.negative.map(study => (
          <StudyCard key={study.pmid} study={study} sentiment="negative" />
        ))}
      </div>
    </div>
    <div className="mt-4">
      <Badge>
        Consenso: {studies.ranked.metadata.consensus}
        ({studies.ranked.metadata.confidenceScore}% confianza)
      </Badge>
    </div>
  </div>
)}
```

### Fase 3: Actualizar Transformador de Datos
**Archivo:** `app/portal/results/page.tsx`

```typescript
const transformedEvidence = {
  ...recommendation,
  studies: recommendation._enrichment_metadata?.studies || null
};
```

### Fase 4: Testing Completo

```bash
# 1. Test Lambda directa
curl -X POST https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search \
  -d '{"supplementName":"l-carnitine","maxResults":10}' | jq '.data.ranked'

# 2. Test /api/portal/enrich
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -d '{"supplementName":"l-carnitine","forceRefresh":true}' | jq '.data.studies.ranked'

# 3. Test /api/portal/quiz
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category":"l-carnitina"}' | jq '.recommendation._enrichment_metadata.studies.ranked'

# 4. Test Frontend
# Buscar "l-carnitina" y verificar que se muestren 5+5 estudios
```

## 🔒 Garantías de Solidez

### 1. Sin Efectos Cascada
- ✅ No modifica content-enricher Lambda
- ✅ No modifica estructura de cache existente
- ✅ Backward compatible (si no hay ranking, no rompe)

### 2. Manejo de Errores
```typescript
// Siempre verificar existencia
const rankedData = studiesData?.data?.ranked || null;
const hasRanking = !!rankedData && rankedData.positive?.length > 0;

// Frontend defensivo
{studies?.ranked?.positive?.length > 0 && (
  <RankingSection />
)}
```

### 3. Logging Completo
```typescript
console.log(JSON.stringify({
  event: 'RANKING_PRESERVED',
  hasRanking: !!rankedData,
  positiveCount: rankedData?.positive?.length || 0,
  negativeCount: rankedData?.negative?.length || 0,
  consensus: rankedData?.metadata?.consensus || null
}));
```

### 4. Cache Invalidation Strategy
```typescript
// Script para invalidar cache cuando sea necesario
// scripts/invalidate-cache-with-ranking.ts
```

## 📈 Métricas de Éxito

1. **Backend:**
   - ✅ `studiesData.data.ranked` presente en logs
   - ✅ Response incluye `data.studies.ranked`
   - ✅ Metadata incluye `hasRanking: true`

2. **Frontend:**
   - ✅ Muestra 5 estudios positivos
   - ✅ Muestra 5 estudios negativos
   - ✅ Muestra consenso y confianza
   - ✅ UI responsive y clara

3. **Performance:**
   - ✅ No aumenta tiempo de respuesta
   - ✅ Cache funciona correctamente
   - ✅ Async fallback funciona

## 🚀 Orden de Ejecución

1. **Implementar Fase 1** (Backend - 15 min)
   - Modificar `/api/portal/enrich/route.ts`
   - Agregar `studies` object a response
   - Deploy y test

2. **Implementar Fase 2** (Frontend - 30 min)
   - Crear componente `RankingSection`
   - Actualizar `EvidenceAnalysisPanelNew`
   - Test visual

3. **Implementar Fase 3** (Integración - 10 min)
   - Actualizar transformador
   - Verificar flujo completo

4. **Testing Fase 4** (QA - 15 min)
   - Tests automatizados
   - Test manual en producción
   - Verificar con múltiples suplementos

**Total: ~70 minutos de implementación sólida**

## 🎯 Resultado Final

Usuario busca "l-carnitina":
1. ✅ Normaliza a "l-carnitine"
2. ✅ Obtiene 10 estudios de PubMed
3. ✅ Ranking inteligente: 5 positivos + 5 negativos
4. ✅ Genera contenido enriquecido
5. ✅ Muestra TODO en frontend:
   - Descripción y mecanismos
   - "Funciona para" y "No funciona para"
   - **5 estudios positivos con badges verdes**
   - **5 estudios negativos con badges rojos**
   - **Consenso: "strong_positive" (85% confianza)**

---

## 🔄 Rollback Plan

Si algo falla:
1. Revertir commit de `/api/portal/enrich/route.ts`
2. Frontend sigue funcionando (backward compatible)
3. Sin downtime, sin pérdida de datos

---

**¿Procedemos con la implementación?**
