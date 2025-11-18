# Implementación de Procesamiento Asíncrono

## Resumen

Se ha implementado el patrón de procesamiento asíncrono (Opción 1) para resolver el problema de timeout (504). El sistema ahora:

1. **Retorna inmediatamente** con un `recommendation_id` (202 Accepted)
2. **Procesa en background** sin bloqueo
3. **Permite polling** del estado desde el frontend
4. **Actualiza progreso** en tiempo real

---

## Cambios en el Backend

### 1. Endpoint `/portal/recommend` (POST)
- **Antes**: Procesaba sincrónicamente y retornaba la recomendación completa
- **Ahora**: 
  - Crea `recommendation_id` inmediatamente
  - Guarda estado inicial en DynamoDB (`status: 'processing'`)
  - Inicia procesamiento asíncrono (self-invoke)
  - Retorna `202 Accepted` con `recommendation_id` y `statusUrl`

### 2. Nuevo Endpoint `/portal/status/{recommendation_id}` (GET)
- Permite consultar el estado de una recomendación
- Retorna:
  - `status: 'processing'` con `progress` y `progressMessage`
  - `status: 'completed'` con la recomendación completa
  - `status: 'failed'` con detalles del error

### 3. Función `processPortalRecommendationAsync`
- Procesa la recomendación en background
- Actualiza progreso en DynamoDB durante el procesamiento
- Guarda resultado final cuando completa
- Maneja errores y actualiza estado a `failed` si falla

### 4. Función `_updatePortalProgress`
- Actualiza progreso sin sobrescribir otros campos
- Usa `UpdateCommand` para preservar `quiz_id`, `category`, etc.

---

## Cambios en el Frontend

### 1. API Route `/api/portal/quiz` (POST)
- **Antes**: Esperaba respuesta completa (timeout 30s)
- **Ahora**: 
  - Timeout reducido a 5s (debe retornar rápidamente)
  - Maneja respuesta `202` con `recommendation_id`
  - Retorna `recommendation_id` al frontend para polling

### 2. Nuevo API Route `/api/portal/status/[id]` (GET)
- Proxy al backend para consultar estado
- Retorna estado actual de la recomendación

### 3. Página `/portal/results`
- **Antes**: Esperaba recomendación completa
- **Ahora**:
  - Detecta respuesta `202` y `recommendation_id`
  - Inicia polling automático cada 3 segundos
  - Muestra mensaje de progreso mejorado
  - Actualiza UI cuando la recomendación está lista
  - Maneja timeouts y errores

---

## Flujo Completo

```
1. Usuario busca "magnesio"
   ↓
2. Frontend → POST /api/portal/quiz
   ↓
3. Next.js API → POST /portal/recommend (Lambda)
   ↓
4. Lambda:
   - Crea recommendation_id
   - Guarda estado inicial en DynamoDB
   - Self-invoke asíncrono
   - Retorna 202 con recommendation_id
   ↓
5. Frontend recibe 202 + recommendation_id
   ↓
6. Frontend inicia polling:
   - GET /api/portal/status/{recommendation_id} cada 3s
   ↓
7. Lambda procesa en background:
   - Actualiza progreso (10%, 30%, 70%, 90%)
   - Genera recomendación
   - Guarda resultado en DynamoDB
   ↓
8. Polling detecta status: 'completed'
   ↓
9. Frontend muestra recomendación completa
```

---

## Ventajas

✅ **No más timeouts**: El API Gateway no espera más de 5 segundos
✅ **Mejor UX**: El usuario ve progreso en tiempo real
✅ **Escalable**: Puede procesar múltiples recomendaciones simultáneamente
✅ **Resiliente**: Si falla, el estado se guarda y puede reintentarse
✅ **Backward compatible**: Sigue soportando el patrón síncrono legacy

---

## Próximos Pasos

1. ✅ Desplegar backend con cambios
2. ⏳ Probar flujo completo end-to-end
3. ⏳ Verificar que no hay timeouts
4. ⏳ Validar que el polling funciona correctamente
5. ⏳ Optimizar intervalos de polling si es necesario

---

## Notas Técnicas

- **Polling interval**: 3 segundos (configurable)
- **Max polling time**: 3 minutos
- **Progreso**: 10% → 30% → 70% → 90% → 100%
- **DynamoDB**: Usa tabla `ankosoft-portal-recommendations-staging`
- **Self-invoke**: Usa `InvokeCommand` con `InvocationType: 'Event'`

