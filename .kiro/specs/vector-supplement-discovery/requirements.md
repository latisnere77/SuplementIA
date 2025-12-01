# Requirements Document

## Introduction

Este documento define los requisitos para un sistema de descubrimiento y mapeo inteligente de suplementos usando una base de datos vectorial (Lance/LanceDB). El sistema actual falla cuando usuarios buscan suplementos no mapeados (ej: "cafeína") porque depende de un diccionario estático en `supplement-mappings.ts`. La solución propuesta usa embeddings vectoriales para búsqueda semántica y un motor de descubrimiento automático que identifica y agrega nuevos suplementos diariamente.

## Glossary

- **Vector Database**: Base de datos optimizada para búsqueda de similitud usando embeddings vectoriales (ej: LanceDB, Pinecone)
- **Embedding**: Representación vectorial de texto que captura significado semántico
- **Supplement Mapping**: Mapeo de nombre de suplemento a información científica (nombre normalizado, PubMed query, etc.)
- **Discovery Engine**: Motor que identifica automáticamente nuevos suplementos no mapeados
- **Semantic Search**: Búsqueda por similitud semántica usando embeddings vectoriales
- **Enrichment**: Proceso de obtener información científica de PubMed para un suplemento
- **Fast Lookup**: Búsqueda rápida en cache/DB antes de llamar a PubMed
- **Normalization**: Proceso de convertir queries de usuario a nombres canónicos (ej: "cafeina" → "Caffeine")

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero buscar cualquier suplemento (incluso si no está pre-mapeado), para que el sistema encuentre información científica sin fallar con error 500.

#### Acceptance Criteria

1. WHEN un usuario busca un suplemento no mapeado (ej: "cafeína") THEN el sistema SHALL encontrar el mapeo más similar usando búsqueda vectorial
2. WHEN la búsqueda vectorial encuentra un match con similitud >= 0.85 THEN el sistema SHALL usar ese mapeo existente
3. WHEN la búsqueda vectorial no encuentra match suficiente (< 0.85) THEN el sistema SHALL generar un mapeo dinámico y agregarlo a la cola de descubrimiento
4. WHEN el sistema genera un mapeo dinámico THEN el sistema SHALL retornar resultados al usuario sin error 500
5. WHEN un usuario busca con typos o variaciones (ej: "cafeina", "caffeine", "café") THEN el sistema SHALL encontrar el mismo suplemento canónico

### Requirement 2

**User Story:** Como administrador del sistema, quiero que nuevos suplementos se descubran y agreguen automáticamente, para que la base de datos crezca sin intervención manual.

#### Acceptance Criteria

1. WHEN el sistema genera un mapeo dinámico THEN el sistema SHALL agregar el suplemento a una cola de descubrimiento
2. WHEN el motor de descubrimiento ejecuta (diariamente) THEN el sistema SHALL procesar todos los suplementos en la cola
3. WHEN el motor procesa un suplemento THEN el sistema SHALL obtener información de PubMed y validar que existan estudios científicos
4. WHEN un suplemento tiene >= 5 estudios en PubMed THEN el sistema SHALL crear un mapeo permanente con metadata científica
5. WHEN un suplemento tiene < 5 estudios THEN el sistema SHALL marcar como "low evidence" pero mantener el mapeo
6. WHEN el motor completa el procesamiento THEN el sistema SHALL actualizar la base de datos vectorial con los nuevos embeddings

### Requirement 3

**User Story:** Como desarrollador, quiero migrar de diccionario estático a base de datos vectorial, para que las búsquedas sean más rápidas y escalables.

#### Acceptance Criteria

1. WHEN el sistema inicia THEN el sistema SHALL conectar a LanceDB y cargar índice vectorial
2. WHEN se realiza una búsqueda THEN el sistema SHALL usar embeddings vectoriales para encontrar matches similares
3. WHEN se agrega un nuevo mapeo THEN el sistema SHALL generar embedding y agregarlo al índice vectorial
4. WHEN el índice vectorial crece THEN el sistema SHALL mantener tiempo de búsqueda < 100ms para 10,000+ suplementos
5. WHEN el sistema no puede conectar a LanceDB THEN el sistema SHALL hacer fallback al diccionario estático sin fallar

