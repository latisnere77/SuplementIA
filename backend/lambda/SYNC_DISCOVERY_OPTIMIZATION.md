# Optimización del Sistema de Descubrimiento Sincrónico

## Análisis del Sistema Actual

### Flujo Actual
```
Usuario busca "Pterostilbene" (no está en LanceDB)
    ↓
try_sync_discovery() ejecuta:
    1. PubMed API call (timeout: 8s) ← CUELLO DE BOTELLA
    2. Generate embedding (Bedrock)
    3. Insert to LanceDB
    ↓
Total: ~8-12 segundos (demasiado lento)
```

### Problemas Identificados

1. **PubMed API Timeout (30% de fallas)**
   - Timeout actual: 8 segundos
   - Queries complejas tardan >8s
   - Ejemplos que fallan: Pterostilbene, Nicotinamide Riboside, Sulforaphane

2. **Proceso Secuencial Lento**
   - PubMed → Bedrock → LanceDB (todo en serie)
   - Tiempo total: 8-12 segundos
   - Usuario espera demasiado

3. **Sin Caché de PubMed**
   - Cada búsqueda llama a PubMed
   - No se aprovechan búsquedas anteriores
   - PubMed API tiene rate limits

## Propuestas de Optimización

### 🚀 Optimización 1: Caché de PubMed en DynamoDB

**Problema**: Llamamos a PubMed repetidamente para el mismo suplemento

**Solución**: Cachear resultados de PubMed por 30 días

```python
def get_pubmed_count_cached(query: str) -> int:
    """
    Get PubMed count with DynamoDB caching

    Cache key: pubmed:{query}
    TTL: 30 days
    """
    import boto3

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('pubmed-cache')

    # Check cache
    try:
        response = table.get_item(Key={'query': query.lower()})
        if 'Item' in response:
            print(f"[CACHE HIT] PubMed count for {query}: {response['Item']['count']}")
            return response['Item']['count']
    except Exception as e:
        print(f"[CACHE MISS] {e}")

    # Cache miss - call PubMed
    pubmed_query = f"{query} AND (supplement OR supplementation)"
    response = requests.get(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
        params={
            'db': 'pubmed',
            'term': pubmed_query,
            'retmode': 'json',
            'retmax': 0,
            'api_key': os.environ.get('PUBMED_API_KEY', '')
        },
        timeout=10  # Increased to 10s
    )

    data = response.json()
    count = int(data.get('esearchresult', {}).get('count', 0))

    # Store in cache with 30-day TTL
    ttl = int(time.time()) + (30 * 24 * 60 * 60)
    table.put_item(
        Item={
            'query': query.lower(),
            'count': count,
            'pubmed_query': pubmed_query,
            'ttl': ttl,
            'cached_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
    )

    return count
```

**Beneficios**:
- ✅ 99% reducción de llamadas a PubMed
- ✅ Respuesta instantánea (<50ms) para queries cacheadas
- ✅ Evita rate limits de PubMed API
- ✅ Costo: ~$0.00025 por millón de lecturas (DynamoDB)

---

### 🚀 Optimización 2: Proceso Asíncrono con Respuesta Inmediata

**Problema**: Usuario espera 8-12 segundos en el primer intento

**Solución**: Responder inmediatamente y descubrir en background

```python
def try_sync_discovery_async(query: str) -> Dict:
    """
    Optimized sync discovery with async processing

    Flow:
    1. Return 202 Accepted immediately
    2. Trigger async Lambda to process
    3. User can poll for status
    """
    import boto3

    # Invoke async Lambda
    lambda_client = boto3.client('lambda')

    payload = {
        'action': 'discover',
        'query': query,
        'user_id': 'system'  # Track for analytics
    }

    lambda_client.invoke(
        FunctionName='supplement-discovery-worker',
        InvocationType='Event',  # Async
        Payload=json.dumps(payload)
    )

    # Return immediately with discovery ID
    discovery_id = f"disc_{int(time.time())}_{hash(query) % 10000}"

    return {
        'success': False,
        'discovery_id': discovery_id,
        'status': 'discovering',
        'message': 'Discovering supplement in background. Try again in 10 seconds.',
        'query': query,
        'reason': 'async_discovery'
    }
```

**Worker Lambda** (nuevo):
```python
def lambda_handler(event, context):
    """
    Async worker for supplement discovery
    """
    query = event['query']

    # Same logic as try_sync_discovery but without timeout pressure
    study_count = get_pubmed_count_cached(query)  # With cache!

    if study_count >= 3:
        # Add to LanceDB
        add_to_lancedb(query, study_count)

        # Notify via SNS/EventBridge
        publish_discovery_event(query, 'success')
    else:
        publish_discovery_event(query, 'insufficient_studies')
```

**Beneficios**:
- ✅ Respuesta inmediata al usuario (<500ms)
- ✅ Sin timeouts de Lambda (worker puede tardar 30s)
- ✅ Mejor UX con polling/webhooks
- ✅ Costo: +$0.20 por millón de invocaciones

---

### 🚀 Optimización 3: Pre-carga de Suplementos Comunes

**Problema**: Suplementos muy comunes no están en LanceDB

**Solución**: Pre-cargar top 500 suplementos más buscados

```python
# Script de inicialización
COMMON_SUPPLEMENTS = [
    "Pterostilbene",
    "Nicotinamide Riboside",
    "Sulforaphane",
    "Apigenin",
    "Quercetin",
    "Resveratrol",
    # ... 494 more
]

def preload_common_supplements():
    """
    Pre-load common supplements to LanceDB
    Run during deployment or as scheduled Lambda
    """
    for supplement in COMMON_SUPPLEMENTS:
        # Use cached PubMed
        count = get_pubmed_count_cached(supplement)

        if count >= 3:
            add_to_lancedb(supplement, count)
            print(f"✅ Preloaded: {supplement} ({count} studies)")
        else:
            print(f"⏭️  Skipped: {supplement} ({count} studies)")
```

