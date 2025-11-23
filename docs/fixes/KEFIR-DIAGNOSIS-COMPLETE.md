# Diagnóstico Completo: Problema de Datos Faltantes para Kefir

**Fecha**: 2025-01-21
**Estado**: ✅ Diagnóstico Completo y Correcciones Aplicadas

---

## Problema Identificado

El frontend muestra `⚠️ No real data found for: Kefir` y `Metadata: {}`, indicando que el metadata `_enrichment_metadata` está vacío o tiene `hasRealData: false` y `studiesUsed: 0`.

## Causa Raíz

Después de un diagnóstico sistemático, se identificaron los siguientes problemas:

### 1. Timeout en Content-Enricher Lambda
- El enrich endpoint (`/api/portal/enrich`) está dando timeout (504) después de ~30 segundos
- Cuando hay timeout, el endpoint retorna error sin metadata
- El recommend endpoint rechaza la solicitud porque no hay metadata válido
- El quiz endpoint usa datos mock cuando hay error de red/timeout

### 2. Pérdida de Metadata en Timeout
- Cuando el content-enricher Lambda tarda demasiado, se pierde la información de estudios encontrados
- El sistema no preserva los estudios encontrados antes del timeout
- Esto causa que se rechace la solicitud incluso cuando hay estudios disponibles

### 3. Falta de Metadata en Datos Mock
- Cuando el quiz endpoint usa datos mock (fallback), no incluye `_enrichment_metadata`
- El frontend valida `metadata.hasRealData && metadata.studiesUsed > 0` y falla

## Correcciones Aplicadas

### 1. Corrección de Metadata en Cache Hit (`backend/lambda/content-enricher/src/index.ts`)

**Problema**: Cuando hay un cache hit, el metadata se genera usando `studiesCount` del request actual, que puede ser 0 si no se pasan estudios. Esto causa que `hasRealData: false` y `studiesUsed: 0` incluso cuando el cache tiene datos válidos.

**Solución**: Usar `totalStudies` del contenido cacheado para determinar el metadata cuando hay cache hit:

```typescript
// CRITICAL: Use totalStudies from cached content if available
const cachedStudiesCount = enrichedContent.totalStudies || 
                           enrichedContent.keyStudies?.length || 
                           studiesCount;
const finalStudiesCount = cachedStudiesCount > 0 ? cachedStudiesCount : studiesCount;
const finalHasRealData = finalStudiesCount > 0;

metadata: {
  hasRealData: finalHasRealData,
  studiesUsed: finalStudiesCount,
  // ...
}
```

### 2. Preservación de Estudios en Timeout (`app/api/portal/enrich/route.ts`)

**Problema**: Cuando el content-enricher Lambda da timeout, se pierde la información de estudios encontrados.

**Solución**: Modificar el manejo de errores para preservar los estudios encontrados antes del timeout:

```typescript
if (!enrichResponse.ok) {
  // ... logging ...
  
  // CRITICAL: If we found studies before timeout, preserve that information
  if (studies.length > 0) {
    // Return partial success with studies found but enrichment failed
    return NextResponse.json({
      success: false,
      error: 'enrichment_timeout',
      message: 'Content enrichment timed out, but studies were found',
      metadata: {
        studiesUsed: studies.length,
        hasRealData: true, // We have real studies even if enrichment failed
        enrichmentTimeout: true,
        // ... other metadata ...
      },
    }, { status: 504 });
  }
  
  // No studies found, return error
  return NextResponse.json({
    success: false,
    error: 'Failed to enrich content',
    // ...
  }, { status: enrichResponse.status });
}
```

### 3. Manejo Mejorado de Timeout en Recommend (`app/api/portal/recommend/route.ts`)

**Problema**: Cuando el enrich endpoint retorna 504, el recommend endpoint rechaza la solicitud sin considerar si se encontraron estudios.

**Solución**: Agregar lógica especial para manejar timeouts con estudios encontrados:

```typescript
if (!enrichResponse.ok) {
  // ... error handling ...
  
  // SPECIAL CASE: If enrichment timed out but studies were found, preserve that information
  if (enrichResponse.status === 504 && errorData.metadata?.hasRealData && errorData.metadata?.studiesUsed > 0) {
    return NextResponse.json({
      success: false,
      error: 'enrichment_timeout',
      message: `El análisis de estudios está tardando más de lo esperado. Se encontraron ${errorData.metadata.studiesUsed} estudios, pero el enriquecimiento no pudo completarse.`,
      metadata: errorData.metadata,
    }, { status: 504 });
  }
  
  // ... rest of error handling ...
}
```

