# Fix para Error 500 en Backend

## Problema Identificado

El error 500 ocurre porque:

1. ✅ Frontend funciona correctamente (404s eliminados)
2. ❌ Backend `/api/portal/recommend` usa `job-store` 
3. ❌ `job-store` depende de memoria en servidor (no funciona en serverless)
4. ❌ Cada request va a una instancia diferente en Vercel

## Solución Inmediata

Deshabilitar `job-store` en el endpoint de recommend para que funcione sin estado en servidor.

## Cambios Necesarios

### 1. Modificar `/api/portal/recommend/route.ts`

Eliminar todas las llamadas a `job-store`:
- `createJob()`
- `markTimeout()`
- `createRetryJob()`
- `hasExceededRetryLimit()`
- `getJob()`

### 2. Usar DynamoDB para estado (opcional, largo plazo)

Si necesitas tracking de jobs, usa DynamoDB en lugar de memoria local.

## Fix Rápido

Comentar las líneas de job-store y retornar directamente la recomendación.
