# Design Document

## Overview

This design document describes the architecture and implementation approach for completing the intelligent knowledge base system. The system will transform SuplementIA from an on-demand content generation system (30-60s latency) to a fast, learning-based system with sub-50ms search latency using vector embeddings and multi-tier caching.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront + Lambda@Edge                      │
│                    (Global Edge Locations)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Search API Lambda                           │
│                   (Vector Search Orchestrator)                   │
└────────┬────────────────────┬────────────────────┬──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  DynamoDB DAX  │   │ Redis Cache    │   │ RDS Postgres   │
│   (< 1ms)      │   │   (< 5ms)      │   │  + pgvector    │
│   L1 Cache     │   │   L2 Cache     │   │   (< 50ms)     │
└────────────────┘   └────────────────┘   └────────┬───────┘
                                                    │
                                                    ▼
                                           ┌────────────────┐
                                           │ HNSW Index     │
                                           │ 384-dim vectors│
                                           └────────────────┘
         
┌─────────────────────────────────────────────────────────────────┐
│                    Discovery & Learning System                   │
└────────┬────────────────────┬────────────────────┬──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Discovery Queue│   │ Discovery      │   │ Embedding      │
│  (DynamoDB)    │   │ Worker Lambda  │   │ Generator      │
│                │   │                │   │ Lambda + EFS   │
└────────────────┘   └────────────────┘   └────────────────┘
```

## Components and Interfaces

### 1. RDS Postgres with pgvector

**Purpose**: Persistent knowledge base with vector search capabilities

**Schema**:
```sql
CREATE TABLE supplements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    common_names TEXT[],
    embedding vector(384),
    metadata JSONB,
    search_count INTEGER DEFAULT 0,
    last_searched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplements_embedding ON supplements 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_supplements_name ON supplements (name);
CREATE INDEX idx_supplements_search_count ON supplements (search_count DESC);
```

**Configuration**:
- Instance: db.t3.micro (staging), db.t3.small (production)
- Storage: 20GB gp3
- Multi-AZ: Enabled for high availability
- Backup: 7-day retention

### 2. Embedding Generator Lambda

**Purpose**: Generate 384-dimensional embeddings using Sentence Transformers

**Interface**:
```typescript
interface EmbeddingRequest {
  text: string;
  requestId?: string;
}

interface EmbeddingResponse {
  success: boolean;
  embedding: number[]; // 384 dimensions
  model: string;
  latency: number;
}
```

**Implementation Details**:
- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Storage: EFS mount for model caching
- Memory: 1024 MB
- Timeout: 30 seconds
- Cold start optimization: Model pre-loaded in /tmp

**Model Loading Strategy**:
```python
import os
from sentence_transformers import SentenceTransformer

MODEL_PATH = '/mnt/efs/models/all-MiniLM-L6-v2'
model = None

def load_model():
    global model
    if model is None:
        if os.path.exists(MODEL_PATH):
            model = SentenceTransformer(MODEL_PATH)
        else:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            model.save(MODEL_PATH)
    return model
