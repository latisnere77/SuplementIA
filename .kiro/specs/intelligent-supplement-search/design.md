# Design Document

## Overview

Este documento describe el diseño técnico del sistema de búsqueda inteligente de suplementos usando arquitectura 100% AWS nativa serverless. El sistema reemplaza el diccionario estático actual (70 suplementos hardcoded) con búsqueda semántica vectorial escalable, reduciendo errores 500 de 15% a <1%, latencia de 5s a 120ms, y eliminando mantenimiento manual. Utiliza CloudFront + Lambda@Edge para edge computing, DynamoDB DAX para cache L1 (microsegundos), ElastiCache Redis para cache L2 (milisegundos), y RDS Postgres con pgvector para búsqueda vectorial.

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
│              DynamoDB + DAX (L1 Cache)                       │
│  - In-memory cache                                          │
│  - < 1ms latency (microseconds)                             │
│  - 90%+ hit rate target                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            ElastiCache Redis (L2 Cache)                      │
│  - Cluster mode enabled                                     │
│  - < 5ms latency                                            │
│  - 85% hit rate target                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              RDS Postgres + pgvector                         │
│  - Vector search (384 dims)                                 │
│  - HNSW index for fast similarity                           │
│  - < 50ms query time                                        │
│  - Multi-AZ for high availability                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Lambda with Sentence Transformers                  │
│  - Local ML (all-MiniLM-L6-v2)                             │
│  - Generate embeddings (free tier)                          │
│  - 14K tokens/sec throughput                                │
│  - EFS for model caching                                    │
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
   
2. Lambda@Edge → DynamoDB DAX (L1 cache)
   - Check cache (< 1ms)
   - Return if found (cache hit)
   
3. If cache miss → ElastiCache Redis (L2 cache)
   - Check Redis cluster (< 5ms)
   - Return if found
   
4. If cache miss → Lambda (Embedding Generation)
   - Generate embedding (Sentence Transformers)
   - Query RDS Postgres (pgvector)
   
5. If found → Return + Cache
   - Store in ElastiCache Redis (TTL: 7 days)
   - Store in DynamoDB (TTL: 7 days)
   - DAX auto-caches for next request
   
6. If not found → Discovery Queue (DynamoDB)
   - Add to queue for background processing
   - Return informative message
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

### 2. L1 Cache Layer (DynamoDB + DAX)

**Purpose**: Ultra-fast in-memory cache with microsecond latency

**Interface**:
```typescript
// DynamoDB Table: supplement-cache
{
  PK: string;              // "SUPPLEMENT#{hash}"
  SK: string;              // "QUERY"
  supplementData: object;  // Full supplement object
  embedding: number[];     // 384-dim vector
  ttl: number;            // Unix timestamp
  searchCount: number;
  lastAccessed: number;
}
```

**Responsibilities**:
- Store frequently accessed supplements
- Provide microsecond read latency via DAX
- Auto-evict based on TTL
- Track access patterns

### 3. L2 Cache Layer (ElastiCache Redis)

**Purpose**: Fast distributed cache with millisecond latency

**Interface**:
```typescript
// Redis Keys
supplement:query:{hash} → Supplement
supplement:embedding:{hash} → Float32Array
analytics:search:{date} → SearchMetrics
popular:supplements → SortedSet
```

**Responsibilities**:
- Store supplements not in DAX
- Cache embeddings for reuse
- Track search analytics
- LRU eviction when full
- Cluster mode for high availability

### 4. Vector Search (RDS Postgres + pgvector)

**Purpose**: Semantic search using vector similarity

**Schema**:
```sql
CREATE TABLE supplements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT,
  common_names TEXT[],
  embedding vector(384),
  metadata JSONB,
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON supplements 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX ON supplements (search_count DESC);
```

