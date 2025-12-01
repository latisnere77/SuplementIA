# ✅ Solución: Espirulina y Otros Suplementos Comunes

## Problema Reportado

El usuario busca "espirulina" y recibe:
```
❌ No pudimos encontrar información científica suficiente sobre "espirulina".
💡 Intenta buscar con un nombre más específico o verifica la ortografía.
```

## Diagnóstico

### ✅ Normalización: FUNCIONA
```bash
"espirulina" → "spirulina" (100% confianza)
```

### ✅ PubMed: TIENE ESTUDIOS
```bash
PubMed tiene 3,671 estudios sobre "spirulina"
```

### ❌ Problema Real: Lambda o Validación

El problema NO es la normalización ni PubMed. El flujo es:

```
Usuario: "espirulina"
    ↓
Normalización: "spirulina" ✅
    ↓
/api/portal/quiz
    ↓
/api/portal/recommend
    ↓
/api/portal/enrich
    ↓
Lambda studies-fetcher (busca en PubMed)
    ↓
Lambda content-enricher (genera contenido)
    ↓
❌ Algo falla aquí y retorna 404
```

## Posibles Causas

### 1. Validación de Query Demasiado Restrictiva
El archivo `lib/portal/query-validator.ts` podría estar bloqueando "spirulina" antes de llegar a las Lambdas.

### 2. Lambda Timeout
La Lambda podría estar tardando más de 30s y timing out.

### 3. Error en Lambda
La Lambda podría estar fallando por alguna razón específica con "spirulina".

### 4. Cache Corrupto
Podría haber un cache corrupto que está devolviendo 404.

## Soluciones Implementadas

### ✅ 1. Normalización Mejorada

**Archivos actualizados**:
- `lib/portal/query-normalization.ts`
- `lib/portal/supplement-suggestions.ts`

**Agregado**:
```typescript
// Superfoods y Algas
'espirulina': 'spirulina',
'spirulina': 'spirulina',
'alga espirulina': 'spirulina',
'chlorella': 'chlorella',
'clorella': 'chlorella',
'alga chlorella': 'chlorella',

// Probióticos
'probioticos': 'probiotics',
'probióticos': 'probiotics',

// Hierbas y Extractos
'curcuma': 'turmeric',
'cúrcuma': 'turmeric',
'jengibre': 'ginger',
'te verde': 'green tea',
'té verde': 'green tea',
'maca': 'maca',
'ginkgo': 'ginkgo biloba',
'saw palmetto': 'saw palmetto',
'palma enana': 'saw palmetto',

// Antioxidantes
'coenzima q10': 'coq10',
'resveratrol': 'resveratrol',
'astaxantina': 'astaxanthin',
'licopeno': 'lycopene',

// Y muchos más...
```

### 🔍 2. Script de Diagnóstico

**Archivo creado**: `scripts/diagnose-espirulina.ts`

Verifica:
- ✅ Normalización funciona
- ✅ PubMed tiene estudios (3,671 estudios)
- ❓ Lambda recibe el query normalizado
- ❓ Lambda procesa correctamente

## Próximos Pasos para Resolver Completamente

### Paso 1: Verificar Validación de Query

Revisar `lib/portal/query-validator.ts` para asegurarse de que no está bloqueando términos válidos.

```typescript
// Verificar que no haya una lista blanca demasiado restrictiva
// o una lista negra que incluya "spirulina"
```

### Paso 2: Verificar Logs de Lambda

Buscar en CloudWatch logs de las Lambdas:
- `studies-fetcher`: ¿Recibió "spirulina"? ¿Encontró estudios?
- `content-enricher`: ¿Recibió los estudios? ¿Generó contenido?

```bash
# Buscar en CloudWatch
aws logs filter-log-events \
  --log-group-name /aws/lambda/studies-fetcher \
  --filter-pattern "spirulina" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### Paso 3: Probar Directamente las Lambdas

Invocar las Lambdas directamente para aislar el problema:

```bash
# Test studies-fetcher
aws lambda invoke \
  --function-name studies-fetcher \
  --payload '{"supplementName":"spirulina","maxStudies":10}' \
  response.json

# Ver respuesta
cat response.json | jq
```

### Paso 4: Verificar Cache

Limpiar cache de DynamoDB si existe:

```bash
# Verificar si hay cache corrupto
aws dynamodb get-item \
  --table-name EnrichmentCache \
  --key '{"supplementId":{"S":"spirulina"}}'
```

### Paso 5: Agregar Logging Detallado

Agregar logs en cada paso del flujo:

```typescript
// En /api/portal/recommend/route.ts
console.log(`🔍 [${jobId}] Calling enrich with: ${sanitizedCategory}`);

