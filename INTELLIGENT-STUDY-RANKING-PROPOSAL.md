# Propuesta: Motor Inteligente de Ranking de Estudios

## Problema Actual

El sistema actual busca estudios en PubMed usando `sort=relevance`, pero:
- No separa estudios positivos vs negativos
- No prioriza por calidad metodológica
- No balancea los resultados (5 a favor, 5 en contra)
- La relevancia de PubMed es genérica, no específica para suplementos

## Solución Propuesta: Sistema de Scoring Inteligente

### 1. **Scoring Multi-Dimensional**

Cada estudio recibe un score basado en múltiples factores:

```typescript
interface StudyScore {
  pmid: string;
  totalScore: number;
  breakdown: {
    methodologyScore: number;    // 0-40 puntos
    recencyScore: number;         // 0-20 puntos
    sampleSizeScore: number;      // 0-20 puntos
    citationScore: number;        // 0-10 puntos
    journalScore: number;         // 0-10 puntos
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
}
```

#### **Metodología (40 puntos)** - El más importante
```
Meta-análisis:           40 puntos
Systematic Review:       35 puntos
RCT (doble ciego):       30 puntos
RCT (simple ciego):      25 puntos
Clinical Trial:          20 puntos
Cohort Study:            15 puntos
Case-Control:            10 puntos
Review/Other:             5 puntos
```

#### **Recencia (20 puntos)**
```
< 2 años:    20 puntos
2-5 años:    15 puntos
5-10 años:   10 puntos
10-20 años:   5 puntos
> 20 años:    2 puntos
```

#### **Tamaño de Muestra (20 puntos)**
```
> 1000:      20 puntos
500-1000:    15 puntos
100-500:     10 puntos
50-100:       5 puntos
< 50:         2 puntos
```

#### **Citas (10 puntos)** - Usando PubMed Central
```
> 100 citas:  10 puntos
50-100:        7 puntos
10-50:         5 puntos
< 10:          2 puntos
```

#### **Journal Impact (10 puntos)**
```
Top tier (Nature, Lancet, NEJM):  10 puntos
High impact (IF > 5):              7 puntos
Medium impact (IF 2-5):            5 puntos
Other:                             3 puntos
```

### 2. **Análisis de Sentimiento con Claude**

Usar Claude Haiku para clasificar cada estudio como positivo/negativo/neutral:

```typescript
async function analyzeStudySentiment(study: Study): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
}> {
  const prompt = `Analiza este estudio científico y determina si los resultados son:
- POSITIVE: El suplemento mostró beneficios significativos
- NEGATIVE: El suplemento no mostró beneficios o mostró efectos adversos
- NEUTRAL: Resultados mixtos o no concluyentes

Título: ${study.title}
Abstract: ${study.abstract}

Responde en JSON:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicación"
}`;

  // Llamada a Claude Haiku (rápido y barato)
  const response = await invokeClaudeHaiku(prompt);
  return JSON.parse(response);
}
```

### 3. **Algoritmo de Balanceo Inteligente**

```typescript
interface RankedResults {
  positive: Study[];  // Top 5 estudios a favor
  negative: Study[];  // Top 5 estudios en contra
  metadata: {
    totalPositive: number;
    totalNegative: number;
    averageQualityPositive: number;
    averageQualityNegative: number;
    consensus: 'strong_positive' | 'moderate_positive' | 'mixed' | 'moderate_negative' | 'strong_negative';
  };
}

async function rankAndBalanceStudies(
  studies: Study[]
): Promise<RankedResults> {
  // Paso 1: Score cada estudio
  const scoredStudies = await Promise.all(
    studies.map(async (study) => {
      const score = calculateStudyScore(study);
      const sentiment = await analyzeStudySentiment(study);
      return { study, score, sentiment };
    })
  );

  // Paso 2: Separar por sentimiento
  const positive = scoredStudies
    .filter(s => s.sentiment.sentiment === 'positive')
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  const negative = scoredStudies
    .filter(s => s.sentiment.sentiment === 'negative')
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Paso 3: Seleccionar top 5 de cada lado
  const topPositive = positive.slice(0, 5);
  const topNegative = negative.slice(0, 5);

  // Paso 4: Calcular consenso
  const consensus = calculateConsensus(positive, negative);

  return {
    positive: topPositive.map(s => s.study),
    negative: topNegative.map(s => s.study),
    metadata: {
      totalPositive: positive.length,
      totalNegative: negative.length,
      averageQualityPositive: average(topPositive.map(s => s.score.totalScore)),
      averageQualityNegative: average(topNegative.map(s => s.score.totalScore)),
      consensus,
    },
  };
}
```

### 4. **Mejora en la Búsqueda PubMed**

Actualmente solo buscamos por relevancia. Propongo:

