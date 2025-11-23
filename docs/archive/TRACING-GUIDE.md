# Guía de Trazabilidad con CloudWatch y X-Ray

Esta guía explica cómo usar CloudWatch Logs y AWS X-Ray para rastrear y depurar búsquedas de ingredientes en el sistema Suplementia.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Flujo del Sistema](#flujo-del-sistema)
3. [Usando los Scripts de Trazabilidad](#usando-los-scripts-de-trazabilidad)
4. [Consultando CloudWatch Logs Manualmente](#consultando-cloudwatch-logs-manualmente)
5. [Consultando X-Ray Traces Manualmente](#consultando-x-ray-traces-manualmente)
6. [Interpretación de Resultados](#interpretación-de-resultados)
7. [Problemas Comunes](#problemas-comunes)

## Visión General

El sistema de trazabilidad está diseñado para rastrear una búsqueda completa desde el frontend hasta las Lambdas de AWS, pasando por:

1. **Frontend** → Búsqueda de usuario (ej: "jengibre")
2. **API Route `/api/portal/quiz`** → Recibe query y llama a recommend
3. **API Route `/api/portal/recommend`** → Llama a enrich
4. **API Route `/api/portal/enrich`** → Orquesta las Lambdas
5. **Lambda `studies-fetcher`** → Busca estudios en PubMed
6. **Lambda `content-enricher`** → Enriquece contenido con Claude/Bedrock

Cada paso genera logs estructurados y traces de X-Ray que pueden ser consultados.

## Flujo del Sistema

```
Usuario busca "jengibre"
    ↓
Frontend normaliza → "jengibre"
    ↓
/api/portal/quiz
    ↓
/api/portal/recommend
    ↓
/api/portal/enrich
    ├─ Traduce: "jengibre" → "ginger"
    ├─ Llama a studies-fetcher Lambda
    │   └─ Busca en PubMed con "ginger"
    └─ Llama a content-enricher Lambda
        └─ Enriquece con estudios encontrados
```

## Usando los Scripts de Trazabilidad

### Script Completo (Recomendado)

El script `trace-full-flow.sh` ejecuta ambos scripts y genera un reporte consolidado:

```bash
# Buscar por término
./scripts/trace-full-flow.sh "jengibre"

# Buscar por término con rango de tiempo personalizado
./scripts/trace-full-flow.sh "jengibre" --hours 48

# Buscar por requestId (más preciso)
./scripts/trace-full-flow.sh --requestId "abc-123-def-456"
```

El script genera:
- `trace-reports/<term>-<timestamp>/cloudwatch-report.md`
- `trace-reports/<term>-<timestamp>/xray-report.md`
- `trace-reports/<term>-<timestamp>/consolidated-report.md`

### Scripts Individuales

#### CloudWatch Logs

```bash
# Buscar por término
npx tsx scripts/trace-search-cloudwatch.ts "jengibre"

# Buscar por requestId
npx tsx scripts/trace-search-cloudwatch.ts --requestId "abc-123"

# Con rango de tiempo personalizado
npx tsx scripts/trace-search-cloudwatch.ts "jengibre" --hours 48
```

#### X-Ray Traces

```bash
# Buscar por término
npx tsx scripts/trace-search-xray.ts "jengibre"

# Buscar por requestId
npx tsx scripts/trace-search-xray.ts --requestId "abc-123"

# Con rango de tiempo personalizado
npx tsx scripts/trace-search-xray.ts "jengibre" --hours 48
```

## Consultando CloudWatch Logs Manualmente

### En la Consola de AWS

1. Ve a [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups)
2. Selecciona un log group:
   - `/aws/lambda/suplementia-studies-fetcher-dev`
   - `/aws/lambda/suplementia-content-enricher-dev`
3. Usa el filtro de búsqueda con:
   - Término: `"jengibre"` o `"ginger"`
   - Request ID: `"abc-123"`
   - Event: `"STUDIES_FETCH"` o `"CONTENT_ENRICH"`

### Usando AWS CLI

```bash
# Buscar en studies-fetcher
aws logs filter-log-events \
  --log-group-name /aws/lambda/suplementia-studies-fetcher-dev \
  --filter-pattern "jengibre" \
  --start-time $(date -u -d '24 hours ago' +%s)000

# Buscar por requestId
aws logs filter-log-events \
  --log-group-name /aws/lambda/suplementia-content-enricher-dev \
  --filter-pattern "abc-123" \
  --start-time $(date -u -d '24 hours ago' +%s)000
```

### Eventos Clave a Buscar

En CloudWatch Logs, busca estos eventos estructurados:

- `ORCHESTRATION_START` - Inicio del proceso de enriquecimiento
- `QUERY_TRANSLATION_START` - Inicio de traducción de query
- `QUERY_TRANSLATED` - Query traducida (ej: "jengibre" → "ginger")
- `STUDIES_FETCH_START` - Inicio de búsqueda de estudios
- `STUDIES_FETCH_ATTEMPT` - Intento de búsqueda (1, 2, o 3)
- `STUDIES_FETCHED` - Estudios encontrados
- `STUDIES_FETCH_FAILED` - No se encontraron estudios
- `CONTENT_ENRICH_START` - Inicio de enriquecimiento
- `CONTENT_ENRICH_SUCCESS` - Enriquecimiento exitoso
- `CONTENT_ENRICH_ERROR` - Error en enriquecimiento
- `ORCHESTRATION_SUCCESS` - Proceso completo exitoso
- `ORCHESTRATION_ERROR` - Error en el proceso completo

## Consultando X-Ray Traces Manualmente

### En la Consola de AWS

1. Ve a [X-Ray Console](https://console.aws.amazon.com/xray/home?region=us-east-1#/traces)
2. Usa el filtro de búsqueda con:
   - Annotation: `supplementName = "jengibre"`
   - Annotation: `requestId = "abc-123"`
   - Annotation: `module = "studies-fetcher"`

### Usando AWS CLI

```bash
# Buscar traces por supplementName
aws xray get-trace-summaries \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'annotation.supplementName = "jengibre"'

# Obtener detalles de un trace específico
aws xray batch-get-traces \
  --trace-ids "1-abc-123-def-456"
```

### Annotations Clave en X-Ray

Cada Lambda agrega annotations a los traces:

**studies-fetcher:**
- `module`: "studies-fetcher"
- `supplementName`: Nombre del suplemento buscado
- `searchQuery`: Query usado para buscar
- `studiesFound`: Número de estudios encontrados
- `success`: true/false
- `duration`: Duración en ms

**content-enricher:**
- `module`: "content-enricher"
- `supplementId`: ID del suplemento
- `studiesProvided`: Número de estudios recibidos
- `hasRealData`: true/false
- `success`: true/false
- `cacheHit`: true/false

## Interpretación de Resultados

### Timeline Normal

Un flujo exitoso debería verse así:

1. `ORCHESTRATION_START` - 0ms
2. `QUERY_TRANSLATION_START` - ~10ms
3. `QUERY_TRANSLATED` - ~50ms (si hay traducción)
4. `STUDIES_FETCH_START` - ~100ms
5. `STUDIES_FETCH_ATTEMPT` (attempt 1) - ~150ms
6. `STUDIES_FETCHED` - ~2000ms (depende de PubMed)
7. `CONTENT_ENRICH_START` - ~2050ms
8. `CONTENT_ENRICH_SUCCESS` - ~15000ms (depende de Bedrock)
9. `ORCHESTRATION_SUCCESS` - ~15050ms

### Indicadores de Problemas

**No se encuentran estudios:**
- `STUDIES_FETCH_ATTEMPT` aparece 3 veces
- `STUDIES_FETCH_FAILED` al final
- `studiesFound: 0` en todos los intentos

**Traducción fallida:**
- `QUERY_TRANSLATION_FAILED` aparece
- `translatedQuery` es igual a `originalQuery`
- Búsqueda en PubMed puede fallar si el término está en español

**Timeout:**
- `ORCHESTRATION_ERROR` con mensaje de timeout
- Último evento es `CONTENT_ENRICH_START` sin `CONTENT_ENRICH_SUCCESS`
- Duración total > 120 segundos

**No hay datos reales:**
- `STUDIES_FETCHED` muestra `studiesFound > 0`
- Pero `hasRealData: false` en metadata final
- Posible problema en content-enricher

## Problemas Comunes

### Problema: "No real data found for: Jengibre"

**Síntomas:**
- Frontend muestra warning: "⚠️ No real data found for: Jengibre"
- Metadata muestra `hasRealData: false`

**Diagnóstico:**

1. **Verificar traducción:**
   ```bash
   # Buscar en CloudWatch logs
   npx tsx scripts/trace-search-cloudwatch.ts "jengibre"
   # Buscar evento QUERY_TRANSLATED
   # Verificar que "jengibre" → "ginger"
   ```

2. **Verificar búsqueda de estudios:**
   ```bash
   # Buscar eventos STUDIES_FETCH
   # Verificar que studiesFound > 0
   ```

3. **Verificar enriquecimiento:**
   ```bash
   # Buscar eventos CONTENT_ENRICH
   # Verificar que recibió los estudios
   ```

**Soluciones:**

- Si no hay traducción: Verificar que "jengibre" está en `COMMON_ABBREVIATIONS` en `app/api/portal/enrich/route.ts`
- Si no se encuentran estudios: Verificar que PubMed tiene estudios para "ginger"
- Si hay estudios pero no datos reales: Verificar que content-enricher recibió los estudios

### Problema: Timeout en Enriquecimiento

**Síntomas:**
- Request tarda > 120 segundos
- Error de timeout

**Diagnóstico:**

1. **Verificar X-Ray traces:**
   ```bash
   npx tsx scripts/trace-search-xray.ts "jengibre"
   # Buscar segmentos lentos
   # Verificar duración de Bedrock calls
   ```

2. **Verificar CloudWatch logs:**
   ```bash
   # Buscar eventos CONTENT_ENRICH
   # Verificar bedrockDuration
   ```

**Soluciones:**

- Aumentar timeout en `app/api/portal/enrich/route.ts` (maxDuration)
- Optimizar prompt de Bedrock
- Reducir número de estudios enviados a Bedrock

### Problema: Error en Lambda

**Síntomas:**
- Error 500 en respuesta
- `ORCHESTRATION_ERROR` en logs

**Diagnóstico:**

1. **Verificar CloudWatch logs del Lambda específico:**
   ```bash
   # Buscar en log group del Lambda
   aws logs tail /aws/lambda/suplementia-studies-fetcher-dev --follow
   ```

2. **Verificar X-Ray traces:**
   ```bash
   # Buscar segmentos con error: true
   ```

**Soluciones:**

- Revisar stack trace en logs
- Verificar variables de entorno del Lambda
- Verificar permisos IAM del Lambda

## Queries Útiles de X-Ray

### Buscar búsquedas fallidas

```sql
annotation.module = "studies-fetcher" AND annotation.studiesFound = 0
```

### Buscar búsquedas exitosas

```sql
annotation.module = "studies-fetcher" AND annotation.studiesFound > 0
```

### Buscar enriquecimientos lentos

```sql
annotation.module = "content-enricher" AND duration > 30000
```

### Buscar errores

```sql
error = true
```

### Buscar por suplemento específico

```sql
annotation.supplementName = "jengibre"
```

## Próximos Pasos

Después de identificar el problema:

1. **Documentar el issue** con:
   - Request ID o Correlation ID
   - Timestamp del error
   - Logs relevantes
   - X-Ray trace ID

2. **Crear fix** basado en los logs

3. **Verificar fix** ejecutando el trace nuevamente

4. **Monitorear** para asegurar que el problema no vuelva a ocurrir

## Recursos Adicionales

- [AWS CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)
- [X-Ray Filter Expression Syntax](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html)

