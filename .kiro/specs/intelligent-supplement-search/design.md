# Design Document

## Overview

Este documento describe el diseño técnico del sistema de búsqueda inteligente de suplementos usando arquitectura 100% AWS nativa serverless **OPTIMIZADA PARA COSTOS**. El sistema reemplaza el diccionario estático actual (70 suplementos hardcoded) con búsqueda semántica vectorial escalable, reduciendo errores 500 de 15% a <1%, latencia de 5s a 120ms, y eliminando mantenimiento manual.

**ARQUITECTURA OPTIMIZADA (2025-11-26):**
- ✅ DynamoDB como cache único (reemplaza Redis + DAX)
- ✅ **LanceDB + EFS para vector search** (reemplaza RDS + pgvector)
- ✅ Lambda ARM64 (Graviton2) - 20% más barato, 40% más rápido
- ✅ AWS Secrets Manager para credenciales
- ✅ Costo: **$5.59/mes** (DynamoDB + LanceDB + CloudWatch)
- ✅ Ahorro: **96% vs arquitectura original** ($135/mes → $5.59/mes)

**Ver detalles:** `.kiro/specs/intelligent-supplement-search/ARCHITECTURE-UPDATE.md`

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         CloudFront + Lambda@Edge (Edge Computing)            │
│  - 450+ edge locations worldwide                            │
│  - Request routing & validation                             │
│  - < 50ms latency globally                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              DynamoDB (Cache Layer)                          │
│  - On-demand pricing                                        │
│  - < 10ms latency                                           │
│  - 85%+ hit rate target                                     │
│  - TTL: 7 days                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    Lambda ARM64 + LanceDB (Vector Search - SuplementIA)     │
│  - LanceDB on EFS (/mnt/efs/suplementia-lancedb/)          │
│  - Vector search (384 dims)                                 │
│  - ANN with HNSW/IVF_PQ                                     │
│  - < 10ms query time                                        │
│  - Zero-copy reads (Apache Arrow)                           │
│  - Sentence Transformers (all-MiniLM-L6-v2)                │
│  - Model cached in EFS                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    PubMed API                                │
│  - Scientific data source                                    │
│  - Cached aggressively                                       │
│  - Rate limited                                              │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. User Query → CloudFront + Lambda@Edge
   - Request validation & sanitization
   - Route to nearest edge location
   
2. Lambda@Edge → DynamoDB (Cache Check)
   - Check cache (< 10ms)
   - Return if found (cache hit)
   
3. If cache miss → Lambda ARM64 (search-api)
   - Mount EFS: /mnt/efs/suplementia-lancedb/
   - Generate embedding (Sentence Transformers from EFS)
   - Query LanceDB (ANN search < 10ms)
   
4. If found → Return + Cache
   - Store in DynamoDB (TTL: 7 days)
   - Return to user
   
5. If not found → Discovery Queue (DynamoDB)
   - Add to queue for background processing
   - Return informative message
   
6. Background: Discovery Worker
   - DynamoDB Stream triggers Lambda
   - Validate with PubMed
   - Generate embedding
   - Insert into LanceDB on EFS
```

## Components and Interfaces

### 1. Edge Layer (CloudFront + Lambda@Edge)

**Purpose**: Global edge computing for minimal latency

**Interface**:
```typescript
// Lambda@Edge Handler
export async function handler(event: CloudFrontRequestEvent) {
  const query = event.queryStringParameters?.q;
  // Validation, routing, cache lookup
}

// API Gateway (origin)
POST /api/search
{
  query: string;
  language?: string;
}

