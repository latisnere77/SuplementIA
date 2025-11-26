# Requirements Document: Frontend Error Display Fix

## Introduction

Este spec documenta la corrección del error 500 que ocurre durante el polling de estado de enriquecimiento cuando un job no existe en el store y el sistema intenta hacer un fetch directo que falla. El problema se manifiesta especialmente con búsquedas como "Yodo" donde el proceso llega al 64% y luego falla repetidamente.

## Glossary

- **Enrichment Status Endpoint**: El endpoint `/api/portal/enrichment-status/[id]` que permite al frontend hacer polling del estado de un job de enriquecimiento
- **Job Store**: Sistema en memoria que almacena el estado de los jobs de enriquecimiento asíncronos
- **Direct Fetch**: Cuando el endpoint de status no encuentra un job en el store, intenta hacer una llamada directa al endpoint `/api/portal/recommend`
- **Polling**: Proceso donde el frontend consulta repetidamente el estado de un job hasta que se completa o falla

## Requirements

### Requirement 1: Manejo Robusto de Jobs Faltantes

**User Story:** Como usuario buscando un suplemento, quiero que el sistema maneje correctamente los casos donde el job de enriquecimiento no existe en el store, para que reciba un mensaje de error claro en lugar de errores 500 repetidos.

#### Acceptance Criteria

1. WHEN el endpoint enrichment-status no encuentra un job en el store THEN el sistema SHALL verificar si el job expiró o nunca existió antes de intentar un direct fetch
2. WHEN un job ha expirado del store THEN el sistema SHALL retornar un error 410 (Gone) con un mensaje claro indicando que el proceso tomó demasiado tiempo
3. WHEN se intenta un direct fetch y este falla THEN el sistema SHALL capturar el error específico y retornar un mensaje apropiado al frontend
4. WHEN ocurren múltiples fallos consecutivos de polling THEN el frontend SHALL detener el polling después de 3 intentos fallidos
5. WHEN el sistema retorna un error 500 THEN el mensaje SHALL incluir detalles suficientes para debugging sin exponer información sensible

### Requirement 2: Mejora del Manejo de Timeouts

**User Story:** Como usuario, quiero que el sistema maneje correctamente los casos donde el enriquecimiento toma más tiempo del esperado, para que no vea errores confusos.

#### Acceptance Criteria

1. WHEN un proceso de enriquecimiento excede 30 segundos THEN el sistema SHALL cambiar automáticamente a modo asíncrono
2. WHEN el sistema está en modo asíncrono THEN el frontend SHALL mostrar un indicador de progreso apropiado
3. WHEN un job asíncrono excede 2 minutos THEN el sistema SHALL retornar un timeout error con sugerencia de reintentar
4. WHEN ocurre un timeout THEN el sistema SHALL limpiar el job del store para evitar memory leaks
5. WHEN el usuario reintenta después de un timeout THEN el sistema SHALL crear un nuevo job con un nuevo ID

### Requirement 3: Logging y Observabilidad Mejorada

**User Story:** Como desarrollador, quiero tener logs detallados de los fallos en el proceso de enriquecimiento, para poder diagnosticar y solucionar problemas rápidamente.

#### Acceptance Criteria

1. WHEN ocurre un error en enrichment-status THEN el sistema SHALL loggear el jobId, supplement name, error type y stack trace
2. WHEN un job no se encuentra en el store THEN el sistema SHALL loggear cuánto tiempo ha pasado desde la creación del job
3. WHEN un direct fetch falla THEN el sistema SHALL loggear la respuesta completa del endpoint recommend
4. WHEN el frontend hace polling THEN cada request SHALL incluir un correlation ID para tracking
5. WHEN se detecta un patrón de fallos repetidos THEN el sistema SHALL generar una alerta para investigación

### Requirement 4: Validación de Datos de Entrada

**User Story:** Como sistema, quiero validar que los datos de entrada para búsquedas de suplementos sean correctos, para evitar errores downstream en el proceso de enriquecimiento.

#### Acceptance Criteria

1. WHEN se recibe una búsqueda de suplemento THEN el sistema SHALL validar que el nombre no esté vacío
2. WHEN se normaliza un query THEN el sistema SHALL verificar que la normalización fue exitosa antes de proceder
3. WHEN un suplemento tiene caracteres especiales THEN el sistema SHALL sanitizarlos correctamente
4. WHEN la validación falla THEN el sistema SHALL retornar un error 400 con mensaje descriptivo
5. WHEN se detecta un query potencialmente problemático THEN el sistema SHALL loggear una advertencia

### Requirement 5: Mejora de Mensajes de Error al Usuario

**User Story:** Como usuario, quiero recibir mensajes de error claros y accionables cuando algo falla, para saber qué hacer a continuación.

#### Acceptance Criteria

1. WHEN ocurre un error 500 THEN el frontend SHALL mostrar un mensaje genérico amigable sin detalles técnicos
2. WHEN ocurre un error 404 (no data) THEN el frontend SHALL mostrar sugerencias de búsquedas alternativas
3. WHEN ocurre un timeout THEN el frontend SHALL ofrecer un botón para reintentar
4. WHEN ocurren múltiples errores consecutivos THEN el frontend SHALL sugerir contactar soporte
5. WHEN el sistema se recupera de un error THEN el frontend SHALL limpiar los mensajes de error previos

### Requirement 6: Gestión del Ciclo de Vida de Jobs

**User Story:** Como sistema, quiero gestionar correctamente el ciclo de vida de los jobs de enriquecimiento, para evitar memory leaks y estados inconsistentes.

#### Acceptance Criteria

1. WHEN se crea un job THEN el sistema SHALL asignar un timestamp de creación y expiración
2. WHEN un job se completa THEN el sistema SHALL mantenerlo en el store por 5 minutos para permitir re-fetches
3. WHEN un job falla THEN el sistema SHALL mantener el error en el store por 2 minutos
4. WHEN se ejecuta cleanup THEN el sistema SHALL remover jobs más antiguos que su tiempo de expiración
5. WHEN el store alcanza un límite de tamaño THEN el sistema SHALL remover los jobs más antiguos primero

## Non-Functional Requirements

### Performance
- El polling no debe exceder 100ms de latencia en el 95% de los casos
- El cleanup de jobs debe ejecutarse en menos de 10ms
- El sistema debe soportar al menos 100 jobs concurrentes

### Reliability
- El sistema debe tener un uptime del 99.9%
- Los errores deben ser recuperables sin intervención manual
- El sistema debe degradar gracefully bajo carga alta

### Observability
- Todos los errores deben ser loggeados con contexto completo
- Las métricas de error rate deben estar disponibles en tiempo real
- Los logs deben ser searchable por jobId, supplement name y error type
