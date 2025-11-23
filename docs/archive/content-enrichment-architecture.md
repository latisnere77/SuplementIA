# Arquitectura de Enriquecimiento de Contenido (Content Enrichment)

**Inspirado en**: Examine.com
**Objetivo**: Información rica, detallada y basada en evidencia para cada suplemento
**Enfoque**: Modular, sin efecto cascada, aprovechando servicios AWS

---

## 📊 Análisis del Problema Actual

### ❌ Estado Actual (Información Pobre)
```typescript
// Mock data actual - MUY LIMITADO
{
  category: 'Muscle Gain & Exercise',
  evidence_summary: {
    totalStudies: 247,  // Solo números
    totalParticipants: 18450,
    efficacyPercentage: 87,
    researchSpanYears: 15
  },
  // NO HAY:
  // - Descripción de mecanismos de acción
  // - Efectos secundarios
  // - Contraindicaciones
  // - Timing óptimo
  // - Interacciones
  // - Estudios específicos citados
}
```

### ✅ Estado Deseado (Inspirado en Examine.com)
```typescript
{
  // 1. DESCRIPCIÓN RICA
  whatIsIt: "Ashwagandha es un adaptógeno ayurvédico...",
  primaryUses: ["Reducción de estrés", "Mejora de sueño", "Aumento de testosterona"],

  // 2. MECANISMOS DE ACCIÓN
  mechanisms: [
    {
      name: "Modulación del eje HPA",
      description: "Reduce cortisol al modular el eje hipotálamo-pituitaria-adrenal",
      evidenceLevel: "strong",
      studyCount: 12
    }
  ],

  // 3. FUNCIONA PARA / NO FUNCIONA PARA (Detallado)
  worksFor: [
    {
      condition: "Reducción de estrés y ansiedad",
      evidenceGrade: "A",
      effectSize: "Moderado a fuerte",
      studyCount: 12,
      metaAnalysis: true,
      notes: "Efectivo en dosis de 300-600mg/día durante 8+ semanas"
    }
  ],

  // 4. DOSIFICACIÓN
  dosage: {
    standard: "300-600mg/día",
    timing: "Mañana o noche con comida",
    duration: "Mínimo 8 semanas para efectos completos",
    forms: ["Extracto KSM-66", "Extracto Sensoril"]
  },

  // 5. SEGURIDAD
  safety: {
    sideEffects: ["Malestar estomacal leve (raro)", "Somnolencia (dosis altas)"],
    contraindications: ["Embarazo", "Lactancia", "Hipertiroidismo"],
    interactions: ["Sedantes", "Medicamentos para tiroides"],
    safetyRating: "Generally Safe (GRAS)"
  },

  // 6. ESTUDIOS CLAVE
  keyStudies: [
    {
      title: "A prospective, randomized double-blind...",
      year: 2019,
      participants: 60,
      findings: "Reducción de 27.9% en cortisol sérico",
      pubmedId: "31517876"
    }
  ]
}
```

---

## 🏗️ Arquitectura Modular (Sin Efecto Cascada)

### Principios de Diseño

1. **Modularidad**: Cada servicio es independiente
2. **Separation of Concerns**: Cada módulo tiene UNA responsabilidad
3. **Event-Driven**: Comunicación asíncrona vía EventBridge
4. **Caching Agresivo**: DynamoDB + CloudFront para evitar recomputación
5. **Graceful Degradation**: Si un módulo falla, el resto funciona

### Módulos Independientes

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Results Page    │  │ Evidence Panel   │                  │
│  │ (Mejorado)      │  │ (Enriquecido)    │                  │
│  └────────┬────────┘  └────────┬─────────┘                  │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            │ GET /api/portal/recommendation/:id
            ▼
┌─────────────────────────────────────────────────────────────┐
│           API ROUTE (Next.js API)                            │
│  - Orquesta llamadas a múltiples fuentes                     │
│  - Combina datos de múltiples módulos                        │
│  - Maneja fallbacks                                          │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─────────────────┬──────────────────┬────────────────┐
         │                 │                  │                │
         ▼                 ▼                  ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   MÓDULO 1   │  │   MÓDULO 2   │  │   MÓDULO 3   │  │   MÓDULO 4   │
│   Cache      │  │   Content    │  │  Evidence    │  │  Studies     │
│   Service    │  │  Enrichment  │  │  Analyzer    │  │  Fetcher     │
│              │  │              │  │              │  │              │
│ DynamoDB     │  │ Lambda +     │  │ Comprehend   │  │ PubMed API   │
│              │  │ Bedrock      │  │ Medical      │  │ + Lambda     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
         │                 │                  │                │
         └─────────────────┴──────────────────┴────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   EventBridge        │
                         │   (Async Updates)    │
                         └──────────────────────┘