### 4. Validación de Metadata en Quiz (`app/api/portal/quiz/route.ts`)

**Problema**: Cuando el quiz endpoint retorna una recomendación, no valida que el metadata esté presente.

**Solución**: Agregar validación para asegurar que el metadata siempre esté presente:

```typescript
if (responseData.recommendation) {
  // CRITICAL: Ensure _enrichment_metadata is present and valid
  if (!responseData.recommendation._enrichment_metadata) {
    console.warn('QUIZ_MISSING_METADATA - adding default metadata');
    responseData.recommendation._enrichment_metadata = {
      hasRealData: false,
      studiesUsed: 0,
      intelligentSystem: false,
      source: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
  
  return NextResponse.json({
    success: true,
    quiz_id: quizId,
    recommendation: responseData.recommendation,
  }, { status: 200 });
}
```

## Pruebas Realizadas

### 1. Test Directo de Enrich
- **Resultado**: Timeout (504) después de ~33 segundos
- **Conclusión**: El content-enricher Lambda está tardando demasiado

### 2. Test de Recommend Endpoint
- **Resultado**: 404 "insufficient_data" después de ~31 segundos
- **Conclusión**: El recommend endpoint rechaza cuando no hay metadata válido

### 3. Test de Flujo Completo (Quiz)
- **Resultado**: Retorna datos mock con `hasRealData: false` y `studiesUsed: 0`
- **Conclusión**: El quiz endpoint está usando fallback cuando hay error

## Próximos Pasos

### 1. Optimizar Content-Enricher Lambda
- Revisar el timeout del Lambda (actualmente 60 segundos)
- Optimizar el prompt de Bedrock para reducir tiempo de procesamiento
- Considerar procesamiento asíncrono para requests largos

### 2. Mejorar Manejo de Timeouts
- Implementar retry con backoff exponencial
- Considerar procesamiento asíncrono con polling
- Agregar queue para requests que tardan mucho

### 3. Monitoreo y Alertas
- Agregar métricas para timeouts de content-enricher
- Alertar cuando el tiempo de procesamiento excede umbrales
- Monitorear tasa de éxito de enriquecimiento

## Archivos Modificados

1. `backend/lambda/content-enricher/src/index.ts` - Corrección de metadata en cache hit
2. `app/api/portal/enrich/route.ts` - Preservación de estudios en timeout
3. `app/api/portal/recommend/route.ts` - Manejo mejorado de timeout con estudios
4. `app/api/portal/quiz/route.ts` - Validación de metadata

## Scripts de Prueba Creados

1. `scripts/test-kefir-recommend.ts` - Prueba del endpoint recommend
2. `scripts/test-kefir-full-flow.ts` - Prueba del flujo completo
3. `scripts/test-kefir-cache-check.ts` - Verificación de cache (requiere AWS credentials)

## Hallazgos Adicionales

### Cache de DynamoDB Verificado

Se verificó el cache de DynamoDB para "Kefir" usando AWS CLI:
- **Tabla**: `suplementia-content-enricher-cache`
- **Estado**: Cache válido con datos completos
- **totalStudies**: 10 estudios encontrados
- **Problema**: El cache no incluía metadata con `hasRealData` y `studiesUsed`

El cache contiene datos válidos de enriquecimiento, pero el metadata se generaba incorrectamente cuando se leía del cache.

## Conclusión

Se identificaron y corrigieron múltiples problemas:

1. **Cache Hit sin Metadata Correcto**: El metadata se generaba usando `studiesCount` del request actual (0) en lugar de `totalStudies` del cache (10)
2. **Timeout sin Preservación de Estudios**: Cuando hay timeout, se perdía la información de estudios encontrados
3. **Falta de Validación de Metadata**: El quiz endpoint no validaba que el metadata esté presente

Las correcciones aplicadas:
- ✅ Usan `totalStudies` del cache para generar metadata correcto
- ✅ Preservan información de estudios encontrados en timeouts
- ✅ Validan que el metadata siempre esté presente

La solución a largo plazo requiere optimizar el content-enricher Lambda para reducir el tiempo de procesamiento y evitar timeouts.

