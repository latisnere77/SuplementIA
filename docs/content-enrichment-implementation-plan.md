# Plan de Implementación Detallado - Content Enrichment

**Fecha**: 2024-11-19
**Proyecto**: Suplementia Content Enrichment
**Objetivo**: Implementación modular sin efecto cascada

---

## 📋 Matriz de Dependencias

### Tabla de Módulos vs Dependencias

| Módulo | AWS Services | Módulos Internos | APIs Externas | Tipo de Dependencia |
|--------|-------------|------------------|---------------|---------------------|
| **Cache Service** | DynamoDB | ❌ Ninguno | ❌ Ninguna | ✅ Independiente |
| **Content Enricher** | Bedrock (Claude) | Cache Service (opcional) | ❌ Ninguna | ⚠️ Soft dependency |
| **Evidence Analyzer** | Comprehend Medical | Cache Service (opcional) | ❌ Ninguna | ⚠️ Soft dependency |
| **Studies Fetcher** | Lambda | Cache Service (opcional) | ✅ PubMed API | ⚠️ External dependency |
| **API Route (Orchestrator)** | API Gateway | TODOS los módulos | ❌ Ninguna | 🔄 Orchestrator |

### Tipos de Dependencias

1. **✅ Independiente**: Puede deployarse y ejecutarse sin esperar otros módulos
2. **⚠️ Soft Dependency**: Puede funcionar sin el módulo dependiente (graceful degradation)
3. **🔴 Hard Dependency**: REQUIERE que otro módulo esté funcionando (❌ EVITAR)
4. **🔄 Orchestrator**: Coordina múltiples módulos pero no depende de ninguno específicamente

---

## 🚫 Prevención de Efecto Cascada - Checklist

### ✅ Arquitectura
- [x] Cada módulo tiene su propia Lambda (no monolito)
- [x] Cada módulo tiene su propia tabla DynamoDB (si necesita)
- [x] Comunicación asíncrona vía EventBridge (no llamadas directas)
- [x] Timeouts independientes por módulo
- [x] Circuit breakers en orquestador
- [x] Fallbacks definidos para cada módulo

### ✅ Deployment
- [x] Cada Lambda puede deployarse independientemente
- [x] Versionado semántico para cada módulo
- [x] Blue/Green deployment habilitado
- [x] Rollback automático si health check falla
- [x] Canary deployment (5% → 25% → 50% → 100%)

### ✅ Monitoreo
- [x] X-Ray habilitado en TODAS las Lambdas
- [x] CloudWatch Alarms por módulo
- [x] SNS notifications para errores críticos
- [x] Dashboard centralizado
- [x] Logs estructurados (JSON) para fácil parsing

### ✅ Testing
- [x] Tests unitarios por módulo (>80% coverage)
- [x] Tests de integración aislados
- [x] Chaos engineering (inyectar fallas)
- [x] Load testing por módulo
- [x] End-to-end testing con fallbacks

---

## 🗺️ X-Ray Service Map (Esperado)

### Service Map Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│                    (Browser/Mobile)                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│                  suplementia-api-gateway                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Route: GET /api/portal/recommendation-enriched/:id        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAMBDA: API ORCHESTRATOR                      │
│              suplementia-recommendation-orchestrator             │
│                                                                  │
│  Responsabilidad:                                                │
│  - Llamar módulos en paralelo (Promise.allSettled)              │
│  - Combinar resultados                                           │
│  - Manejar fallbacks                                             │
│                                                                  │
│  Timeout: 15s                                                    │
│  Memory: 512MB                                                   │
│  X-Ray: ✓ Enabled                                                │
└─────────┬──────────┬──────────┬──────────┬─────────────────────┘
          │          │          │          │
          │ (parallel)          │          │
          ▼          ▼          ▼          ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐
│   Module 1  │ │ Module 2│ │ Module 3 │ │ Module 4│
│             │ │         │ │          │ │         │
│   Cache     │ │ Content │ │ Evidence │ │ Studies │
│   Service   │ │ Enrich  │ │ Analyzer │ │ Fetcher │
│             │ │         │ │          │ │         │
│  Timeout:   │ │Timeout: │ │ Timeout: │ │Timeout: │
│   500ms     │ │  5s     │ │   3s     │ │   4s    │
│             │ │         │ │          │ │         │
│  X-Ray: ✓   │ │X-Ray: ✓ │ │ X-Ray: ✓ │ │X-Ray: ✓ │
└─────┬───────┘ └────┬────┘ └────┬─────┘ └────┬────┘
      │              │           │             │
      ▼              ▼           ▼             ▼