**Interface**:
```typescript
// Vector Search Query
SELECT 
  name,
  scientific_name,
  common_names,
  metadata,
  1 - (embedding <=> $1) as similarity
FROM supplements
WHERE 1 - (embedding <=> $1) > 0.85
ORDER BY similarity DESC
LIMIT 5;
```

### 5. ML Layer (Lambda + Sentence Transformers + EFS)

**Purpose**: Generate embeddings locally without API costs

**Model**: `all-MiniLM-L6-v2`
- 384 dimensions
- Multilingual (100+ languages)
- 80MB model size
- 14K tokens/sec throughput
- Cached in EFS for fast cold starts

**Interface**:
```typescript
// Lambda Function
POST /api/embed
{
  text: string;
}

Response:
{
  embedding: number[]; // 384 dims
  model: 'all-MiniLM-L6-v2';
  latency: number;
}
```

**EFS Configuration**:
- Model stored in `/mnt/ml-models/`
- Shared across Lambda instances
- Eliminates cold start model loading

### 6. Discovery Queue (Background Processing)

**Purpose**: Auto-discover and index new supplements

**Flow**:
```
1. User searches unknown supplement
2. Add to discovery queue (DynamoDB)
3. DynamoDB Stream triggers Lambda
4. Background Lambda processes:
   - Generate embedding
   - Query PubMed for studies
   - Validate scientific data
   - Insert into RDS Postgres
5. Supplement now searchable
6. Cache invalidation via EventBridge
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

### Property 4: Cache hit latency bound (DAX)

*For any* cached supplement query in DynamoDB DAX, response latency should be < 1ms

**Validates: Requirements 2.4**

### Property 5: Cache hit latency bound (Redis)

*For any* cached supplement query in ElastiCache Redis, response latency should be < 5ms

**Validates: Requirements 2.5**

### Property 6: Cache miss latency bound

*For any* non-cached supplement query, response latency should be < 200ms including vector search

**Validates: Requirements 2.2**

### Property 7: RDS Postgres pgvector query performance

*For any* pgvector similarity search on RDS, query time should be < 50ms

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

*For any* search request, cache should be checked in order: DynamoDB DAX, ElastiCache Redis, RDS Postgres

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
   - Postgres connection failure
   - pgvector index corruption

2. **Cache Errors**
   - Redis connection timeout
   - KV Store quota exceeded
   - Cache corruption

3. **ML Errors**
   - Model loading failure
   - Embedding generation timeout
   - Invalid input text

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

1. Setup RDS Postgres with pgvector extension
2. Configure CloudFront distribution + Lambda@Edge
3. Setup DynamoDB tables + DAX cluster
4. Setup ElastiCache Redis cluster
5. Setup EFS for ML model storage
6. Deploy Lambda with Sentence Transformers

### Phase 2: Data Migration (Week 2)

1. Export existing 70 supplements from `supplement-mappings.ts`
2. Generate embeddings for all supplements
3. Insert into RDS Postgres with pgvector
4. Pre-populate DynamoDB cache
5. Warm up ElastiCache Redis
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
CloudFront + Lambda@Edge: $3 (1M requests)
DynamoDB + DAX: $8 (cache table + DAX t3.small)
ElastiCache Redis: $12 (cache.t3.micro)
RDS Postgres: $0 (free tier db.t3.micro)
Lambda (embeddings): $0 (free tier)
EFS (model storage): $1 (1GB)
DynamoDB (discovery queue): $1 (on-demand)
────────────────────────────────
Total: $25/month
```

### Cost Scaling

- 1 user (12 searches/month): $0/month (AWS free tier)
- 10K searches/day: $25/month
- 100K searches/day: $60/month
- 1M searches/day: $180/month

### Cost Optimization Notes

- DAX provides 10x cost reduction vs direct DynamoDB reads
- ElastiCache Redis cheaper than DynamoDB for high read workloads
- RDS free tier covers first 12 months (then ~$15/month)
- Lambda free tier: 1M requests + 400K GB-seconds/month
- EFS free tier: 5GB for 12 months

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
