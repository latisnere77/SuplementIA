# Buenas Prácticas para Desarrollo de Lambdas - Proyecto SuplementIA

**Fecha de Creación:** 19 de noviembre de 2025
**Versión:** 1.0
**Proyecto:** SuplementIA (ANKOSOFT Education Portal)

---

## 📋 Índice

1. [Principios Fundamentales](#principios-fundamentales)
2. [Estructura de Código](#estructura-de-código)
3. [Manejo de Errores](#manejo-de-errores)
4. [Logging y Monitoreo](#logging-y-monitoreo)
5. [Performance y Optimización](#performance-y-optimización)
6. [Seguridad](#seguridad)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Checklist de Pre-Deployment](#checklist-de-pre-deployment)

---

## 🎯 Principios Fundamentales

### 1. Stateless y Idempotente

**✅ HACER:**
```typescript
// Lambda debe procesar request sin dependencia de estado previo
export async function handler(event: APIGatewayEvent) {
  const requestId = event.requestContext.requestId;

  // Toda la información necesaria viene en el event
  const data = JSON.parse(event.body);

  // Procesar y retornar
  return {
    statusCode: 200,
    body: JSON.stringify({ requestId, result: processData(data) })
  };
}
```

**❌ EVITAR:**
```typescript
// NO usar variables globales que mutan estado
let requestCount = 0;  // ❌ MAL

export async function handler(event: APIGatewayEvent) {
  requestCount++;  // ❌ Estado compartido entre invocaciones
  // ...
}
```

---

### 2. Cold Start Optimization

**✅ HACER:**
```typescript
// Inicializar clientes FUERA del handler (reuso entre invocaciones)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Inicializar una vez (fuera del handler)
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function handler(event: APIGatewayEvent) {
  // Usar cliente ya inicializado
  const result = await docClient.get({...});
  return { statusCode: 200, body: JSON.stringify(result) };
}
```

**❌ EVITAR:**
```typescript
export async function handler(event: APIGatewayEvent) {
  // ❌ Inicializar cliente en cada invocación (lento)
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  // ...
}
```

---

### 3. Timeout Apropiado

**Configuración recomendada según tipo de Lambda:**

| Tipo de Lambda | Timeout | Razón |
|----------------|---------|-------|
| **API Endpoint (sync)** | 10-15 segundos | API Gateway timeout = 29s, pero mejor respuesta rápida |
| **Background processing** | 60-300 segundos | Permite procesamiento complejo |
| **Scheduled jobs** | 300-900 segundos | Tareas batch/cron |

**Ejemplo en Next.js API Route:**
```typescript
// app/api/portal/autocomplete/route.ts
export const runtime = 'nodejs';  // o 'edge'
export const maxDuration = 10;    // 10 segundos máximo
```

---

## 🏗️ Estructura de Código

### Template de API Route (Next.js)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Tipos
interface RequestBody {
  query: string;
  language: 'en' | 'es';
}

interface ResponseData {
  success: boolean;
  data?: any;
  error?: string;
  meta?: {
    requestId?: string;
    duration?: number;
  };
}

// Configuración
export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/portal/example
 *
 * Descripción breve de lo que hace el endpoint
 *
 * @param request - Next.js request object
 * @returns JSON response
 */
export async function POST(request: NextRequest): Promise<NextResponse<ResponseData>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Parse y validación de input
    const body: RequestBody = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameter' },
        { status: 400 }
      );
    }

    // 2. Logging de entrada
    console.log(`[${requestId}] Request received:`, {
      query: body.query,
      language: body.language,
    });

    // 3. Lógica de negocio
    const result = await processRequest(body);

    // 4. Logging de éxito
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Success:`, {
      duration: `${duration}ms`,
      resultCount: result.length,
    });

    // 5. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: { requestId, duration },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error) {
    // 6. Manejo de errores
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error:`, error);

    // Enviar a Sentry
    Sentry.captureException(error, {
      tags: { requestId, endpoint: '/api/portal/example' },
      extra: { duration },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        meta: { requestId },
      },
      { status: 500 }
    );
  }
}

// Función auxiliar (puede estar en archivo separado)
async function processRequest(body: RequestBody): Promise<any[]> {
  // Lógica de procesamiento
  return [];
}
```

---

## ❌ Manejo de Errores

### 1. Jerarquía de Errores

**Crear clases de error personalizadas:**

```typescript
// lib/errors/CustomErrors.ts

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public resourceId?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ExternalAPIError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ExternalAPIError';
  }
}
```

**Uso en Lambda:**

```typescript
import { ValidationError, NotFoundError } from '@/lib/errors/CustomErrors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validación
    if (!body.id) {
      throw new ValidationError('ID is required', 'id');
    }

    // Buscar en DB
    const item = await getItemFromDB(body.id);
    if (!item) {
      throw new NotFoundError('Item not found', body.id);
    }

    return NextResponse.json({ success: true, data: item });

  } catch (error) {
    // Manejo específico según tipo de error
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, field: error.field },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Error genérico
    console.error('Unexpected error:', error);
    Sentry.captureException(error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### 2. Retry Logic para APIs Externas

```typescript
async function callExternalAPIWithRetry<T>(
  apiCall: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    serviceName: string;
  }
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, serviceName } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.warn(`[${serviceName}] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt === maxRetries) {
        throw new ExternalAPIError(
          `Failed after ${maxRetries} retries`,
          serviceName
        );
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error('Unreachable');
}

