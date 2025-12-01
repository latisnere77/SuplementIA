# Requirements Document

## Introduction

Este documento define los requisitos para completar el sistema de descubrimiento automático de suplementos. Actualmente, cuando un usuario busca un ingrediente que no está en el sistema (como "Calcium"), el flujo falla en la entrega de resultados porque el discovery worker no está completamente implementado. Este spec completa la implementación del sistema de descubrimiento automático para que los ingredientes no encontrados se procesen correctamente y se entreguen resultados al usuario.

## Glossary

- **Discovery Queue**: Cola de procesamiento en DynamoDB que almacena ingredientes buscados pero no encontrados en el sistema
- **Discovery Worker**: Lambda function que procesa la cola de descubrimiento, valida ingredientes con PubMed, y los agrega a LanceDB
- **LanceDB**: Base de datos vectorial en EFS que almacena embeddings de suplementos para búsqueda semántica
- **Search API**: Lambda function que realiza búsqueda vectorial en LanceDB
- **Recommend API**: Lambda function que genera recomendaciones basadas en ingredientes encontrados
- **Frontend**: Aplicación Next.js que muestra resultados al usuario

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero que el sistema encuentre y procese automáticamente ingredientes que busco pero que no están en el sistema, para que pueda obtener resultados incluso para ingredientes nuevos.

#### Acceptance Criteria

1. WHEN un usuario busca un ingrediente no encontrado THEN el sistema SHALL agregar el ingrediente a la discovery queue en DynamoDB
2. WHEN un ingrediente se agrega a la discovery queue THEN el sistema SHALL procesar el ingrediente en segundo plano sin bloquear la respuesta al usuario
3. WHEN el discovery worker procesa un ingrediente THEN el sistema SHALL validar la existencia del ingrediente en PubMed
4. WHEN un ingrediente es validado exitosamente THEN el sistema SHALL generar un embedding y agregarlo a LanceDB en EFS
5. WHEN un ingrediente es agregado a LanceDB THEN el sistema SHALL estar disponible para búsquedas futuras en menos de 5 segundos

### Requirement 2

**User Story:** Como usuario, quiero recibir una respuesta inmediata cuando busco un ingrediente no encontrado, para que no tenga que esperar mientras el sistema lo procesa.

#### Acceptance Criteria

1. WHEN un usuario busca un ingrediente no encontrado THEN el sistema SHALL devolver una respuesta 404 con mensaje informativo en menos de 200ms
2. WHEN el sistema devuelve 404 THEN el mensaje SHALL indicar que el ingrediente está siendo procesado
3. WHEN el sistema devuelve 404 THEN el mensaje SHALL sugerir al usuario intentar nuevamente en unos minutos
4. WHEN un ingrediente está en proceso de descubrimiento THEN el sistema SHALL indicar el estado "processing" en la respuesta
5. WHEN un ingrediente ha sido descubierto THEN búsquedas subsecuentes SHALL devolver resultados normales

### Requirement 3

**User Story:** Como usuario, quiero que el sistema maneje correctamente ingredientes que no tienen suficiente evidencia científica, para que reciba información honesta sobre la calidad de los datos.

#### Acceptance Criteria

1. WHEN el discovery worker valida un ingrediente THEN el sistema SHALL consultar PubMed para contar estudios disponibles
2. WHEN un ingrediente tiene menos de 5 estudios en PubMed THEN el sistema SHALL marcarlo como "low evidence"
3. WHEN un ingrediente tiene 5-20 estudios THEN el sistema SHALL marcarlo como "moderate evidence"
4. WHEN un ingrediente tiene más de 20 estudios THEN el sistema SHALL marcarlo como "strong evidence"
5. WHEN un ingrediente no tiene estudios en PubMed THEN el sistema SHALL rechazar el ingrediente y NO agregarlo a LanceDB

### Requirement 4

**User Story:** Como desarrollador, quiero que el discovery worker maneje errores gracefully, para que fallos temporales no impidan el procesamiento de ingredientes válidos.

#### Acceptance Criteria

1. WHEN el discovery worker falla al procesar un ingrediente THEN el sistema SHALL reintentar hasta 3 veces con exponential backoff
2. WHEN un ingrediente falla después de 3 reintentos THEN el sistema SHALL marcar el ingrediente como "failed" en la discovery queue
3. WHEN PubMed API está temporalmente no disponible THEN el sistema SHALL esperar y reintentar sin perder el ingrediente
4. WHEN LanceDB está temporalmente no disponible THEN el sistema SHALL reintentar la inserción sin perder el embedding generado
5. WHEN el discovery worker encuentra un error THEN el sistema SHALL registrar el error completo en CloudWatch con contexto

### Requirement 5

**User Story:** Como administrador del sistema, quiero monitorear el estado de la discovery queue, para que pueda identificar y resolver problemas de procesamiento.

#### Acceptance Criteria

1. WHEN ingredientes se agregan a la discovery queue THEN el sistema SHALL registrar métricas en CloudWatch
2. WHEN el discovery worker procesa ingredientes THEN el sistema SHALL registrar tiempo de procesamiento y resultado
3. WHEN la discovery queue tiene más de 50 ingredientes pendientes THEN el sistema SHALL enviar una alerta
4. WHEN un ingrediente falla repetidamente THEN el sistema SHALL enviar una alerta con detalles del error
5. WHEN el discovery worker completa procesamiento THEN el sistema SHALL actualizar métricas de éxito/fallo en CloudWatch

### Requirement 6

**User Story:** Como usuario, quiero que el frontend maneje correctamente el caso de ingredientes no encontrados, para que entienda qué está pasando y qué hacer.

#### Acceptance Criteria

1. WHEN el frontend recibe un 404 del Search API THEN el sistema SHALL mostrar un mensaje claro al usuario
2. WHEN el mensaje se muestra THEN el sistema SHALL explicar que el ingrediente está siendo procesado
3. WHEN el mensaje se muestra THEN el sistema SHALL ofrecer al usuario la opción de intentar nuevamente
4. WHEN el usuario intenta nuevamente THEN el sistema SHALL verificar si el ingrediente ya fue procesado
5. WHEN el ingrediente aún no está listo THEN el sistema SHALL mostrar el tiempo estimado de espera

### Requirement 7

**User Story:** Como desarrollador, quiero que el sistema tenga datos iniciales pre-cargados, para que los ingredientes más comunes estén disponibles inmediatamente.

#### Acceptance Criteria

1. WHEN el sistema se despliega por primera vez THEN el sistema SHALL cargar los 70 suplementos del sistema legacy
2. WHEN se cargan suplementos iniciales THEN el sistema SHALL generar embeddings para todos ellos
3. WHEN se generan embeddings THEN el sistema SHALL insertarlos en LanceDB en EFS
4. WHEN se insertan en LanceDB THEN el sistema SHALL pre-poblar el cache de DynamoDB con los 20 suplementos más populares
5. WHEN la carga inicial completa THEN el sistema SHALL registrar métricas de éxito en CloudWatch