### Requirement 4

**User Story:** Como usuario, quiero que las búsquedas sean instantáneas (< 1s), para que la experiencia sea fluida sin esperas largas.

#### Acceptance Criteria

1. WHEN un usuario busca un suplemento mapeado THEN el sistema SHALL retornar resultados en < 500ms
2. WHEN un usuario busca un suplemento no mapeado THEN el sistema SHALL retornar resultados en < 2s (incluyendo generación dinámica)
3. WHEN el sistema usa cache de DynamoDB THEN el sistema SHALL retornar resultados en < 200ms
4. WHEN múltiples usuarios buscan simultáneamente THEN el sistema SHALL mantener latencia < 1s para 95% de requests
5. WHEN la búsqueda vectorial toma > 100ms THEN el sistema SHALL registrar warning para optimización

### Requirement 5

**User Story:** Como administrador, quiero monitorear el sistema de descubrimiento, para identificar problemas y optimizar el proceso.

#### Acceptance Criteria

1. WHEN el motor de descubrimiento ejecuta THEN el sistema SHALL registrar métricas de procesamiento (suplementos procesados, errores, tiempo)
2. WHEN un suplemento falla al procesarse THEN el sistema SHALL registrar el error con contexto completo
3. WHEN la cola de descubrimiento crece > 100 items THEN el sistema SHALL enviar alerta
4. WHEN un mapeo dinámico se usa > 10 veces THEN el sistema SHALL priorizar su procesamiento permanente
5. WHEN el sistema detecta patrones de búsqueda THEN el sistema SHALL registrar analytics para mejorar mapeos

### Requirement 6

**User Story:** Como desarrollador, quiero que el sistema sea compatible con el código existente, para que la migración sea gradual sin romper funcionalidad.

#### Acceptance Criteria

1. WHEN se migra a vector DB THEN el sistema SHALL mantener la misma interfaz de `getSupplementMapping()`
2. WHEN el vector DB no está disponible THEN el sistema SHALL hacer fallback al diccionario estático
3. WHEN se agrega un nuevo mapeo THEN el sistema SHALL actualizar tanto vector DB como diccionario estático
4. WHEN se ejecutan tests existentes THEN el sistema SHALL pasar todos los tests sin modificaciones
5. WHEN se despliega a producción THEN el sistema SHALL permitir rollback sin pérdida de datos

### Requirement 7

**User Story:** Como usuario, quiero que el sistema maneje múltiples idiomas (español/inglés), para buscar suplementos en mi idioma preferido.

#### Acceptance Criteria

1. WHEN un usuario busca en español (ej: "cafeína") THEN el sistema SHALL encontrar el suplemento canónico en inglés ("Caffeine")
2. WHEN un usuario busca en inglés (ej: "caffeine") THEN el sistema SHALL encontrar el mismo suplemento canónico
3. WHEN se genera un embedding THEN el sistema SHALL usar modelo multilingüe que entienda español e inglés
4. WHEN se muestra resultado al usuario THEN el sistema SHALL retornar nombres en el idioma de búsqueda
5. WHEN se agregan sinónimos THEN el sistema SHALL indexar tanto español como inglés en el vector DB

### Requirement 8

**User Story:** Como administrador, quiero que el sistema sea cost-efficient, para minimizar costos de API y almacenamiento.

#### Acceptance Criteria

1. WHEN se genera un embedding THEN el sistema SHALL usar modelo local o API económica (< $0.0001 por embedding)
2. WHEN se almacenan embeddings THEN el sistema SHALL usar compresión para reducir tamaño
3. WHEN se consulta PubMed THEN el sistema SHALL respetar rate limits y usar cache agresivo
4. WHEN el motor de descubrimiento ejecuta THEN el sistema SHALL procesar en batches para optimizar API calls
5. WHEN se detecta uso excesivo de API THEN el sistema SHALL implementar backoff exponencial