```

---

## 📦 Módulos Detallados

### MÓDULO 1: Cache Service (Independiente)
**Responsabilidad**: Cache de contenido enriquecido

```
Lambda: suplementia-cache-service
Tabla DynamoDB: suplementia-enriched-content

Schema:
{
  PK: "SUPPLEMENT#ashwagandha",
  SK: "ENRICHED_CONTENT#v1",
  data: { ... },  // Contenido enriquecido completo
  ttl: 2592000,   // 30 días
  lastUpdated: "2024-11-19T..."
}

API:
- GET /cache/:supplementId
- PUT /cache/:supplementId
- DELETE /cache/:supplementId (invalidation)
```

**✅ Sin dependencias externas** - Solo lee/escribe DynamoDB

---

### MÓDULO 2: Content Enrichment Service (Usa Bedrock)
**Responsabilidad**: Generar contenido rico usando Claude

```
Lambda: suplementia-content-enricher
Servicio AWS: Bedrock (Claude Sonnet)

Input:
{
  supplementName: "ashwagandha",
  category: "stress-management"
}

Prompt Engineering:
"Actúa como experto en suplementos nutricionales.
Para el suplemento {supplementName}:

1. ¿Qué es? (2-3 oraciones)
2. Mecanismos de acción principales (3-5)
3. Para qué funciona (con nivel de evidencia A/B/C)
4. Para qué NO funciona
5. Dosificación estándar
6. Efectos secundarios
7. Contraindicaciones
8. Interacciones

Responde en JSON estructurado."

Output:
{
  whatIsIt: "...",
  mechanisms: [...],
  worksFor: [...],
  doesntWorkFor: [...],
  dosage: {...},
  safety: {...}
}
```

**Dependencias**:
- ✅ Bedrock (AWS Service - ya implementado)
- ❌ NO depende de otros módulos

---

### MÓDULO 3: Evidence Analyzer (Comprehend Medical)
**Responsabilidad**: Analizar textos de estudios y extraer entidades médicas

```
Lambda: suplementia-evidence-analyzer
Servicio AWS: Comprehend Medical

Input:
{
  studyAbstract: "This randomized controlled trial...",
  supplementName: "ashwagandha"
}

Procesamiento:
1. DetectEntitiesV2() - Extraer entidades médicas
2. InferICD10CM() - Clasificar condiciones
3. DetectPHI() - Detectar información sensible

Output:
{
  conditions: ["Anxiety", "Stress", "Sleep disorder"],
  medications: ["Ashwagandha"],
  dosage: "300mg twice daily",
  duration: "8 weeks",
  outcomes: ["Reduced cortisol", "Improved sleep quality"]
}
```

**Dependencias**:
- ✅ Comprehend Medical (AWS Service)
- ❌ NO depende de otros módulos

---

### MÓDULO 4: Studies Fetcher (PubMed Integration)
**Responsabilidad**: Buscar y obtener estudios de PubMed

```
Lambda: suplementia-studies-fetcher
API Externa: PubMed E-utilities

Input:
{
  supplementName: "ashwagandha",
  maxResults: 10,
  filters: {
    studyType: "randomized controlled trial",
    dateRange: "2015-2024"
  }
}

Procesamiento:
1. ESearch: Buscar en PubMed
2. EFetch: Obtener abstracts
3. Parse XML
4. Clasificar por relevancia