```

### 3. Discovery Worker Lambda

**Purpose**: Process discovery queue and add new supplements to knowledge base

**Interface**:
```typescript
interface DiscoveryItem {
  id: string;
  query: string;
  priority: number;
  searchCount: number;
  firstSearchedAt: string;
  lastSearchedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface DiscoveryResult {
  success: boolean;
  supplementId?: string;
  error?: string;
}
```

**Processing Flow**:
1. Read item from discovery queue (DynamoDB)
2. Validate supplement exists in PubMed
3. Fetch basic information
4. Generate embedding via Embedding Generator
5. Insert into RDS Postgres
6. Invalidate caches (DAX + Redis)
7. Mark item as completed

**Priority Calculation**:
```typescript
priority = searchCount * 10 + (Date.now() - firstSearchedAt) / 86400000
```

### 4. Search API Lambda

**Purpose**: Orchestrate vector search across cache tiers

**Interface**:
```typescript
interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number; // Similarity threshold (default: 0.7)
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  source: 'dax' | 'redis' | 'postgres' | 'discovery';
  latency: number;
  cacheHit: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  scientificName?: string;
  commonNames: string[];
  similarity: number;
  metadata: Record<string, unknown>;
}
```

**Search Flow**:
```typescript
async function search(query: string): Promise<SearchResponse> {
  const startTime = Date.now();
  
  // 1. Generate query embedding
  const embedding = await generateEmbedding(query);
  
  // 2. Check DAX cache (< 1ms)
  const daxResult = await checkDAX(embedding);
  if (daxResult) {
    return { ...daxResult, source: 'dax', latency: Date.now() - startTime };
  }
  
  // 3. Check Redis cache (< 5ms)
  const redisResult = await checkRedis(embedding);
  if (redisResult) {
    await cacheInDAX(embedding, redisResult);
    return { ...redisResult, source: 'redis', latency: Date.now() - startTime };
  }
  
  // 4. Query Postgres with pgvector (< 50ms)
  const pgResult = await queryPostgres(embedding);
  if (pgResult && pgResult.similarity > 0.7) {
    await cacheInRedis(embedding, pgResult);
    await cacheInDAX(embedding, pgResult);
    return { ...pgResult, source: 'postgres', latency: Date.now() - startTime };
  }
  
  // 5. Add to discovery queue
  await addToDiscoveryQueue(query);
  return { 
    success: false, 
    source: 'discovery', 
    latency: Date.now() - startTime 
  };
}
```

### 5. Multi-Tier Cache System

**DynamoDB DAX Configuration**:
```yaml
ClusterName: supplements-dax-cluster
NodeType: dax.t3.small
ReplicationFactor: 1
TTL: 86400 # 24 hours
```

**Redis Configuration**:
```yaml
CacheNodeType: cache.t3.micro
NumCacheNodes: 1
Engine: redis
EngineVersion: 7.0
MaxMemoryPolicy: allkeys-lru
```

**Cache Key Strategy**:
```typescript
// Embedding hash for cache key
function getCacheKey(embedding: number[]): string {
  const hash = crypto.createHash('sha256')
    .update(embedding.join(','))
    .digest('hex');
  return `supplement:${hash.substring(0, 16)}`;
}
```

## Data Models

### Supplement Model
```typescript
interface Supplement {
  id: string;
  name: string;
  scientificName?: string;
  commonNames: string[];
  embedding: number[]; // 384 dimensions
  metadata: {
    category?: string;
    description?: string;
    sources?: string[];
  };
  searchCount: number;
  lastSearchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Discovery Queue Item
```typescript
interface DiscoveryQueueItem {
  id: string;
  query: string;
  priority: number;
  searchCount: number;
  firstSearchedAt: Date;
  lastSearchedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retryCount: number;
  metadata: {
    userAgent?: string;
    language?: string;
    source?: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Vector Search Accuracy
*For any* supplement in the knowledge base, searching with its exact name should return that supplement as the top result with similarity > 0.95
**Validates: Requirements 1.3, 5.2**

### Property 2: Embedding Consistency
*For any* text input, generating embeddings multiple times should produce identical 384-dimensional vectors
**Validates: Requirements 3.4**

### Property 3: Cache Tier Ordering
*For any* search query, the system should check DAX before Redis, and Redis before Postgres
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 4: Discovery Queue Priority
*For any* two items in the discovery queue, the item with higher priority should be processed first
**Validates: Requirements 7.2, 7.3**

### Property 5: Cache Invalidation
*For any* supplement update, all cache tiers (DAX, Redis) should be invalidated within 1 second
**Validates: Requirements 4.5**

### Property 6: Search Latency Bounds
*For any* search query, DAX hits should complete in < 1ms, Redis hits in < 5ms, and Postgres hits in < 50ms
**Validates: Requirements 1.4, 6.1, 6.2, 6.3**

### Property 7: Embedding Dimensions
*For any* generated embedding, the vector should have exactly 384 dimensions
**Validates: Requirements 3.4**

### Property 8: Discovery Queue Addition
*For any* search query with no results, the query should be added to the discovery queue with priority based on search frequency
**Validates: Requirements 4.1, 7.1**

### Property 9: HNSW Index Performance
*For any* knowledge base with 1000+ supplements, vector search should complete in < 50ms
**Validates: Requirements 1.4, 10.1**

### Property 10: Multi-AZ Availability
*For any* RDS failure in one availability zone, the system should failover to the standby instance within 60 seconds
**Validates: Requirements 1.5**

## Error Handling

### Embedding Generation Failures
```typescript
async function generateEmbeddingWithRetry(text: string, maxRetries = 3): Promise<number[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

### Cache Failures
```typescript
async function searchWithCacheFallback(query: string): Promise<SearchResponse> {
  try {
    // Try cache tiers
    return await searchWithCache(query);
  } catch (error) {
    // Fallback to direct Postgres query
    console.error('Cache error, falling back to Postgres:', error);
    return await searchPostgresDirectly(query);
  }
}
```

### Discovery Worker Failures
```typescript
async function processDiscoveryItem(item: DiscoveryQueueItem): Promise<void> {
  try {
    await processItem(item);
  } catch (error) {
    if (item.retryCount < 3) {
      // Retry with exponential backoff
      await updateItemStatus(item.id, 'pending', item.retryCount + 1);
    } else {
      // Mark as failed after 3 retries
      await updateItemStatus(item.id, 'failed', item.retryCount, error.message);
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Embedding generation produces correct dimensions
- Cache key generation is consistent
- Priority calculation is correct
- Vector similarity calculations are accurate

### Property-Based Tests
- All 10 correctness properties listed above
- Use fast-check library for TypeScript
- Generate random supplements and queries
- Verify properties hold across all inputs

### Integration Tests
- End-to-end search flow (DAX → Redis → Postgres)
- Discovery worker processing
- Cache invalidation across tiers
- Embedding generation and storage

### Performance Tests
- Measure P50, P95, P99 latencies
- Test with 100, 1000, 10000 supplements
- Concurrent search load testing
- Cache hit rate measurement

## Deployment Strategy

### Phase 1: Infrastructure Setup (Day 1)
1. Deploy RDS Postgres with CloudFormation
2. Install pgvector extension
3. Create database schema
4. Deploy DynamoDB tables (cache + discovery queue)
5. Deploy DAX cluster
6. Deploy Redis cluster
7. Setup EFS for model storage

### Phase 2: Lambda Deployment (Day 1-2)
1. Deploy Embedding Generator Lambda
2. Upload Sentence Transformers model to EFS
3. Deploy Discovery Worker Lambda
4. Deploy Search API Lambda
5. Configure environment variables
6. Setup CloudWatch logging

### Phase 3: Data Migration (Day 2)
1. Export existing 70+ supplements
2. Generate embeddings for all supplements
3. Bulk insert into RDS Postgres
4. Verify HNSW index creation
5. Pre-populate DAX and Redis caches

### Phase 4: Integration & Testing (Day 2-3)
1. Run integration tests
2. Run performance tests
3. Verify cache hit rates
4. Test discovery worker
5. Smoke test all endpoints

### Phase 5: Gradual Rollout (Day 3)
1. Route 10% traffic to new system
2. Monitor metrics (latency, errors, cache hits)
3. Increase to 50% if stable
4. Increase to 100% if stable
5. Keep old system as fallback

## Monitoring and Observability

### CloudWatch Metrics
- `SearchLatency` (P50, P95, P99)
- `CacheHitRate` (per tier: DAX, Redis, Postgres)
- `EmbeddingGenerationLatency`
- `DiscoveryQueueLength`
- `DiscoveryProcessingRate`

### CloudWatch Alarms
- High search latency (P95 > 200ms)
- Low cache hit rate (< 80%)
- Discovery queue backlog (> 100 items)
- Embedding generation failures (> 5%)
- RDS connection errors

### X-Ray Tracing
- Trace complete search flow
- Identify bottlenecks
- Track cache tier performance
- Monitor Lambda cold starts

## Cost Optimization

### Estimated Monthly Costs
- RDS Postgres (db.t3.micro): $15
- DynamoDB (on-demand): $5
- DAX (dax.t3.small): $50
- Redis (cache.t3.micro): $15
- Lambda executions: $10
- EFS storage: $5
- **Total: ~$100/month**

### Optimization Strategies
- Use on-demand pricing for DynamoDB
- Enable Multi-AZ only in production
- Use t3 instances for cost savings
- Implement aggressive caching (85%+ hit rate)
- Auto-scale Lambda concurrency