Response:
{
  success: boolean;
  supplement?: Supplement;
  latency: number;
  cacheHit: boolean;
  source: 'dax' | 'redis' | 'postgres' | 'discovery';
}
```

**Responsibilities**:
- Receive user queries at edge
- Request validation & sanitization
- Query DynamoDB DAX (L1 cache)
- Forward to origin if miss
- Return results with minimal latency

### 2. Cache Layer (DynamoDB)

**Purpose**: Fast cache with single-digit millisecond latency

**Interface**:
```typescript
// DynamoDB Table: supplement-cache
{
  PK: string;              // "SUPPLEMENT#{hash}"
  SK: string;              // "QUERY"
  supplementData: object;  // Full supplement object
  embedding: number[];     // 384-dim vector
  ttl: number;            // Unix timestamp (7 days)
  searchCount: number;
  lastAccessed: number;
}
```

**Responsibilities**:
- Store frequently accessed supplements
- Provide < 10ms read latency
- Auto-evict based on TTL
- Track access patterns
- On-demand pricing (pay per request)

### 3. Vector Search (LanceDB on EFS - SuplementIA)

**Purpose**: Serverless semantic search using LanceDB

**EFS Structure**:
```
/mnt/efs/
├── suplementia-lancedb/          # LanceDB database (SuplementIA-specific)
│   ├── supplements.lance         # Vector table
│   └── _versions/                # Version control
└── models/
    └── all-MiniLM-L6-v2/        # Sentence Transformers model
```

**LanceDB Schema**:
```python
# LanceDB Table: supplements
{
  "id": int,
  "name": str,
  "scientific_name": str,
  "common_names": List[str],
  "vector": List[float],  # 384 dims
  "metadata": dict,
  "search_count": int,
  "last_searched_at": str,
  "created_at": str
}
```

**Interface**:
```python
import lancedb

# Connect to LanceDB on EFS
db = lancedb.connect("/mnt/efs/suplementia-lancedb")
table = db.open_table("supplements")

# Vector search (ANN)
results = (
    table.search(query_embedding)
    .metric("cosine")
    .limit(5)
    .where("similarity > 0.85")
    .to_list()
)
```

**Responsibilities**:
- Store supplement vectors (384 dims)
- Perform ANN search (< 10ms)
- HNSW/IVF_PQ indexing
- Zero-copy reads (Apache Arrow)
- Automatic versioning

### 4. ML Layer (Lambda ARM64 + Sentence Transformers + EFS)

**Purpose**: Generate embeddings locally without API costs

**Model**: `all-MiniLM-L6-v2`
- 384 dimensions
- Multilingual (100+ languages)
- 80MB model size
- 14K tokens/sec throughput
- Cached in EFS for fast cold starts

**Lambda Configuration**:
```python
# Lambda: search-api (ARM64)
Runtime: python3.11
Architecture: arm64 (Graviton2)
Memory: 512MB
Timeout: 30s
EFS Mount: /mnt/efs

# Dependencies
lancedb==0.3.0
sentence-transformers==2.2.2
torch==2.0.0 (CPU-only)
```

**Interface**:
```python
from sentence_transformers import SentenceTransformer

# Load model from EFS (cached)
model = SentenceTransformer('/mnt/efs/models/all-MiniLM-L6-v2')

# Generate embedding
embedding = model.encode(query_text)  # Returns 384-dim vector
```

**EFS Configuration**:
- Model stored in `/mnt/efs/models/`
- LanceDB in `/mnt/efs/suplementia-lancedb/`
- Shared across Lambda instances
- Eliminates cold start model loading

### 5. Discovery Queue (Background Processing)

**Purpose**: Auto-discover and index new supplements

**Flow**:
```
1. User searches unknown supplement
2. Add to discovery queue (DynamoDB)
3. DynamoDB Stream triggers Lambda (discovery-worker)
4. Background Lambda processes:
   - Mount EFS: /mnt/efs/suplementia-lancedb/
   - Query PubMed for studies
   - Validate scientific data
   - Generate embedding (Sentence Transformers)
   - Insert into LanceDB on EFS