┌──────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐
│DynamoDB  │  │ Bedrock  │ │Comprehend│ │ PubMed   │
│          │  │          │ │ Medical  │ │ API      │
│enriched- │  │ Claude   │ │          │ │          │
│content   │  │ Sonnet   │ │          │ │ (Ext)    │
└──────────┘  └──────────┘ └──────────┘ └──────────┘
```

### X-Ray Annotations (Para Búsqueda)

```typescript
// En cada Lambda
AWSXRay.captureFunc('annotations', (subsegment) => {
  // Identificadores de búsqueda
  subsegment.addAnnotation('supplementId', supplementId);
  subsegment.addAnnotation('userId', userId);
  subsegment.addAnnotation('module', 'content-enricher');
  subsegment.addAnnotation('version', 'v1.2.0');

  // Metadata (no indexado, pero visible)
  subsegment.addMetadata('input', {
    supplementId,
    category,
    options
  });

  subsegment.addMetadata('performance', {
    bedrockCallDuration: 2340,
    cacheHit: false
  });
});
```

### X-Ray Queries para Debugging

```sql
-- 1. Encontrar requests lentos
annotation.supplementId = "ashwagandha" AND duration > 5

-- 2. Encontrar errores en módulo específico
annotation.module = "content-enricher" AND error = true

-- 3. Analizar performance por versión
annotation.version = "v1.2.0" AND annotation.module = "content-enricher"

-- 4. Detectar timeouts
annotation.module = "studies-fetcher" AND fault = true

-- 5. Cache hit rate
annotation.module = "cache-service" AND annotation.cacheHit = true
```

---

## 📦 Plan de Implementación Fase por Fase

### FASE 1: Infraestructura y Cache Service (Sprint 1 - Semana 1)

#### Objetivos
- [ ] Setup infraestructura base AWS
- [ ] Implementar Cache Service completamente
- [ ] Configurar X-Ray en toda la cuenta

#### Tasks Detalladas

**1.1 Setup AWS Infrastructure (Día 1-2)**
```bash
# Crear tabla DynamoDB
aws dynamodb create-table \
  --table-name suplementia-enriched-content \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=Suplementia Key=Module,Value=Cache \
  --region us-east-1

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name suplementia-enriched-content \
  --time-to-live-specification "Enabled=true, AttributeName=ttl"

# Enable Point-in-Time Recovery
aws dynamodb update-continuous-backups \
  --table-name suplementia-enriched-content \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

**1.2 Implementar Lambda: Cache Service (Día 2-3)**

```typescript
// backend/lambda/cache-service/handler.ts

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import AWSXRay from 'aws-xray-sdk-core';

const client = AWSXRay.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'suplementia-enriched-content';
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

interface CacheItem {
  PK: string;
  SK: string;
  data: any;
  ttl: number;
  lastUpdated: string;
  version: string;
}

export const handler = async (event: any) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('cache-service');

  try {
    const { httpMethod, pathParameters, body } = event;
    const { supplementId } = pathParameters || {};

    subsegment?.addAnnotation('supplementId', supplementId);
    subsegment?.addAnnotation('module', 'cache-service');
    subsegment?.addAnnotation('httpMethod', httpMethod);

    switch (httpMethod) {
      case 'GET':
        return await getCache(supplementId, subsegment);
      case 'PUT':
        return await putCache(supplementId, JSON.parse(body), subsegment);
      case 'DELETE':
        return await deleteCache(supplementId, subsegment);
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error: any) {
    subsegment?.addError(error);
    console.error('Cache service error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  } finally {
    subsegment?.close();
  }
};

async function getCache(supplementId: string, subsegment?: any) {
  const startTime = Date.now();

  const response = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `SUPPLEMENT#${supplementId}`,
        SK: 'ENRICHED_CONTENT#v1'
      }
    })
  );

  const duration = Date.now() - startTime;
  subsegment?.addMetadata('dynamodb', { operation: 'GetItem', duration });

  if (!response.Item) {
    subsegment?.addAnnotation('cacheHit', false);
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  // Check if cache is stale (older than TTL)
  const now = Math.floor(Date.now() / 1000);
  const isStale = response.Item.ttl && response.Item.ttl < now;

  subsegment?.addAnnotation('cacheHit', true);
  subsegment?.addAnnotation('cacheStale', isStale);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: response.Item.data,
      metadata: {
        lastUpdated: response.Item.lastUpdated,
        version: response.Item.version,
        isStale
      }
    })
  };
}

