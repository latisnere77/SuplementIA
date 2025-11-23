# Plan de Implementación: Formato Examine-Style

## 🎯 Objetivo
Agregar un modo de generación de contenido estilo Examine.com que produzca:
- Datos cuantitativos precisos (ej: "reduce 2-4 mmHg")
- Clasificación de magnitud (Small/Moderate/Large effect)
- Evidencia clara (X estudios, Y participantes)
- Transparencia total (muestra "No effect" cuando aplica)

## 📋 Arquitectura Actual

### Backend
1. **studies-fetcher Lambda**: Ya obtiene estudios reales de PubMed ✅
2. **content-enricher Lambda**: Usa Claude para generar contenido
3. **studySummarizer.ts**: Resume estudios antes de enviar a Claude

### Frontend
1. **EvidenceAnalysisPanelNew.tsx**: Muestra el contenido enriquecido
2. **StreamingResults.tsx**: Maneja SSE para progreso en tiempo real

### Flujo Actual
```
Portal → /api/portal/enrich → studies-fetcher → content-enricher → Claude → Frontend
```

## 🔧 Cambios Necesarios

### 1. Backend: Nuevo Modo de Generación

#### A. Agregar tipo de contenido en `content-enricher`

**Archivo**: `backend/lambda/content-enricher/src/index.ts`

```typescript
interface EnrichRequest {
  supplementId: string;
  category: string;
  studies: Study[];
  jobId?: string;
  // NUEVO: Tipo de contenido
  contentType?: 'standard' | 'examine-style';
}
```

#### B. Crear nuevo prompt para Examine-style

**Archivo**: `backend/lambda/content-enricher/src/prompts/examine-style-prompt.ts`

```typescript
export function buildExamineStylePrompt(supplementName: string, studies: StudySummary[]): string {
  return `You are a medical research analyst creating an evidence-based supplement guide in the style of Examine.com.

CRITICAL REQUIREMENTS:
1. Extract QUANTITATIVE data from studies (exact numbers, percentages, ranges)
2. Classify effect magnitude: "Small", "Moderate", "Large", or "No effect"
3. Always cite evidence: "X studies, Y participants"
4. Be TRANSPARENT: Show "No effect" when data doesn't support claims
5. Provide context: "Greater effect in diabetics" when applicable

SUPPLEMENT: ${supplementName}

STUDIES ANALYZED:
${studies.map((s, i) => `Study ${i + 1} (PMID: ${s.pmid}, ${s.year}): ${s.summary}`).join('\n\n')}

Generate a structured analysis with:

1. OVERVIEW
   - What it is (1-2 sentences)
   - Primary biological functions
   - Dietary sources

2. BENEFITS BY CONDITION
   For each condition studied, provide:
   {
     "condition": "Type 2 Diabetes",
     "effect": "Moderate",  // Small | Moderate | Large | No effect
     "quantitativeData": "Reduces fasting glucose by 15-20 mg/dL",
     "evidence": "5 studies, 342 participants",
     "context": "Greater effect in magnesium-deficient individuals",
     "studyTypes": ["RCT", "Meta-analysis"]
   }

3. DOSAGE
   {
     "effectiveDose": "200-400 mg/day",
     "commonDose": "300 mg/day",
     "timing": "With meals to reduce GI upset",
     "forms": ["Magnesium citrate", "Magnesium glycinate"],
     "notes": "Oxide form has lower bioavailability"
   }

4. SAFETY
   {
     "sideEffects": {
       "common": ["Diarrhea (12% at 1000mg)", "Nausea (5%)"],
       "rare": ["Hypermagnesemia in kidney disease"],
       "severity": "Generally mild"
     },
     "interactions": {
       "medications": [
         {
           "medication": "Bisphosphonates",
           "severity": "Moderate",
           "description": "Take 2 hours before or 4-6 hours after"
         }
       ]
     },
     "contraindications": ["Severe kidney disease", "Heart block"]
   }

5. MECHANISMS
   [
     {
       "name": "Insulin sensitivity",
       "description": "Acts as cofactor for insulin receptor tyrosine kinase",
       "evidenceLevel": "strong"  // strong | moderate | weak
     }
   ]

RESPOND IN JSON FORMAT ONLY. Be precise with numbers. Show "No effect" when appropriate.`;
}
```

#### C. Modificar content-enricher para soportar ambos modos

**Archivo**: `backend/lambda/content-enricher/src/index.ts`