Output:
{
  studies: [
    {
      pmid: "31517876",
      title: "...",
      abstract: "...",
      year: 2019,
      authors: ["..."],
      journal: "...",
      studyType: "RCT"
    }
  ]
}
```

**Dependencias**:
- ✅ PubMed API (Externa, gratuita)
- ❌ NO depende de otros módulos

---

## 🔄 Flujo de Orquestación (API Route)

```typescript
// app/api/portal/recommendation-enriched/[id]/route.ts

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // 1. CACHE FIRST (MÓDULO 1)
    const cached = await fetchFromCache(id);
    if (cached && !isCacheStale(cached)) {
      return NextResponse.json({
        success: true,
        data: cached,
        source: 'cache'
      });
    }

    // 2. PARALLEL FETCH (Módulos 2, 3, 4 en paralelo - SIN DEPENDENCIAS)
    const [
      contentData,
      evidenceData,
      studiesData
    ] = await Promise.allSettled([
      fetchContentEnrichment(id),  // MÓDULO 2
      fetchEvidenceAnalysis(id),   // MÓDULO 3
      fetchStudies(id)             // MÓDULO 4
    ]);

    // 3. COMBINAR DATOS (Graceful degradation)
    const enrichedData = {
      ...extractValue(contentData, {}),
      ...extractValue(evidenceData, {}),
      studies: extractValue(studiesData, [])
    };

    // 4. GUARDAR EN CACHE (MÓDULO 1)
    await saveToCache(id, enrichedData);

    // 5. TRIGGER ASYNC UPDATE (EventBridge)
    await triggerAsyncUpdate(id);  // Mejora incremental en background

    return NextResponse.json({
      success: true,
      data: enrichedData,
      source: 'computed'
    });

  } catch (error) {
    // FALLBACK: Retornar datos básicos si todo falla
    return NextResponse.json({
      success: true,
      data: await getBasicRecommendation(id),
      source: 'fallback'
    });
  }
}

// Helper: Graceful degradation
function extractValue<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
  return result.status === 'fulfilled' ? result.value : defaultValue;
}
```

---

## 🚫 Prevención de Efecto Cascada

### ✅ Estrategias Implementadas

1. **Promise.allSettled()** - NO Promise.all()
   - Si un módulo falla, los otros continúan
   - Nunca lanzamos error general

2. **Módulos Independientes**
   - Cada Lambda puede deployarse independientemente
   - No hay imports entre módulos
   - Comunicación solo vía API/EventBridge

3. **Circuit Breaker Pattern**
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        return fallback;  // Retornar fallback sin llamar
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();

      if (this.failures >= 5) {
        this.state = 'OPEN';
      }

      return fallback;
    }
  }
}
```

4. **Timeouts Configurables**
```typescript
const TIMEOUTS = {
  cache: 500,           // 500ms
  contentEnrichment: 5000,  // 5s
  evidenceAnalysis: 3000,   // 3s
  studies: 4000         // 4s
};
```

5. **Graceful Degradation Levels**
```typescript
// Nivel 1: Todo funcionando
{ content: FULL, evidence: FULL, studies: FULL }

// Nivel 2: Cache + Content (sin evidence/studies)
{ content: FULL, evidence: BASIC, studies: [] }

// Nivel 3: Solo Cache
{ content: CACHED, evidence: CACHED, studies: [] }

// Nivel 4: Fallback básico
{ content: MINIMAL, evidence: null, studies: [] }
```

---

## 📊 Mapeo con X-Ray

### Instrumentación

```typescript
// Lambda: Content Enrichment
import AWSXRay from 'aws-xray-sdk-core';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

export const handler = async (event, context) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('content-enrichment');

  try {
    subsegment.addAnnotation('supplementId', event.supplementId);
    subsegment.addMetadata('input', event);

    // Procesamiento...
    const result = await enrichContent(event);

    subsegment.addMetadata('output', result);
    subsegment.close();

    return result;
  } catch (error) {
    subsegment.addError(error);
    subsegment.close();
    throw error;
  }
};
```

### Queries de X-Ray

```sql
-- Identificar módulos lentos
SELECT service.name, AVG(duration) as avg_duration
FROM traces
WHERE annotation.supplementId = "ashwagandha"
GROUP BY service.name
ORDER BY avg_duration DESC

-- Detectar errores en módulos específicos
SELECT service.name, COUNT(*) as error_count
FROM traces
WHERE fault = true OR error = true
GROUP BY service.name
```

---

## 🎯 Plan de Implementación (Fases)

### FASE 1: Infraestructura Base (1 semana)
- [ ] Crear DynamoDB table: `suplementia-enriched-content`
- [ ] Implementar Lambda: `suplementia-cache-service`
- [ ] Configurar X-Ray en todos los módulos
- [ ] Setup EventBridge

**Validación**: Cache funciona, X-Ray muestra trazas

---

### FASE 2: Content Enrichment (1 semana)
- [ ] Implementar Lambda: `suplementia-content-enricher`
- [ ] Crear prompts optimizados para Bedrock
- [ ] Testing con 5 suplementos top
- [ ] Integrar con Cache Service

**Validación**: Contenido enriquecido generado y cacheado

---

### FASE 3: Evidence Analyzer (1 semana)
- [ ] Implementar Lambda: `suplementia-evidence-analyzer`
- [ ] Integrar Comprehend Medical
- [ ] Testing con abstracts reales
- [ ] Parallel execution con FASE 2

