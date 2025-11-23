# Próximos Pasos - Fix Enrich Endpoint

## Resumen del Problema

El endpoint `/api/portal/enrich` está fallando con errores de TDZ (Temporal Dead Zone):
1. Primero: "Cannot access 'P' before initialization" (process.env)
2. Después del fix: "Cannot access 'F' before initialization" (desconocido)

## Lo Que Hemos Intentado

### ✅ Fixes Aplicados
1. Agregado import de `randomUUID` from 'crypto'
2. Cambiado a generador de UUID custom (sin crypto)
3. Movido `process.env` accesses a funciones getter
4. Cambiado runtime a 'nodejs' explícitamente

### ❌ Resultado
El error persiste, ahora con 'F' en lugar de 'P'

## Análisis

El problema parece ser más profundo que simples imports. Posibles causas:

### 1. Dependencias con TDZ
Alguna de las librerías importadas podría tener código a nivel de módulo que causa TDZ:
- `@/lib/services/abbreviation-expander`
- `@/lib/cache/simple-cache`
- `@/lib/resilience/timeout-manager`
- `@/lib/resilience/rate-limiter`

### 2. Vercel Build Process
El bundler de Vercel podría estar reordenando código de manera que causa TDZ

### 3. Next.js Edge Runtime Issues
Aunque cambiamos a nodejs runtime, el error persiste

## Estrategia Recomendada

### Opción A: Simplificar el Endpoint (RÁPIDO)
Crear una versión mínima del endpoint sin dependencias complejas:

```typescript
// app/api/portal/enrich-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplementName } = body;
    
    // Call Lambda directly without complex dependencies
    const response = await fetch(
      process.env.STUDIES_API_URL || 'https://...',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementName }),
      }
    );
    
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### Opción B: Investigar Dependencias (LENTO)
1. Comentar todas las importaciones de `@/lib/*`
2. Agregar una por una hasta encontrar la que causa el problema
3. Fix la dependencia problemática

### Opción C: Usar API Route Handler Diferente (MEDIO)
Mover la lógica a un serverless function separado:
```
/api/enrich-v3/route.ts  (nuevo, sin dependencias complejas)
```

### Opción D: Debug en Producción (RÁPIDO)
Agregar logging extensivo para identificar exactamente dónde falla:

```typescript
export async function POST(request: NextRequest) {
  console.log('1. Function started');
  
  try {
    console.log('2. Before imports check');
    const body = await request.json();
    console.log('3. Body parsed', body);
    
    // ... más logging
  } catch (error) {
    console.log('ERROR AT:', error.stack);
    return NextResponse.json({ error: error.message, stack: error.stack });
  }
}
```

## Recomendación Inmediata

**Crear `/api/portal/enrich-v2/route.ts`** con implementación mínima:
- Sin dependencias de `@/lib/*`
- Sin rate limiting (por ahora)
- Sin caching complejo (por ahora)
- Solo la lógica esencial: fetch studies → fetch enrichment → return

Esto nos permitirá:
1. Tener un endpoint funcionando AHORA
2. Identificar si el problema es con las dependencias
3. Migrar gradualmente features una por una

## Código Sugerido para enrich-v2

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { supplementName, maxStudies = 10 } = body;
    
    if (!supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName required' },
        { status: 400 }
      );
    }
    
    // Step 1: Fetch studies
    const studiesUrl = process.env.STUDIES_API_URL || 
      'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
    
    const studiesResponse = await fetch(studiesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName,
        maxResults: maxStudies,
        rctOnly: false,
        yearFrom: 2010,
      }),
    });
    
    if (!studiesResponse.ok) {
      throw new Error(`Studies fetch failed: ${studiesResponse.status}`);
    }
    
    const studiesData = await studiesResponse.json();
    
    if (!studiesData.studies || studiesData.studies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: `No encontramos estudios para "${supplementName}"`,
        },
        { status: 404 }
      );
    }
    
    // Step 2: Enrich with Claude
    const enricherUrl = process.env.ENRICHER_API_URL ||
      'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
    
    const enrichResponse = await fetch(enricherUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementId: supplementName,
        studies: studiesData.studies,
      }),
    });
    
    if (!enrichResponse.ok) {
      throw new Error(`Enrichment failed: ${enrichResponse.status}`);
    }
    
    const enrichedData = await enrichResponse.json();
    
    return NextResponse.json({
      success: true,
      ...enrichedData,
      requestId,
    });
    
  } catch (error: any) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        requestId,
      },
      { status: 500 }
    );
  }
}
```

## Acción Inmediata

¿Quieres que cree el endpoint `enrich-v2` con la implementación mínima?
Esto nos permitirá tener algo funcionando mientras investigamos el problema con el endpoint original.