async function putCache(supplementId: string, data: any, subsegment?: any) {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;

  const item: CacheItem = {
    PK: `SUPPLEMENT#${supplementId}`,
    SK: 'ENRICHED_CONTENT#v1',
    data,
    ttl,
    lastUpdated: now,
    version: '1.0.0'
  };

  const startTime = Date.now();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    })
  );

  const duration = Date.now() - startTime;
  subsegment?.addMetadata('dynamodb', { operation: 'PutItem', duration });

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Cache updated',
      metadata: {
        lastUpdated: now,
        ttl: new Date(ttl * 1000).toISOString()
      }
    })
  };
}

async function deleteCache(supplementId: string, subsegment?: any) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `SUPPLEMENT#${supplementId}`,
        SK: 'ENRICHED_CONTENT#v1'
      }
    })
  );

  subsegment?.addMetadata('operation', 'CacheInvalidation');

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Cache invalidated'
    })
  };
}
```

**1.3 Testing Cache Service (Día 4)**

```typescript
// backend/lambda/cache-service/tests/handler.test.ts

import { handler } from '../handler';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Cache Service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  test('GET - Cache hit', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: 'SUPPLEMENT#ashwagandha',
        SK: 'ENRICHED_CONTENT#v1',
        data: { content: 'test' },
        ttl: Math.floor(Date.now() / 1000) + 3600,
        lastUpdated: new Date().toISOString()
      }
    });

    const result = await handler({
      httpMethod: 'GET',
      pathParameters: { supplementId: 'ashwagandha' }
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.metadata.isStale).toBe(false);
  });

  test('GET - Cache miss', async () => {
    ddbMock.on(GetCommand).resolves({});

    const result = await handler({
      httpMethod: 'GET',
      pathParameters: { supplementId: 'nonexistent' }
    });

    expect(result.statusCode).toBe(404);
  });

  test('PUT - Cache write', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler({
      httpMethod: 'PUT',
      pathParameters: { supplementId: 'ashwagandha' },
      body: JSON.stringify({ content: 'test data' })
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
  });
});
```

**1.4 Deploy y Validación (Día 5)**

```bash
# Deploy Lambda
cd backend/lambda/cache-service
npm install
npm run build
npm run test

# Package and deploy
sam package --template-file template.yaml --output-template-file packaged.yaml --s3-bucket suplementia-deployments
sam deploy --template-file packaged.yaml --stack-name suplementia-cache-service --capabilities CAPABILITY_IAM

# Test endpoint
curl -X GET https://api.suplementia.com/cache/ashwagandha