**Validación**: Entidades médicas extraídas correctamente

---

### FASE 4: Studies Fetcher (1 semana)
- [ ] Implementar Lambda: `suplementia-studies-fetcher`
- [ ] Integrar PubMed E-utilities
- [ ] Caching de estudios en DynamoDB separado
- [ ] Rate limiting para PubMed

**Validación**: Estudios obtenidos y parseados

---

### FASE 5: Frontend Mejorado (1 semana)
- [ ] Rediseñar `EvidenceAnalysisPanelNew.tsx`
- [ ] Agregar secciones:
  - Mecanismos de acción
  - Dosificación detallada
  - Efectos secundarios
  - Interacciones
  - Estudios clave
- [ ] Mejorar `PersonalizationExplanation.tsx`
- [ ] A/B testing

**Validación**: UI muestra contenido enriquecido

---

### FASE 6: Optimización & Monitoreo (Continuo)
- [ ] CloudWatch Dashboards
- [ ] Alarmas para cada módulo
- [ ] Auto-scaling de Lambdas
- [ ] Cost optimization

---

## 📈 Métricas de Éxito

### Performance
- ⏱️ **P95 Response Time** < 3s (con cache)
- ⏱️ **P95 Response Time** < 10s (sin cache)
- 📊 **Cache Hit Rate** > 80%
- 🚀 **Module Availability** > 99%

### Calidad
- ✅ **Content Completeness** > 95% (todos los campos populated)
- 📚 **Studies Count** > 5 per supplement
- 🎯 **Evidence Accuracy** (manual review) > 90%

### UX
- 👍 **User Satisfaction** (survey) > 4.5/5
- 📖 **Time on Results Page** aumenta 50%+
- 🔄 **Return Rate** aumenta 30%+

---

## 🔧 Debugging Sistemático

### Checklist de Debugging

1. **Check X-Ray Trace**
   - ¿Qué módulo falló?
   - ¿Cuál fue el error exacto?
   - ¿Hubo timeout?

2. **Check CloudWatch Logs**
   ```bash
   aws logs tail /aws/lambda/suplementia-content-enricher --follow
   ```

3. **Check DynamoDB**
   - ¿El cache está actualizado?
   - ¿Hay datos corruptos?

4. **Test Módulo Aislado**
   ```bash
   aws lambda invoke \
     --function-name suplementia-content-enricher \
     --payload '{"supplementId": "ashwagandha"}' \
     response.json
   ```

5. **Circuit Breaker Status**
   - ¿Algún módulo está en OPEN state?
   - ¿Necesitamos resetear?

---

## 🎨 Ejemplo de Contenido Enriquecido Final