5. Supplement now searchable
6. Cache invalidation (DynamoDB)
```

**DynamoDB Table: discovery-queue**
```typescript
{
  PK: string;              // "DISCOVERY#{id}"
  SK: string;              // "PENDING"
  query: string;
  searchCount: number;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  processedAt?: number;
}
```

## Data Models

### Supplement

```typescript
interface Supplement {
  id: number;
  name: string;
  scientificName?: string;
  commonNames: string[];
  embedding: Float32Array; // 384 dims
  metadata: {
    category: SupplementCategory;
    popularity: 'high' | 'medium' | 'low';
    evidenceGrade: 'A' | 'B' | 'C' | 'D';
    studyCount: number;
    pubmedQuery: string;
  };
  searchCount: number;
  lastSearchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type SupplementCategory = 
  | 'vitamin'
  | 'mineral'
  | 'herb'
  | 'amino-acid'
  | 'fatty-acid'
  | 'mushroom'
  | 'other';
```

### SearchResult

```typescript
interface SearchResult {
  supplement: Supplement;
  similarity: number;
  latency: number;
  cacheHit: boolean;
  source: 'kv' | 'redis' | 'postgres' | 'discovery';
}
```

### DiscoveryQueueItem

```typescript
interface DiscoveryQueueItem {
  id: string;
  query: string;
  searchCount: number;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Vector search finds semantically similar supplements

*For any* supplement query, when vector search is performed, all returned results should have similarity score >= 0.85

**Validates: Requirements 1.1, 1.2**

### Property 2: Typo tolerance through semantic similarity

*For any* known supplement name with random typos (1-2 character changes), vector search should still find the correct supplement with similarity >= 0.80

**Validates: Requirements 1.4**

### Property 3: Error rate below threshold

*For any* set of 1000 random valid supplement queries, the error rate (500 errors) should be < 1%

**Validates: Requirements 1.5**

### Property 4: Cache hit latency bound (DynamoDB)

*For any* cached supplement query in DynamoDB, response latency should be < 10ms

**Validates: Requirements 2.4**

### Property 6: Cache miss latency bound

*For any* non-cached supplement query, response latency should be < 200ms including vector search

**Validates: Requirements 2.2**

### Property 7: LanceDB vector search performance

*For any* LanceDB ANN search, query time should be < 10ms

**Validates: Requirements 2.6**

### Property 8: Multilingual search (Spanish to English)

*For any* Spanish supplement name, vector search should find the equivalent English supplement with similarity >= 0.85

**Validates: Requirements 3.1**

### Property 9: Multilingual search (English)

*For any* English supplement name, vector search should find the correct supplement with similarity >= 0.90

**Validates: Requirements 3.2**

### Property 10: Scientific name to common name mapping

*For any* supplement with both scientific and common names, searching by scientific name should find the supplement by common name

**Validates: Requirements 3.4**

### Property 11: Common name to scientific name mapping

*For any* supplement with both scientific and common names, searching by common name should find the supplement by scientific name

**Validates: Requirements 3.5**

### Property 12: Embedding generation produces correct dimensions

*For any* text input, generated embedding should have exactly 384 dimensions

**Validates: Requirements 6.2**

### Property 13: Embedding generation performance

*For any* batch of 1000 queries, total embedding generation time should be < 5 seconds

**Validates: Requirements 6.3**

### Property 14: Model caching for reuse

*For any* sequence of embedding generations, the ML model should be loaded once and cached in memory

**Validates: Requirements 6.5**

### Property 15: Cache tier ordering

*For any* search request, cache should be checked in order: DynamoDB, LanceDB on EFS

**Validates: Requirements 5.1**

### Property 16: Cache hit rate threshold

*For any* set of 1000 searches with realistic distribution, cache hit rate should be >= 85%

**Validates: Requirements 5.2**

### Property 17: Cache TTL configuration

*For any* cached supplement data, TTL should be set to 7 days

**Validates: Requirements 5.3**

### Property 18: LRU cache eviction

*For any* full cache, when new item is added, least recently used item should be evicted

**Validates: Requirements 5.4**

### Property 19: Cache invalidation on update

*For any* supplement modification, cache entries for that supplement should be invalidated

**Validates: Requirements 4.5, 5.5**

### Property 20: Insert-to-search latency

*For any* newly inserted supplement, it should be searchable within 1 second

**Validates: Requirements 4.3**

### Property 21: Scalability with large dataset

*For any* database with 1000+ supplements, search time should remain < 200ms

**Validates: Requirements 4.4**

### Property 22: Auto-embedding generation on insert

*For any* supplement inserted without embedding, system should automatically generate embedding using ML local

**Validates: Requirements 4.2**

### Property 23: Search prioritization

*For any* supplement searched > 10 times, it should be marked for priority indexing

**Validates: Requirements 7.1**

### Property 24: Analytics logging

*For any* search performed, analytics should be recorded with latency, cache hit, and timestamp

**Validates: Requirements 7.2, 8.1**

### Property 25: Auto-discovery insertion

*For any* unknown supplement discovered, it should be automatically added to database after validation

**Validates: Requirements 7.3**

### Property 26: PubMed validation

*For any* supplement being validated, system should verify existence of studies in PubMed

**Validates: Requirements 7.4**

### Property 27: Low evidence classification

*For any* supplement with < 5 PubMed studies, it should be marked as "low evidence" but remain searchable

**Validates: Requirements 7.5**

### Property 28: Error logging with context

*For any* error that occurs, system should log complete context including query, stack trace, and timestamp

**Validates: Requirements 8.2**

### Property 29: Cache hit rate alerting

*For any* time period where cache hit rate drops < 80%, system should send alert

**Validates: Requirements 8.3**

### Property 30: Latency alerting

*For any* time period where P95 latency exceeds 300ms, system should send alert

**Validates: Requirements 8.4**

### Property 31: Anomaly detection logging

*For any* detected anomaly (unusual patterns, spikes), system should log for analysis

**Validates: Requirements 8.5**

### Property 32: Fallback to legacy system

*For any* failure in new system, request should automatically fallback to legacy system

**Validates: Requirements 9.2**

### Property 33: Response format compatibility

*For any* search response, format should match legacy system format for backward compatibility

**Validates: Requirements 9.5**

### Property 34: Rate limit handling

*For any* external API call, system should respect rate limits and use exponential backoff

**Validates: Requirements 10.5**

## Error Handling

### Error Types

1. **Vector Search Errors**
   - No match found (similarity < 0.85)
   - LanceDB connection failure
   - EFS mount timeout
   - Index corruption

2. **Cache Errors**
   - DynamoDB throttling
   - Cache quota exceeded
   - Cache corruption

3. **ML Errors**
   - Model loading failure from EFS
   - Embedding generation timeout
   - Invalid input text
   - EFS mount failure

4. **External API Errors**
   - PubMed rate limit
   - PubMed timeout
   - Invalid API response

### Error Handling Strategy

```typescript
async function searchSupplement(query: string): Promise<SearchResult> {
  try {
    // Try new system
    return await vectorSearch(query);
  } catch (error) {
    // Log error with context
    logger.error('Vector search failed', {
      query,
      error: error.message,
      stack: error.stack,
    });
    
    // Fallback to legacy system
    try {
      return await legacySearch(query);
    } catch (fallbackError) {
      // Both systems failed - return user-friendly error
      throw new SearchError(
        'Unable to search supplements at this time',
        { query, originalError: error }
      );
    }
  }
}
```

## Testing Strategy

### Unit Tests

- Embedding generation (correct dimensions, performance)
- Cache operations (get, set, invalidate)
- Vector similarity calculations
- Query normalization
- Error handling paths

### Property-Based Tests

We will use **fast-check** for property-based testing in TypeScript.

**Configuration**:
- Minimum 100 iterations per property
- Seed for reproducibility
- Shrinking enabled for minimal failing examples

**Test Structure**:
```typescript
import fc from 'fast-check';

describe('Property Tests', () => {
  it('Property 1: Vector search similarity threshold', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 50 }),
        async (query) => {
          const results = await vectorSearch(query);
          return results.every(r => r.similarity >= 0.85);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

- End-to-end search flow
- Cache tier fallback
- Discovery queue processing
- PubMed API integration

### Performance Tests

- Latency benchmarks (P50, P95, P99)
- Throughput testing (queries/second)
- Cache hit rate measurement
- Scalability testing (1K, 10K, 100K supplements)

## Deployment Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. Setup EFS for LanceDB + ML models
2. Configure CloudFront distribution + Lambda@Edge
3. Setup DynamoDB tables (cache + discovery queue)
4. Deploy Lambda ARM64 with LanceDB + Sentence Transformers
5. Mount EFS to Lambda functions
6. Configure IAM roles and security groups

### Phase 2: Data Migration (Week 2)

1. Export existing 70 supplements from `supplement-mappings.ts`
2. Generate embeddings for all supplements
3. Initialize LanceDB on EFS (`/mnt/efs/suplementia-lancedb/`)
4. Insert supplements into LanceDB
5. Pre-populate DynamoDB cache
6. Validate search accuracy

### Phase 3: Parallel Deployment (Week 3)

1. Deploy new system alongside legacy
2. Route 10% traffic to new system
3. Monitor metrics (latency, errors, cache hit rate)
4. Gradually increase to 100%

### Phase 4: Legacy Deprecation (Week 4)

1. Remove `supplement-mappings.ts`
2. Remove `query-normalization.ts`
3. Clean up legacy code
4. Update documentation

## Monitoring and Observability

### Key Metrics

1. **Latency**
   - P50, P95, P99 response times
   - Cache hit latency vs miss latency
   - Per-tier latency breakdown

2. **Availability**
   - Error rate (target: < 1%)
   - Uptime (target: 99.9%)
   - Fallback activation rate

3. **Cache Performance**
   - Hit rate (target: >= 85%)
   - Eviction rate
   - Memory usage

4. **Search Quality**
   - Average similarity score
   - Zero-result rate
   - Discovery queue size

### Alerting Rules

```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 1%
    severity: critical
    