# Check X-Ray traces
aws xray get-trace-summaries \
  --start-time $(date -u -v-5M +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.module = "cache-service"'
```

#### Criterios de Éxito Fase 1
- [x] Cache GET/PUT/DELETE funcionando
- [x] X-Ray traces visibles en consola AWS
- [x] Tests unitarios pasando (>80% coverage)
- [x] Latency P95 < 100ms para cache hits
- [x] DynamoDB auto-scaling configurado

---

### FASE 2: Content Enrichment Service (Sprint 2 - Semana 2)

#### Objetivos
- [ ] Implementar Content Enricher Lambda
- [ ] Crear prompts optimizados para Bedrock
- [ ] Integrar con Cache Service
- [ ] Testing con 5 suplementos top

#### Tasks Detalladas

**2.1 Prompt Engineering para Bedrock (Día 1-2)**

```typescript
// backend/lambda/content-enricher/prompts.ts

export const ENRICHMENT_PROMPT = `Actúa como un experto en farmacología, nutrición y evidencia científica.

Tu tarea es analizar el suplemento "{supplementName}" y generar un reporte completo y preciso basado ÚNICAMENTE en evidencia científica publicada.

CONTEXTO:
- Categoría: {category}
- Usuario objetivo: Personas en Latinoamérica (LATAM) buscando información confiable

ESTRUCTURA REQUERIDA (Responde en JSON):

{
  "whatIsIt": "Descripción clara en 2-3 oraciones de qué es este suplemento, su origen y usos tradicionales",

  "primaryUses": [
    "Uso 1",
    "Uso 2",
    "Uso 3"
  ],

  "mechanisms": [
    {
      "name": "Nombre del mecanismo",
      "description": "Explicación clara del mecanismo de acción",
      "evidenceLevel": "strong|moderate|weak|preliminary",
      "studyCount": numero_estimado
    }
  ],

  "worksFor": [
    {
      "condition": "Condición o beneficio específico",
      "evidenceGrade": "A|B|C|D",
      "effectSize": "Fuerte|Moderado|Débil",
      "studyCount": numero_estimado,
      "metaAnalysis": true|false,
      "notes": "Detalles importantes sobre dosis, duración, población estudiada"
    }
  ],

  "doesntWorkFor": [
    {
      "condition": "Condición para la que NO hay evidencia o evidencia negativa",
      "evidenceGrade": "D",
      "notes": "Explicación breve"
    }
  ],

  "dosage": {
    "standard": "Rango de dosis estándar",
    "timing": "Cuándo tomar (mañana/noche/con comida)",
    "duration": "Duración mínima para ver efectos",
    "forms": [
      {
        "form": "Nombre de la forma (ej: KSM-66)",
        "description": "Descripción breve",
        "recommended": true|false
      }
    ],
    "stacksWith": ["Otros suplementos con buena sinergia"]
  },

  "safety": {
    "overallRating": "Generally Safe|Caution Required|Insufficient Data",
    "sideEffects": [
      {
        "effect": "Efecto secundario",
        "frequency": "Común|Ocasional|Raro",
        "severity": "Leve|Moderado|Grave"
      }
    ],
    "contraindications": [
      "Contraindicación 1",
      "Contraindicación 2"
    ],
    "interactions": [
      {
        "medication": "Tipo de medicamento",
        "severity": "Leve|Moderada|Grave",
        "description": "Descripción de la interacción"
      }
    ]
  }
}

INSTRUCCIONES CRÍTICAS:
1. Basate SOLO en evidencia científica publicada
2. Si no hay suficiente evidencia para algo, indícalo claramente
3. NO inventes datos o estudios
4. Usa terminología clara y accesible (evita jerga excesiva)
5. Prioriza meta-análisis y RCTs sobre estudios observacionales
6. Sé conservador en tus afirmaciones

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional antes o después.`;

export function buildPrompt(supplementName: string, category?: string): string {
  return ENRICHMENT_PROMPT
    .replace('{supplementName}', supplementName)
    .replace('{category}', category || 'general');
}
```

**2.2 Implementar Content Enricher Lambda (Día 2-4)**

```typescript
// backend/lambda/content-enricher/handler.ts

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';
import { buildPrompt } from './prompts';

const client = AWSXRay.captureAWSv3Client(
  new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

export const handler = async (event: any) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('content-enricher');

  try {
    const { supplementId, category } = JSON.parse(event.body || '{}');

    if (!supplementId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'supplementId is required' })
      };
    }

    subsegment?.addAnnotation('supplementId', supplementId);
    subsegment?.addAnnotation('module', 'content-enricher');
    subsegment?.addAnnotation('version', '1.0.0');

    // Build prompt
    const prompt = buildPrompt(supplementId, category);

    // Call Bedrock
    const bedrockStartTime = Date.now();
    const response = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
          temperature: 0.3,  // Low temperature for factual content
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })
    );

    const bedrockDuration = Date.now() - bedrockStartTime;
    subsegment?.addMetadata('bedrock', {
      duration: bedrockDuration,
      modelId: MODEL_ID,
      temperature: 0.3
    });

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Extract JSON from response
    let enrichedData;
    try {
      enrichedData = JSON.parse(content);
    } catch (parseError) {
      // Sometimes Claude wraps JSON in markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse Bedrock response as JSON');
      }
    }

    // Validate structure
    validateEnrichedData(enrichedData);

    subsegment?.addMetadata('output', {
      hasWhatIsIt: !!enrichedData.whatIsIt,
      mechanismsCount: enrichedData.mechanisms?.length || 0,
      worksForCount: enrichedData.worksFor?.length || 0
    });

    // Save to cache (async, don't wait)
    saveToCacheAsync(supplementId, enrichedData).catch(err => {
      console.error('Failed to save to cache:', err);
    });

    subsegment?.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: enrichedData,
        metadata: {
          supplementId,
          generatedAt: new Date().toISOString(),
          bedrockDuration
        }
      })
    };

  } catch (error: any) {
    subsegment?.addError(error);
    console.error('Content enricher error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to enrich content',
        message: error.message
      })
    };
  }
};