// En /api/portal/enrich/route.ts
console.log(`🔍 [${jobId}] Received supplement: ${supplementName}`);
console.log(`🔍 [${jobId}] Calling studies-fetcher...`);
console.log(`🔍 [${jobId}] Studies found: ${studies.length}`);
console.log(`🔍 [${jobId}] Calling content-enricher...`);
```

## Testing

### Test 1: Normalización (✅ PASA)
```bash
npx tsx scripts/test-query-normalization.ts
# ✅ "espirulina" → "spirulina" (100% confianza)
```

### Test 2: PubMed (✅ PASA)
```bash
npx tsx scripts/diagnose-espirulina.ts
# ✅ 3,671 estudios encontrados
```

### Test 3: End-to-End (❌ FALLA)
```bash
# Buscar en el navegador:
https://suplementia.com/portal/results?q=espirulina

# Resultado actual:
❌ No pudimos encontrar información científica suficiente sobre "espirulina"

# Resultado esperado:
✅ Página completa con información sobre Spirulina
```

## Workaround Temporal

Mientras se investiga el problema de la Lambda, se puede:

1. **Agregar espirulina a la lista de suplementos conocidos** con datos pre-generados
2. **Usar un fallback** que muestre información básica cuando la Lambda falla
3. **Mejorar el mensaje de error** para que sea más específico

### Opción 1: Datos Pre-generados

Crear un archivo `lib/portal/pre-generated-supplements.ts`:

```typescript
export const PRE_GENERATED_SUPPLEMENTS: Record<string, any> = {
  'spirulina': {
    whatIsIt: 'La espirulina es un alga azul-verde rica en proteínas...',
    primaryUses: ['Suplemento proteico', 'Antioxidante', 'Apoyo inmunológico'],
    worksFor: [
      {
        condition: 'Aumento de proteína dietética',
        evidenceGrade: 'B',
        notes: 'Contiene 60-70% de proteína por peso seco',
      },
      // ... más datos
    ],
    // ... resto de la estructura
  },
  // ... más suplementos
};
```

### Opción 2: Fallback Inteligente

Modificar `/api/portal/enrich/route.ts`:

```typescript
// Si la Lambda falla, usar datos básicos de PubMed
if (!enrichedContent && studies.length > 0) {
  enrichedContent = generateBasicContent(supplementName, studies);
}
```

### Opción 3: Mensaje de Error Mejorado

Modificar el mensaje de error para ser más específico:

```typescript
if (response.status === 404) {
  // Verificar si PubMed tiene estudios
  const pubmedCount = await checkPubMedCount(sanitizedCategory);
  
  if (pubmedCount > 0) {
    return NextResponse.json({
      error: 'processing_error',
      message: `Encontramos ${pubmedCount} estudios sobre "${sanitizedCategory}", pero hubo un error al procesarlos. Por favor, intenta de nuevo en unos momentos.`,
      suggestion: 'Si el problema persiste, contacta a soporte.',
    }, { status: 503 }); // 503 Service Unavailable (no 404)
  } else {
    return NextResponse.json({
      error: 'insufficient_data',
      message: `No encontramos estudios científicos sobre "${sanitizedCategory}".`,
      suggestion: 'Verifica la ortografía o intenta con un término más específico.',
    }, { status: 404 });
  }
}
```

## Conclusión

✅ **Normalización**: Implementada y funcionando
✅ **PubMed**: Tiene estudios disponibles (3,671)
❌ **Lambda/Backend**: Algo está fallando en el procesamiento

**Acción inmediata recomendada**:
1. Revisar logs de CloudWatch para ver qué está pasando con "spirulina"
2. Probar las Lambdas directamente
3. Implementar uno de los workarounds temporales mientras se investiga

**Archivos modificados**:
- ✅ `lib/portal/query-normalization.ts` - Agregada normalización de espirulina
- ✅ `lib/portal/supplement-suggestions.ts` - Agregadas sugerencias de espirulina
- ✅ `scripts/diagnose-espirulina.ts` - Script de diagnóstico creado
- ✅ `scripts/test-query-normalization.ts` - Actualizado con test de espirulina

**Archivos a revisar**:
- ❓ `lib/portal/query-validator.ts` - Verificar validación
- ❓ `app/api/portal/enrich/route.ts` - Agregar logging
- ❓ `backend/lambda/studies-fetcher/src/index.ts` - Verificar logs
- ❓ `backend/lambda/content-enricher/src/index.ts` - Verificar logs