// Uso
const data = await callExternalAPIWithRetry(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  { serviceName: 'ExampleAPI' }
);
```

---

## 📊 Logging y Monitoreo

### 1. Logging Estructurado

**✅ HACER:**
```typescript
// Usar structured logging (JSON)
console.log(JSON.stringify({
  level: 'info',
  message: 'User authentication successful',
  userId: user.id,
  timestamp: new Date().toISOString(),
  requestId: requestId,
  duration: 150,
}));
```

**O usar función helper:**

```typescript
// lib/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  message: string;
  [key: string]: any;
}

export function log(level: LogLevel, data: LogData, requestId?: string) {
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    requestId,
    ...data,
  };

  const logFn = level === 'error' ? console.error : console.log;
  logFn(JSON.stringify(logEntry));
}

// Uso
import { log } from '@/lib/utils/logger';

log('info', {
  message: 'Processing autocomplete request',
  query: 'sueño',
  language: 'es',
  resultsCount: 5,
}, requestId);
```

---

### 2. Sentry Integration

```typescript
import * as Sentry from '@sentry/nextjs';

// Configurar contexto
Sentry.setContext('request', {
  requestId,
  endpoint: '/api/portal/autocomplete',
  method: request.method,
});

// Agregar breadcrumbs
Sentry.addBreadcrumb({
  category: 'api',
  message: 'Fetching autocomplete suggestions',
  level: 'info',
  data: { query, language },
});

// Capturar excepciones
try {
  // ...
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      endpoint: '/api/portal/autocomplete',
      language,
    },
    extra: {
      query,
      requestId,
    },
  });
}
```

---

### 3. CloudWatch Metrics (Personalizado)

```typescript
// Para métricas custom (opcional)
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

async function publishMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' = 'Count'
) {
  const client = new CloudWatchClient({ region: 'us-east-1' });

  await client.send(new PutMetricDataCommand({
    Namespace: 'SuplementIA/Portal',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
    }],
  }));
}

// Uso
const duration = Date.now() - startTime;
await publishMetric('AutocompleteLatency', duration, 'Milliseconds');
```

---

## ⚡ Performance y Optimización

### 1. Caching

**Next.js API Route Caching:**

```typescript
export async function GET(request: NextRequest) {
  const response = NextResponse.json(data);

  // Cache público (CDN + browser)
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return response;
}
```

**Estrategias de cache:**

| Tipo de Datos | Cache-Control | Duración |
|---------------|---------------|----------|
| **Autocomplete suggestions** | `public, s-maxage=300` | 5 minutos |
| **User-specific data** | `private, max-age=60` | 1 minuto |
| **Static content** | `public, immutable, max-age=31536000` | 1 año |
| **No cache** | `no-store, must-revalidate` | Sin cache |

---

### 2. Connection Pooling

```typescript
// ✅ Inicializar clientes FUERA del handler
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: 'us-east-1',
  maxAttempts: 3,
  // Connection pooling automático
});

// Reusar conexión entre invocaciones
```

---

### 3. Lazy Loading

```typescript
// Cargar módulos pesados solo cuando sea necesario
let heavyModule: any = null;

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Solo cargar si es necesario
  if (body.requiresHeavyProcessing) {
    if (!heavyModule) {
      heavyModule = await import('@/lib/heavy-module');
    }
    return heavyModule.process(body);
  }

  // Procesamiento ligero
  return simpleProcess(body);
}
```

---

### 4. Paralelización

```typescript
// ✅ Ejecutar operaciones independientes en paralelo
const [userData, recommendations, stats] = await Promise.all([
  getUserData(userId),
  getRecommendations(userId),
  getStats(userId),
]);

// ❌ NO ejecutar secuencialmente si no hay dependencia
const userData = await getUserData(userId);
const recommendations = await getRecommendations(userId);  // Esperando innecesariamente
const stats = await getStats(userId);
```

---

## 🔒 Seguridad

### 1. Input Validation

```typescript
import { z } from 'zod';  // Librería de validación (opcional)

// Schema de validación
const AutocompleteSchema = z.object({
  q: z.string().min(2).max(100),
  lang: z.enum(['en', 'es']),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Validar con schema
  const result = AutocompleteSchema.safeParse({
    q: searchParams.get('q'),
    lang: searchParams.get('lang') || 'en',
    limit: parseInt(searchParams.get('limit') || '10'),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 }
    );
  }

  // Usar datos validados
  const { q, lang, limit } = result.data;
  // ...
}
```

---

### 2. Rate Limiting

```typescript
// Usar Vercel Edge Config o Redis para rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10 requests per 10 seconds
});