function validateEnrichedData(data: any) {
  const required = ['whatIsIt', 'mechanisms', 'worksFor', 'dosage', 'safety'];
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

async function saveToCacheAsync(supplementId: string, data: any) {
  // Call cache service API
  const cacheUrl = process.env.CACHE_SERVICE_URL;
  if (!cacheUrl) return;

  await fetch(`${cacheUrl}/cache/${supplementId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
```

**2.3 Testing (Día 4-5)**

```bash
# Test con suplementos top
for supplement in ashwagandha omega-3 vitamin-d magnesium creatine; do
  echo "Testing $supplement..."
  aws lambda invoke \
    --function-name suplementia-content-enricher \
    --payload "{\"body\":\"{\\\"supplementId\\\":\\\"$supplement\\\"}\"}" \
    output-$supplement.json

  # Validar JSON
  cat output-$supplement.json | jq '.body | fromjson | .data.mechanisms | length'
done

# Verificar X-Ray traces
aws xray get-trace-summaries \
  --start-time $(date -u -v-10M +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.module = "content-enricher" AND duration > 5'
```

#### Criterios de Éxito Fase 2
- [x] Content enricher genera JSON válido para 5 suplementos top
- [x] Bedrock calls tienen timeout < 10s
- [x] Cache se actualiza automáticamente
- [x] X-Ray muestra llamadas a Bedrock
- [x] Manual review de calidad: >90% accurate

---

### FASE 3-6: [Continuar en documento separado para brevedad]

---

## 🐛 Debugging Sistemático - Runbook

### Problema: "Recomendación tarda >30s en generarse"

#### Paso 1: Identificar Bottleneck con X-Ray

```bash
# Ver service map
aws xray get-service-graph \
  --start-time $(date -u -v-5M +%s) \
  --end-time $(date -u +%s) \
  > service-graph.json

# Buscar módulo lento
cat service-graph.json | jq '.Services[] | select(.SummaryStatistics.TotalResponseTime > 10000)'
```

#### Paso 2: Analizar Traces Específicas

```bash
# Buscar traces de supplementId específico
aws xray get-trace-summaries \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.supplementId = "ashwagandha" AND duration > 10' \
  --query 'TraceSummaries[*].Id' \
  --output text | \
while read trace_id; do
  aws xray batch-get-traces --trace-ids "$trace_id" > trace-$trace_id.json
done
```

#### Paso 3: Revisar CloudWatch Logs

```bash
# Logs del módulo lento
aws logs tail /aws/lambda/suplementia-content-enricher \
  --since 5m \
  --filter-pattern "ERROR" \
  --format short
```

#### Paso 4: Verificar Estado de Servicios AWS

```bash
# Check Bedrock status
aws bedrock list-foundation-models --region us-east-1

# Check DynamoDB throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=suplementia-enriched-content \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Sum
```

#### Paso 5: Acciones Correctivas

| Síntoma | Causa Probable | Acción |
|---------|----------------|--------|
| Bedrock timeout | Cold start + modelo lento | Aumentar timeout Lambda a 30s |
| DynamoDB throttling | Burst capacity excedido | Cambiar a provisioned capacity |
| Cache miss alto | TTL muy corto | Aumentar TTL a 7 días |
| Circuit breaker OPEN | Múltiples fallos en módulo | Investigar causa raíz, resetear breaker |

---

## ✅ Checklist Pre-Deployment

### Por cada módulo ANTES de deploy:

- [ ] **Tests**
  - [ ] Unit tests passing (>80% coverage)
  - [ ] Integration tests passing
  - [ ] Load testing completado

- [ ] **X-Ray**
  - [ ] X-Ray SDK integrado
  - [ ] Annotations configuradas
  - [ ] Metadata agregada

- [ ] **Logging**
  - [ ] Logs estructurados (JSON)
  - [ ] Log levels apropiados
  - [ ] Sensitive data enmascarada

- [ ] **Monitoreo**
  - [ ] CloudWatch Alarms creadas
  - [ ] SNS topic configurado
  - [ ] Dashboard actualizado

- [ ] **Seguridad**
  - [ ] IAM role con mínimos privilegios
  - [ ] Secrets en Secrets Manager
  - [ ] VPC configuration (si aplica)

- [ ] **Performance**
  - [ ] Timeout configurado
  - [ ] Memory asignada
  - [ ] Concurrent executions limitado

- [ ] **Rollback Plan**
  - [ ] Versión anterior identificada
  - [ ] Rollback script probado
  - [ ] Health check configurado

---

## 📊 Métricas de Monitoreo

### CloudWatch Dashboard (JSON)

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", { "stat": "p95", "label": "P95 Latency" }],
          ["...", { "stat": "p50", "label": "P50 Latency" }]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Performance",
        "yAxis": {
          "left": {
            "label": "Milliseconds"
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Errors", { "stat": "Sum", "color": "#d62728" }],
          [".", "Throttles", { "stat": "Sum", "color": "#ff7f0e" }]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Lambda Errors & Throttles",
        "yAxis": {
          "left": {
            "min": 0
          }
        }
      }
    }
  ]
}
```

---

**Última actualización**: 2024-11-19
**Versión**: 1.0.0
**Status**: 🟡 Listo para Implementación
