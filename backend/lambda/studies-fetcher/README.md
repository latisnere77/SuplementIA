# Studies Fetcher Lambda

**Fetch real scientific studies from PubMed for supplements**

Este módulo Lambda busca y recupera estudios científicos reales desde PubMed usando E-utilities API. Todos los estudios son verificables y provienen de fuentes públicas peer-reviewed.

## Características

- ✅ **Búsqueda en PubMed**: Integración completa con E-utilities API
- ✅ **Estudios verificables**: Todos los estudios incluyen PMID y URL a PubMed
- ✅ **Filtros avanzados**: Por tipo de estudio, año, estudios humanos
- ✅ **Extracción inteligente**: Conteo automático de participantes desde abstracts
- ✅ **Rate limiting**: Respeta límites de PubMed (3 req/s sin key, 10 req/s con key)
- ✅ **X-Ray tracing**: Monitoreo completo con AWS X-Ray
- ✅ **Caché opcional**: Integración con Cache Service
- ✅ **Validación robusta**: Validación de requests y error handling
- ✅ **Tests >80%**: Cobertura completa de código

## Arquitectura

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
         v
┌─────────────────┐      ┌──────────────┐
│ Studies Fetcher │─────>│ PubMed API   │
│     Lambda      │      │ (E-utilities) │
└────────┬────────┘      └──────────────┘
         │
         v (opcional)
┌─────────────────┐
│  Cache Service  │
└─────────────────┘
```

## API Reference

### POST /studies/search

Busca estudios científicos sobre un suplemento.

**Request:**

```json
{
  "supplementName": "Vitamin D",
  "maxResults": 10,
  "filters": {
    "rctOnly": true,
    "yearFrom": 2020,
    "yearTo": 2024,
    "humanStudiesOnly": true,
    "studyTypes": [
      "randomized controlled trial",
      "meta-analysis",
      "systematic review"
    ]
  }
}
```

**Request Fields:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `supplementName` | string | Sí | Nombre del suplemento (1-200 caracteres) |
| `maxResults` | number | No | Máximo de resultados (1-100, default: 10) |
| `filters` | object | No | Filtros de búsqueda |
| `filters.rctOnly` | boolean | No | Solo ensayos controlados aleatorios |
| `filters.yearFrom` | number | No | Año inicial (ej. 2020) |
| `filters.yearTo` | number | No | Año final (ej. 2024) |
| `filters.humanStudiesOnly` | boolean | No | Solo estudios en humanos (default: true) |
| `filters.studyTypes` | array | No | Tipos de estudios específicos |

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "studies": [
      {
        "pmid": "12345678",
        "title": "Vitamin D and Bone Health: A Meta-Analysis",
        "abstract": "This meta-analysis examined...",
        "authors": ["Smith J", "Jones A", "Brown B"],
        "year": 2023,
        "journal": "Journal of Clinical Nutrition",
        "studyType": "meta-analysis",
        "participants": 5000,
        "doi": "10.1234/jcn.2023.12345",
        "pubmedUrl": "https://pubmed.ncbi.nlm.nih.gov/12345678/"
      }
    ],
    "totalFound": 1,
    "searchQuery": "Vitamin D"
  },
  "metadata": {
    "supplementName": "Vitamin D",
    "searchDuration": 1250,
    "source": "pubmed"
  }
}
```

**Study Object Fields:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pmid` | string | PubMed ID único (REQUERIDO) |
| `title` | string | Título del estudio |
| `abstract` | string | Abstract completo |
| `authors` | string[] | Primeros 5 autores |
| `year` | number | Año de publicación |
| `journal` | string | Nombre de la revista |
| `studyType` | string | Tipo: "randomized controlled trial", "meta-analysis", "systematic review", "clinical trial", "review" |
| `participants` | number | Número de participantes (extraído del abstract) |
| `doi` | string | Digital Object Identifier |
| `pubmedUrl` | string | URL directa a PubMed |

**Response (Error):**

```json
{
  "success": false,
  "error": "supplementName is required and must be a string",
  "message": "supplementName is required and must be a string"
}
```

**HTTP Status Codes:**

- `200` - Éxito
- `400` - Request inválido (validación falló)
- `405` - Método no permitido (solo POST)
- `500` - Error interno del servidor

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (opcional)
export PUBMED_API_KEY="your-api-key-here"
export CACHE_SERVICE_URL="https://cache.example.com"

# 3. Build
npm run build

# 4. Tests
npm test

# 5. Deploy
chmod +x deploy.sh
./deploy.sh dev
```