**Beneficios**:
- ✅ 90% de búsquedas son instantáneas
- ✅ Mejora drástica en UX
- ✅ Se ejecuta una vez, dura para siempre
- ✅ Costo: ~$5 una sola vez (500 suplementos × $0.01)

---

### 🚀 Optimización 4: Aumentar Timeout de PubMed

**Problema**: 8 segundos es muy corto para queries complejas

**Solución**: Aumentar timeout a 15 segundos (solo para sync discovery)

```python
# En try_sync_discovery(), línea 871
response = requests.get(
    pubmed_url,
    params=params,
    timeout=15  # Antes: 8, Ahora: 15
)
```

**Beneficios**:
- ✅ Reduce fallas de 30% a ~5%
- ✅ Cambio trivial (1 línea)
- ✅ Sin costo adicional
- ⚠️  Lambda puede tardar 15s (pero ya tarda 10s con el timeout de frontend)

---

### 🚀 Optimización 5: Query Simplificada de PubMed

**Problema**: Query `"{query} AND (supplement OR supplementation)"` puede ser muy compleja

**Solución**: Simplificar query para términos específicos

```python
def build_pubmed_query(query: str) -> str:
    """
    Build optimized PubMed query

    Examples:
    - "Pterostilbene" → "Pterostilbene[Title/Abstract]"
    - "Nicotinamide Riboside" → "Nicotinamide Riboside"[Title/Abstract]
    """
    # Remove common supplement suffixes
    clean_query = query.replace(" supplement", "").replace(" supplementation", "")

    # Use Title/Abstract filter for faster search
    if len(clean_query.split()) <= 3:
        return f'"{clean_query}"[Title/Abstract]'
    else:
        return f'{clean_query} AND (supplement[Title/Abstract] OR supplementation[Title/Abstract])'
```

**Beneficios**:
- ✅ Queries más rápidas (6-8s → 3-5s)
- ✅ Más precisas
- ✅ Sin costo adicional

---

## Recomendación de Implementación

### Fase 1 (Rápida - 1 hora) ⚡
1. ✅ **Aumentar timeout de PubMed** (8s → 15s)
2. ✅ **Simplificar queries de PubMed**

**Impacto**: Reduce fallas de 30% → 5%

### Fase 2 (Media - 1 día) 🚀
3. ✅ **Implementar caché de PubMed en DynamoDB**
4. ✅ **Pre-cargar top 100 suplementos**

**Impacto**: 80% de búsquedas instantáneas

### Fase 3 (Avanzada - 2 días) 🎯
5. ✅ **Implementar descubrimiento asíncrono**
6. ✅ **Worker Lambda dedicado**
7. ✅ **Polling/WebSocket para notificaciones**

**Impacto**: 100% de búsquedas <500ms

---

## Comparación de Rendimiento

| Escenario | Actual | Fase 1 | Fase 2 | Fase 3 |
|-----------|--------|--------|--------|--------|
| **Suplemento en LanceDB** | 1-2s | 1-2s | 1-2s | 1-2s |
| **Suplemento común nuevo** | 8-12s (70% éxito) | 8-15s (95% éxito) | <500ms (cache) | <500ms |
| **Suplemento raro nuevo** | Timeout (30% falla) | 15s (5% falla) | 5s (cache) | 500ms + async |
| **Costo por búsqueda** | $0.001 | $0.001 | $0.0005 | $0.0007 |

---

## Estimación de Costos

### Fase 1 (Sin costos adicionales)
- Solo cambios de código ✅

### Fase 2
- **DynamoDB**: ~$0.25/mes (1M lecturas)
- **Pre-carga**: $5 una sola vez
- **Total**: ~$3/mes

### Fase 3
- **Worker Lambda**: +$0.20/mes (100k invocaciones)
- **EventBridge**: +$0.10/mes
- **Total**: ~$3.50/mes

**ROI**: Mejora drástica en UX por <$4/mes

---

## Métricas de Éxito

### Antes de Optimización
- ✅ Success rate: 70%
- ⚠️  Avg latency: 8-12s (first search)
- ❌ Timeout rate: 30%

### Después de Fase 1
- ✅ Success rate: 95%
- ✅ Avg latency: 8-15s (first search)
- ✅ Timeout rate: 5%

### Después de Fase 2
- ✅ Success rate: 99%
- ✅ Avg latency: <2s (80% cached)
- ✅ Timeout rate: <1%

### Después de Fase 3
- ✅ Success rate: 100%
- ✅ Avg latency: <500ms (all queries)
- ✅ Timeout rate: 0% (async)

---

## Próximos Pasos

1. ✅ Revisar y aprobar plan
2. ⚡ Implementar Fase 1 (optimizaciones rápidas)
3. 🧪 Testing con las 5 queries que fallaron
4. 🚀 Implementar Fase 2 si resultados son buenos
5. 📊 Monitorear métricas en CloudWatch

---

## Notas Técnicas

### DynamoDB Table Schema (pubmed-cache)
```json
{
  "TableName": "pubmed-cache",
  "KeySchema": [
    { "AttributeName": "query", "KeyType": "HASH" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "query", "AttributeType": "S" }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "TimeToLiveSpecification": {
    "Enabled": true,
    "AttributeName": "ttl"
  }
}
```

### Environment Variables
```bash
PUBMED_TIMEOUT=15  # Increased from 8
PUBMED_CACHE_ENABLED=true
PUBMED_CACHE_TABLE=pubmed-cache
ASYNC_DISCOVERY_ENABLED=false  # Enable in Phase 3
```