```typescript
async function intelligentPubMedSearch(
  supplementName: string,
  maxResults: number = 50 // Aumentar para tener más opciones
): Promise<Study[]> {
  // Búsqueda 1: Estudios de alta calidad (RCT + Meta-análisis)
  const highQuality = await searchPubMed({
    supplementName,
    maxResults: 20,
    filters: {
      studyTypes: ['randomized controlled trial', 'meta-analysis', 'systematic review'],
      yearFrom: 2015, // Últimos 10 años
      humanStudiesOnly: true,
    },
  });

  // Búsqueda 2: Estudios recientes (todos los tipos)
  const recent = await searchPubMed({
    supplementName,
    maxResults: 20,
    filters: {
      yearFrom: 2020, // Últimos 5 años
      humanStudiesOnly: true,
    },
  });

  // Búsqueda 3: Estudios negativos (buscar "no effect", "ineffective")
  const negative = await searchPubMed({
    supplementName: `${supplementName} AND (no effect OR ineffective OR placebo)`,
    maxResults: 10,
    filters: {
      humanStudiesOnly: true,
    },
  });

  // Combinar y deduplicar
  const allStudies = deduplicateByPMID([
    ...highQuality,
    ...recent,
    ...negative,
  ]);

  return allStudies;
}
```

### 5. **Caché Inteligente con Scoring**

Guardar no solo los estudios, sino también los scores:

```typescript
interface CachedStudyData {
  studies: Study[];
  scores: StudyScore[];
  rankedResults: RankedResults;
  generatedAt: string;
  expiresAt: string; // 7 días
}
```

### 6. **API de Citas (Opcional pero Recomendado)**

Integrar con PubMed Central o Europe PMC para obtener conteo de citas:

```typescript
async function getCitationCount(pmid: string): Promise<number> {
  // Europe PMC API (gratis)
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMID:${pmid}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  return data.resultList?.result?.[0]?.citedByCount || 0;
}
```

## Implementación por Fases

### **Fase 1: Scoring Básico** (2-3 horas)
- Implementar scoring por metodología, recencia, tamaño de muestra
- No requiere APIs externas
- Mejora inmediata en calidad de resultados

### **Fase 2: Análisis de Sentimiento** (3-4 horas)
- Integrar Claude Haiku para clasificar estudios
- Implementar balanceo 5 positivos / 5 negativos
- Costo: ~$0.001 por estudio (muy barato con Haiku)

### **Fase 3: Búsqueda Inteligente** (2-3 horas)
- Múltiples búsquedas estratégicas en PubMed
- Búsqueda específica de estudios negativos
- Deduplicación inteligente

### **Fase 4: Citas y Journal Impact** (4-5 horas)
- Integrar Europe PMC para citas
- Base de datos de journal impact factors
- Scoring completo

## Costos Estimados

### Claude Haiku (Análisis de Sentimiento)
- Input: ~500 tokens por estudio
- Output: ~50 tokens por estudio
- Costo: ~$0.001 por estudio
- Para 50 estudios: ~$0.05 por búsqueda

### PubMed API
- Gratis (con API key: 10 req/seg)

### Europe PMC API
- Gratis

**Total: ~$0.05 por búsqueda completa**

## Beneficios

1. **Objetividad**: Muestra ambos lados de la evidencia
2. **Calidad**: Prioriza estudios metodológicamente sólidos
3. **Actualidad**: Favorece investigación reciente
4. **Transparencia**: Score visible para el usuario
5. **Confianza**: El usuario ve que no estamos sesgados

## Ejemplo de Output

```json
{
  "supplement": "Magnesium Glycinate",
  "positive": [
    {
      "pmid": "12345678",
      "title": "RCT: Magnesium improves sleep quality",
      "score": 85,
      "breakdown": {
        "methodology": 30,
        "recency": 20,
        "sampleSize": 15,
        "citations": 10,
        "journal": 10
      },
      "year": 2023,
      "studyType": "randomized controlled trial",
      "participants": 500,
      "sentiment": "positive",
      "confidence": 0.95
    }
    // ... 4 más
  ],
  "negative": [
    {
      "pmid": "87654321",
      "title": "No significant effect on anxiety",
      "score": 75,
      // ...
    }
    // ... 4 más
  ],
  "metadata": {
    "totalPositive": 32,
    "totalNegative": 8,
    "consensus": "moderate_positive",
    "averageQualityPositive": 78,
    "averageQualityNegative": 72
  }
}
```

## Próximos Pasos

1. ¿Te interesa implementar esto?
2. ¿Prefieres empezar con Fase 1 (scoring básico) o ir directo a Fase 2 (con sentimiento)?
3. ¿Quieres que cree los archivos de código ahora?