  - name: low_cache_hit_rate
    condition: cache_hit_rate < 80%
    severity: warning
    
  - name: high_latency
    condition: p95_latency > 300ms
    severity: warning
    
  - name: discovery_queue_backlog
    condition: queue_size > 100
    severity: info
```

## Security Considerations

1. **Input Validation**
   - Sanitize all user queries
   - Limit query length (max 200 chars)
   - Block SQL injection attempts

2. **Rate Limiting**
   - Per-IP rate limits (100 req/min)
   - Per-user rate limits (1000 req/day)
   - Exponential backoff for repeated failures

3. **Data Privacy**
   - No PII stored in logs
   - Anonymize search analytics
   - GDPR compliance for EU users

4. **API Security**
   - API key rotation for PubMed
   - Encrypted connections (TLS 1.3)
   - CORS configuration

## Cost Analysis

### Monthly Costs (10K searches/day)

```
DynamoDB (cache): $0.39 (on-demand, 300K reads/month)
DynamoDB (discovery): $0.00 (minimal writes)
Lambda ARM64: $0.00 (free tier: 1M requests)
EFS (LanceDB + models): $4.00 (10GB @ $0.30/GB + $0.80 throughput)
CloudWatch Logs: $1.20 (5GB ingestion)
────────────────────────────────
Total: $5.59/month
```

### Cost Scaling

- 1 user (12 searches/month): $0/month (AWS free tier)
- 10K searches/day: $5.59/month
- 100K searches/day: $12/month
- 1M searches/day: $45/month

### Cost Optimization Notes

- **LanceDB on EFS**: 69% cheaper than RDS ($4/mes vs $16.50/mes)
- **No Redis/DAX**: Eliminates $20/mes in cache infrastructure
- **Lambda ARM64**: 20% cheaper than x86, 40% faster
- **DynamoDB on-demand**: Pay only for actual usage
- **EFS**: Scales automatically, no provisioning needed
- **Total savings**: 96% vs original architecture ($135/mes → $5.59/mes)

## Future Enhancements

1. **Advanced ML**
   - Fine-tune model on supplement domain
   - Multi-modal search (images, chemical structures)
   - Personalized recommendations

2. **Enhanced Discovery**
   - Automatic synonym detection
   - Chemical compound recognition
   - Brand name mapping

3. **Analytics**
   - Search trend analysis
   - Popular supplement tracking
   - User behavior insights

4. **Performance**
   - GraphQL API for flexible queries
   - Streaming responses
   - Predictive pre-caching