```typescript
// Importar nuevo prompt
import { buildExamineStylePrompt } from './prompts/examine-style-prompt';
import { buildStandardPrompt } from './prompts/standard-prompt'; // Mover prompt actual aquí

// En el handler
const contentType = event.contentType || 'standard';

let prompt: string;
if (contentType === 'examine-style') {
  prompt = buildExamineStylePrompt(supplementId, summaries);
} else {
  prompt = buildStandardPrompt(supplementId, summaries);
}

// Resto del código igual...
```

### 2. Frontend: Nuevo Componente para Examine-Style

#### A. Crear componente especializado

**Archivo**: `components/portal/ExamineStylePanel.tsx`

```typescript
interface ExamineStyleData {
  overview: {
    whatIsIt: string;
    functions: string[];
    sources: string[];
  };
  benefitsByCondition: Array<{
    condition: string;
    effect: 'Small' | 'Moderate' | 'Large' | 'No effect';
    quantitativeData: string;
    evidence: string;
    context?: string;
    studyTypes: string[];
  }>;
  dosage: {
    effectiveDose: string;
    commonDose: string;
    timing: string;
    forms: string[];
    notes?: string;
  };
  safety: {
    sideEffects: {
      common: string[];
      rare: string[];
      severity: string;
    };
    interactions: {
      medications: Array<{
        medication: string;
        severity: 'Mild' | 'Moderate' | 'Severe';
        description: string;
      }>;
    };
    contraindications: string[];
  };
  mechanisms: Array<{
    name: string;
    description: string;
    evidenceLevel: 'strong' | 'moderate' | 'weak';
  }>;
}

export function ExamineStylePanel({ data }: { data: ExamineStyleData }) {
  // Renderizar con el formato Examine
}
```

#### B. Agregar selector de modo en Portal

**Archivo**: `app/portal/page.tsx`

```typescript
const [contentMode, setContentMode] = useState<'standard' | 'examine'>('standard');

// En el fetch
const response = await fetch('/api/portal/enrich', {
  method: 'POST',
  body: JSON.stringify({
    supplementName,
    contentType: contentMode === 'examine' ? 'examine-style' : 'standard'
  })
});
```

### 3. API Route: Pasar parámetro de tipo

**Archivo**: `app/api/portal/enrich/route.ts`

```typescript
export interface EnrichRequest {
  supplementName: string;
  category?: string;
  forceRefresh?: boolean;
  jobId?: string;
  maxStudies?: number;
  rctOnly?: boolean;
  yearFrom?: number;
  yearTo?: number;
  // NUEVO
  contentType?: 'standard' | 'examine-style';
}

// En el fetch a enricher
const enrichResponse = await fetch(ENRICHER_API_URL, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({
    supplementId: supplementName,
    category: category || 'general',
    forceRefresh: forceRefresh || false,
    studies,
    jobId,
    contentType: body.contentType || 'standard', // NUEVO
  }),
});
```

## 📊 Estructura de Datos Examine-Style

### Ejemplo de Output Esperado

```json
{
  "overview": {
    "whatIsIt": "Essential mineral, cofactor for 300+ enzymes",
    "functions": ["Energy production", "Nerve function", "Blood pressure regulation"],
    "sources": ["Dark leafy greens", "Nuts", "Whole grains"]
  },
  "benefitsByCondition": [
    {
      "condition": "Type 2 Diabetes",
      "effect": "Moderate",
      "quantitativeData": "Reduces fasting glucose by 15-20 mg/dL",
      "evidence": "5 studies, 342 participants",
      "context": "Greater effect in magnesium-deficient individuals",
      "studyTypes": ["RCT", "Meta-analysis"]
    },
    {
      "condition": "Blood Pressure",
      "effect": "Small",
      "quantitativeData": "Reduces systolic BP by 2-4 mmHg, diastolic by 2 mmHg",
      "evidence": "12 studies, 1,847 participants",
      "context": "Greater effect in hypertensive individuals (6-8 mmHg systolic)",
      "studyTypes": ["RCT", "Meta-analysis"]
    },
    {
      "condition": "Migraine Frequency",
      "effect": "Small",
      "quantitativeData": "Reduces frequency by 1-2 episodes per month",
      "evidence": "4 studies, 258 participants",
      "studyTypes": ["RCT"]
    },
    {
      "condition": "Weight Loss",
      "effect": "No effect",
      "quantitativeData": "No significant change in body weight",
      "evidence": "3 studies, 142 participants",
      "studyTypes": ["RCT"]
    }
  ],
  "dosage": {
    "effectiveDose": "200-400 mg/day",
    "commonDose": "300 mg/day",
    "timing": "With meals to reduce GI upset",
    "forms": ["Magnesium citrate (high bioavailability)", "Magnesium glycinate (well-tolerated)"],
    "notes": "Oxide form has lower bioavailability (~4%)"
  },
  "safety": {
    "sideEffects": {
      "common": ["Diarrhea (12% at 1000mg dose)", "Nausea (5%)", "Abdominal cramping"],
      "rare": ["Hypermagnesemia (in kidney disease)"],
      "severity": "Generally mild"
    },
    "interactions": {
      "medications": [
        {
          "medication": "Bisphosphonates",
          "severity": "Moderate",
          "description": "Take magnesium 2 hours before or 4-6 hours after bisphosphonates"
        },
        {
          "medication": "Antibiotics (quinolones, tetracyclines)",
          "severity": "Moderate",
          "description": "Magnesium can reduce antibiotic absorption"
        }
      ]
    },
    "contraindications": [
      "Severe kidney disease (risk of hypermagnesemia)",
      "Heart block",
      "Myasthenia gravis"
    ]
  },
  "mechanisms": [
    {
      "name": "Insulin Sensitivity",
      "description": "Acts as cofactor for insulin receptor tyrosine kinase, improving glucose uptake",
      "evidenceLevel": "strong"
    },
    {
      "name": "Vasodilation",
      "description": "Blocks calcium channels in vascular smooth muscle, reducing peripheral resistance",
      "evidenceLevel": "moderate"
    }
  ]
}
```