## Configuración

### Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `PUBMED_API_KEY` | No | - | API key de PubMed para rate limits más altos |
| `CACHE_SERVICE_URL` | No | - | URL del Cache Service para integración |
| `DEFAULT_MAX_RESULTS` | No | 10 | Máximo de resultados por defecto |
| `DEFAULT_YEAR_FROM` | No | 2010 | Año inicial por defecto |
| `XRAY_ENABLED` | No | true | Habilitar AWS X-Ray tracing |
| `LOG_LEVEL` | No | info | Nivel de logs (debug, info, warn, error) |

### PubMed API Key

**¿Por qué usar una API key?**

- **Sin key**: 3 requests/segundo
- **Con key**: 10 requests/segundo

**¿Cómo obtener una?**

1. Crear cuenta en https://www.ncbi.nlm.nih.gov/account/
2. Ir a Settings → API Key Management
3. Generar nueva API key
4. Configurar en `PUBMED_API_KEY`

## Desarrollo

### Estructura del Proyecto

```
studies-fetcher/
├── src/
│   ├── index.ts          # Lambda handler
│   ├── pubmed.ts         # Cliente PubMed E-utilities
│   ├── config.ts         # Configuración
│   └── types.ts          # Type definitions
├── tests/
│   ├── handler.test.ts   # Tests del handler
│   └── pubmed.test.ts    # Tests del cliente
├── template.yaml         # SAM template
├── deploy.sh            # Script de deploy
├── package.json
├── tsconfig.json
└── jest.config.js
```

### Scripts

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Test coverage
npm run test:coverage

# Lint
npm run lint

# Package para Lambda
npm run package

# Deploy a AWS
./deploy.sh [dev|staging|prod]
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# Specific test file
npm test handler.test.ts
```

**Cobertura esperada**: >80% en branches, functions, lines, statements

## PubMed E-utilities

Este módulo usa la API pública de PubMed E-utilities:

### ESearch

Busca PMIDs basado en query:

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term="Vitamin D"[Title/Abstract] AND "humans"[MeSH Terms]
  &retmax=10
  &retmode=json
```

### EFetch

Obtiene detalles de artículos:

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
  ?db=pubmed
  &id=12345678,87654321
  &retmode=xml
```

### Documentación Oficial

- https://www.ncbi.nlm.nih.gov/books/NBK25501/
- https://www.ncbi.nlm.nih.gov/books/NBK25499/

## Monitoreo y Debugging

### X-Ray Tracing

El módulo está completamente instrumentado con AWS X-Ray:

**Annotations:**
- `module`: "studies-fetcher"
- `supplementName`: nombre del suplemento
- `studiesFound`: número de estudios encontrados
- `success`: true/false
- `duration`: duración total en ms

**Subsegments:**
- `studies-fetcher`: segmento principal
- `pubmed-search`: búsqueda en PubMed

### CloudWatch Alarms

Se crean automáticamente 3 alarmas:

1. **Errors**: >5 errores en 5 minutos
2. **Throttles**: >3 throttles en 5 minutos
3. **Duration**: >25 segundos (promedio en 10 minutos)

### Queries X-Ray

```bash
# Ver todas las requests de Studies Fetcher
annotation.module = "studies-fetcher"

# Ver requests que fallaron
annotation.module = "studies-fetcher" AND annotation.success = false

# Ver requests lentas (>10s)
annotation.module = "studies-fetcher" AND duration > 10

# Ver búsquedas específicas
annotation.supplementName = "Vitamin D"
```

## Ejemplos de Uso

### Ejemplo 1: Búsqueda básica

```bash
curl -X POST https://api.example.com/studies/search \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "Vitamin D"
  }'
```

### Ejemplo 2: Solo RCTs recientes

```bash
curl -X POST https://api.example.com/studies/search \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "Omega-3",
    "maxResults": 20,
    "filters": {
      "rctOnly": true,
      "yearFrom": 2020
    }
  }'