export async function GET(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Procesar request
  // ...
}
```

---

### 3. Sanitización de Output

```typescript
// Escapar HTML para prevenir XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Uso en sugerencias de autocomplete
const suggestions = rawSuggestions.map(s => ({
  ...s,
  text: escapeHtml(s.text),
}));
```

---

### 4. Environment Variables

```typescript
// ✅ HACER: Validar env vars al inicio
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

const SENTRY_DSN = getEnvVar('NEXT_PUBLIC_SENTRY_DSN');
const API_KEY = getEnvVar('PORTAL_API_KEY');

// ❌ EVITAR: Exponer secrets en logs
console.log('API Key:', process.env.API_KEY);  // ❌ MAL
```

---

## 🧪 Testing

### 1. Tests Unitarios (Opcional pero Recomendado)

```typescript
// __tests__/api/autocomplete.test.ts
import { GET } from '@/app/api/portal/autocomplete/route';
import { NextRequest } from 'next/server';

describe('Autocomplete API', () => {
  it('returns suggestions for valid query', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/portal/autocomplete?q=sleep&lang=en'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('returns 400 for missing query', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/portal/autocomplete?lang=en'
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
```

---

### 2. Testing Local

```bash
# Next.js dev server
npm run dev

# Curl testing
curl "http://localhost:3000/api/portal/autocomplete?q=sleep&lang=en"

# Con headers
curl -H "Content-Type: application/json" \
     "http://localhost:3000/api/portal/autocomplete?q=sueño&lang=es"
```

---

## 🚀 Deployment

### 1. Pre-Deployment Checklist

- [ ] **Código revisado** - Sin console.log innecesarios
- [ ] **Variables de entorno** - Configuradas en Vercel
- [ ] **Sentry configurado** - DSN válido
- [ ] **Timeout configurado** - Apropiado para la operación
- [ ] **Rate limiting** - Implementado si es necesario
- [ ] **Logging estructurado** - JSON con requestId
- [ ] **Error handling** - Try-catch completo
- [ ] **Validación de inputs** - Todos los parámetros validados
- [ ] **Tests ejecutados** - Al menos smoke tests
- [ ] **Documentación** - README actualizado

---

### 2. Monitoring Post-Deployment

**Primera hora:**
- [ ] Revisar CloudWatch logs cada 10 minutos
- [ ] Verificar Sentry por errores
- [ ] Validar latencia promedio < 100ms
- [ ] Confirmar tasa de error < 1%

**Primeras 24 horas:**
- [ ] Dashboard de CloudWatch con métricas
- [ ] Alertas configuradas en Sentry
- [ ] Revisar patrones de uso
- [ ] Validar costos en AWS

---

## 📋 Checklist de Pre-Deployment

Antes de hacer deploy de cualquier Lambda/API Route:

```markdown
## Code Quality
- [ ] TypeScript strict mode habilitado
- [ ] Sin errores de ESLint
- [ ] Sin console.log de debugging
- [ ] Comentarios JSDoc en funciones principales

## Functionality
- [ ] Validación de todos los inputs
- [ ] Manejo de errores completo (try-catch)
- [ ] Respuestas consistentes (success/error format)
- [ ] Códigos HTTP correctos (200, 400, 404, 500)

## Performance
- [ ] Clientes AWS inicializados fuera del handler
- [ ] Timeout configurado apropiadamente
- [ ] Cache-Control headers si aplica
- [ ] Operaciones paralelas cuando sea posible

## Security
- [ ] Input sanitization
- [ ] No exponer secrets en logs
- [ ] Rate limiting (si es endpoint público)
- [ ] CORS configurado correctamente

## Monitoring
- [ ] Logging estructurado (JSON)
- [ ] RequestId en todos los logs
- [ ] Sentry.captureException en catch blocks
- [ ] Breadcrumbs de Sentry para flujo importante

## Testing
- [ ] Tests locales ejecutados (`npm run dev`)
- [ ] Smoke test con curl/Postman
- [ ] Edge cases validados (query vacío, idioma inválido, etc.)
- [ ] Tests de carga si es crítico

## Documentation
- [ ] README actualizado si hay cambios de API
- [ ] Comentarios en código complejo
- [ ] Variables de entorno documentadas en .env.example
```

---

## 📚 Recursos Adicionales

### Next.js API Routes
- [Route Handlers Docs](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)

### AWS SDK v3
- [DynamoDB Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/)
- [CloudWatch Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch/)

### Monitoring
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)

---

## 🔄 Versioning

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-11-19 | Documento inicial |

---

**Autor:** Equipo SuplementIA
**Última Actualización:** 19 de noviembre de 2025

---

**FIN DEL DOCUMENTO**