```typescript
// GET /api/portal/recommendation-enriched/ashwagandha
{
  "success": true,
  "data": {
    // SECCIÓN 1: QUÉ ES
    "whatIsIt": "Ashwagandha (Withania somnifera) es un adaptógeno ayurvédico tradicional utilizado durante más de 3000 años. Conocida como 'ginseng indio', ayuda al cuerpo a manejar el estrés físico y mental.",

    "primaryUses": [
      "Reducción de estrés y ansiedad",
      "Mejora de calidad de sueño",
      "Aumento de testosterona en hombres",
      "Mejora de rendimiento físico"
    ],

    // SECCIÓN 2: MECANISMOS
    "mechanisms": [
      {
        "name": "Modulación del eje HPA",
        "description": "Reduce los niveles de cortisol al modular el eje hipotálamo-pituitaria-adrenal",
        "evidenceLevel": "strong",
        "studyCount": 12
      },
      {
        "name": "Aumento de GABA",
        "description": "Incrementa la actividad GABAérgica, promoviendo relajación",
        "evidenceLevel": "moderate",
        "studyCount": 5
      }
    ],

    // SECCIÓN 3: FUNCIONA PARA
    "worksFor": [
      {
        "condition": "Reducción de estrés y ansiedad",
        "evidenceGrade": "A",
        "effectSize": "Moderado a fuerte",
        "studyCount": 12,
        "metaAnalysis": true,
        "notes": "Reducción promedio de 27.9% en cortisol sérico. Efectivo en dosis de 300-600mg/día durante 8+ semanas.",
        "keyStudy": {
          "pmid": "31517876",
          "year": 2019,
          "finding": "Reducción significativa de estrés percibido (p<0.001)"
        }
      },
      {
        "condition": "Mejora de sueño",
        "evidenceGrade": "B",
        "effectSize": "Moderado",
        "studyCount": 7,
        "notes": "Mejora en calidad de sueño, especialmente en personas con insomnio leve a moderado."
      }
    ],

    // SECCIÓN 4: NO FUNCIONA PARA
    "doesntWorkFor": [
      {
        "condition": "Pérdida de peso directa",
        "evidenceGrade": "D",
        "notes": "No hay evidencia de efectos directos en pérdida de peso. Puede ayudar indirectamente al reducir cortisol."
      }
    ],

    // SECCIÓN 5: DOSIFICACIÓN
    "dosage": {
      "standard": "300-600mg/día",
      "timing": "Mañana o noche, preferiblemente con comida",
      "duration": "Mínimo 8 semanas para efectos completos",
      "forms": [
        {
          "form": "KSM-66",
          "description": "Extracto estandarizado al 5% de withanólidos",
          "recommended": true
        },
        {
          "form": "Sensoril",
          "description": "Extracto estandarizado al 10% de withanólidos",
          "recommended": true
        }
      ],
      "stacksWith": ["Rhodiola", "L-Theanine", "Magnesium"]
    },

    // SECCIÓN 6: SEGURIDAD
    "safety": {
      "overallRating": "Generally Safe (GRAS)",
      "sideEffects": [
        {
          "effect": "Malestar estomacal leve",
          "frequency": "Raro (<5%)",
          "severity": "Leve"
        },
        {
          "effect": "Somnolencia",
          "frequency": "Ocasional (5-10%)",
          "severity": "Leve",
          "notes": "Principalmente con dosis >600mg/día"
        }
      ],
      "contraindications": [
        "Embarazo y lactancia (falta evidencia de seguridad)",
        "Hipertiroidismo (puede aumentar hormonas tiroideas)",
        "Trastornos autoinmunes (puede estimular sistema inmune)"
      ],
      "interactions": [
        {
          "medication": "Sedantes (benzodiacepinas, barbitúricos)",
          "severity": "Moderada",
          "description": "Puede potenciar efectos sedantes"
        },
        {
          "medication": "Medicamentos para tiroides",
          "severity": "Moderada",
          "description": "Puede alterar niveles de hormonas tiroideas"
        }
      ]
    },

    // SECCIÓN 7: ESTUDIOS CLAVE
    "keyStudies": [
      {
        "pmid": "31517876",
        "title": "A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root...",
        "authors": ["Salve J", "Pate S"],
        "year": 2019,
        "journal": "J Evid Based Complementary Altern Med",
        "studyType": "RCT",
        "participants": 60,
        "duration": "60 days",
        "findings": [
          "Reducción de 27.9% en cortisol sérico (p<0.001)",
          "Mejora significativa en escalas de estrés y ansiedad",
          "Bien tolerado sin efectos adversos graves"
        ]
      }
    ],

    // SECCIÓN 8: PERSONALIZACIÓN (Mejorada)
    "personalizationFactors": {
      "altitude": {
        "value": 2250,
        "adjustment": "Dosis aumentada 10% debido a mayor estrés oxidativo en altitud",
        "reason": "La altitud de CDMX (2250m) incrementa cortisol basal"
      },
      "age": {
        "value": 35,
        "adjustment": "Dosis estándar apropiada",
        "reason": "Edad óptima para beneficios adaptogénicos"
      },
      "timing": {
        "recommendation": "Noche",
        "reason": "Basado en perfil de estrés y objetivo de mejora de sueño"
      }
    }
  },
  "source": "cache",
  "timestamp": "2024-11-19T17:45:00Z"
}
```

---

## ✅ Checklist de Implementación

### Pre-Implementación
- [ ] Revisar arquitectura con equipo
- [ ] Aprobar presupuesto AWS (Bedrock + Comprehend Medical)
- [ ] Configurar entornos (dev, staging, prod)
- [ ] Setup X-Ray en todas las regiones

### Por Módulo
- [ ] Escribir tests unitarios
- [ ] Implementar Lambda
- [ ] Configurar IAM roles
- [ ] Deploy a staging
- [ ] Testing de integración
- [ ] Deploy a producción
- [ ] Monitoreo 24h post-deploy

### Post-Implementación
- [ ] Documentar APIs
- [ ] Crear runbooks de debugging
- [ ] Training de equipo
- [ ] A/B testing con usuarios

---

**Última actualización**: 2024-11-19
**Versión**: 1.0.0
**Status**: 🟡 En Diseño