```

### Ejemplo 3: Meta-análisis y revisiones sistemáticas

```bash
curl -X POST https://api.example.com/studies/search \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "Creatine",
    "maxResults": 15,
    "filters": {
      "studyTypes": [
        "meta-analysis",
        "systematic review"
      ],
      "yearFrom": 2018
    }
  }'
```

### Ejemplo 4: Con TypeScript/JavaScript

```typescript
async function fetchStudies(supplementName: string) {
  const response = await fetch('https://api.example.com/studies/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supplementName,
      maxResults: 10,
      filters: {
        rctOnly: true,
        humanStudiesOnly: true,
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log(`Found ${data.data.totalFound} studies`);
    data.data.studies.forEach((study) => {
      console.log(`- ${study.title} (${study.year})`);
      console.log(`  ${study.pubmedUrl}`);
    });
  } else {
    console.error('Error:', data.error);
  }
}

fetchStudies('Vitamin D');
```

## Integración con Cache Service

El módulo puede integrarse opcionalmente con Cache Service:

```typescript
// Si CACHE_SERVICE_URL está configurado
// Las búsquedas se guardan automáticamente en cache (fire-and-forget)

// Cache key format: studies-{supplementName-slugified}
// Ejemplo: "studies-vitamin-d"
```

**Beneficios del cache:**

- ⚡ Respuestas más rápidas en búsquedas repetidas
- 💰 Reduce llamadas a PubMed API
- 🔄 Cache automático con TTL de 30 días

**Nota**: El módulo funciona perfectamente SIN cache service (soft dependency).

## Seguridad y Privacidad

- ✅ **API pública**: PubMed E-utilities es 100% público y gratuito
- ✅ **Sin autenticación requerida**: API key es opcional (solo para rate limits)
- ✅ **CORS configurado**: Permite requests desde frontend
- ✅ **Validación estricta**: Todos los inputs son validados
- ✅ **Rate limiting**: Respeta límites de PubMed automáticamente
- ✅ **Sin datos sensibles**: No se almacena información personal

## Troubleshooting

### Error: "PubMed ESearch failed: 429"

**Causa**: Rate limit excedido

**Solución**:
1. Configurar `PUBMED_API_KEY` para límites más altos
2. Reducir frecuencia de requests
3. Implementar retry con exponential backoff

### Error: "No studies found"

**Causa**: Búsqueda demasiado específica o sin resultados

**Solución**:
1. Verificar nombre del suplemento (ej. "Vitamin D" vs "Cholecalciferol")
2. Ampliar rango de años
3. Quitar filtros restrictivos

### Error: "Invalid JSON in request body"

**Causa**: Body mal formado

**Solución**:
1. Verificar JSON válido
2. Usar `Content-Type: application/json` header
3. Verificar comillas y formato

### Timeout en Lambda

**Causa**: PubMed API lento o timeout muy corto

**Solución**:
1. Aumentar timeout en `template.yaml` (default: 30s)
2. Reducir `maxResults`
3. Verificar conectividad a PubMed

## Performance

### Benchmarks

- **Cold start**: ~800ms
- **Warm request**: ~1-3s (depende de PubMed)
- **Búsqueda 10 estudios**: ~2-4s
- **Con cache hit**: <100ms

### Optimizaciones

1. **ARM64 architecture**: ~20% más rápido y económico
2. **Rate limiting inteligente**: 350ms delay entre requests
3. **Cache integration**: Respuestas instantáneas para búsquedas repetidas
4. **Timeout configurado**: Evita requests eternos

## Costos Estimados

**PubMed API**: GRATIS (público)

**AWS Lambda** (us-east-1):
- Requests: $0.20 per 1M requests
- Compute: $0.0000133334 per GB-second (ARM64)
- Estimado: 512MB, 2s promedio = ~$0.000013 per request

**API Gateway**:
- $3.50 per million requests
- Estimado: ~$0.0000035 per request

**Total por request**: ~$0.000016 USD

**Con 100,000 requests/mes**: ~$1.60 USD

## Roadmap

- [ ] Support para múltiples fuentes (Cochrane, ClinicalTrials.gov)
- [ ] Paginación para resultados grandes
- [ ] Filtros adicionales (idioma, journal impact factor)
- [ ] Webhook notifications para nuevos estudios
- [ ] GraphQL API

## Licencia

MIT

## Contribuciones

Suplementia - Content Enrichment System

## Referencias

- [PubMed E-utilities Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/)