## 🎨 UI Components Necesarios

### 1. Tabla de Efectos por Condición

```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        <th>Condición</th>
        <th>Efecto</th>
        <th>Datos Cuantitativos</th>
        <th>Evidencia</th>
      </tr>
    </thead>
    <tbody>
      {benefitsByCondition.map(benefit => (
        <tr key={benefit.condition}>
          <td>{benefit.condition}</td>
          <td>
            <EffectBadge effect={benefit.effect} />
          </td>
          <td>{benefit.quantitativeData}</td>
          <td className="text-sm text-gray-600">
            {benefit.evidence}
            {benefit.context && (
              <div className="text-xs italic mt-1">{benefit.context}</div>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 2. Badge de Magnitud de Efecto

```tsx
function EffectBadge({ effect }: { effect: string }) {
  const colors = {
    'Large': 'bg-green-100 text-green-800 border-green-300',
    'Moderate': 'bg-blue-100 text-blue-800 border-blue-300',
    'Small': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'No effect': 'bg-gray-100 text-gray-800 border-gray-300',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border-2 ${colors[effect]}`}>
      {effect}
    </span>
  );
}
```

## 🚀 Plan de Implementación por Fases

### Fase 1: Backend (2-3 horas)
1. ✅ Crear `examine-style-prompt.ts`
2. ✅ Modificar `content-enricher/src/index.ts` para soportar `contentType`
3. ✅ Actualizar interface `EnrichRequest`
4. ✅ Testear con un suplemento (ej: magnesio)

### Fase 2: API Route (30 min)
1. ✅ Agregar parámetro `contentType` a `/api/portal/enrich`
2. ✅ Pasar parámetro a content-enricher Lambda

### Fase 3: Frontend (2-3 horas)
1. ✅ Crear `ExamineStylePanel.tsx`
2. ✅ Crear componentes auxiliares (`EffectBadge`, `ConditionTable`, etc.)
3. ✅ Agregar selector de modo en `app/portal/page.tsx`
4. ✅ Integrar con el flujo existente

### Fase 4: Testing (1 hora)
1. ✅ Probar con 3-5 suplementos diferentes
2. ✅ Verificar formato de datos
3. ✅ Ajustar prompt según resultados

## 💰 Costo Estimado

### Tokens de Claude
- Prompt Examine-style: ~2,000 tokens (similar al actual)
- Response: ~3,000 tokens (más estructurado pero similar)
- **Costo por consulta**: ~$0.02-0.03 (igual que ahora)

### Desarrollo
- **Tiempo total**: 6-8 horas
- **Complejidad**: Media (usa infraestructura existente)
- **Riesgo**: Bajo (no rompe nada existente)

## ✅ Ventajas de Este Approach

1. **No rompe nada**: Modo nuevo, código existente intacto
2. **Usa misma infraestructura**: Mismos Lambdas, mismo flujo
3. **Mismo costo**: Tokens similares, sin servicios nuevos
4. **Fácil de testear**: Selector de modo permite comparar
5. **Escalable**: Fácil agregar más modos en el futuro

## 🎯 Resultado Final

El usuario podrá elegir entre:
- **Modo Standard**: Formato actual (narrativo, fácil de leer)
- **Modo Examine**: Formato cuantitativo (datos precisos, tabla de efectos)

Ambos usan los mismos estudios reales de PubMed, solo cambia la presentación.
