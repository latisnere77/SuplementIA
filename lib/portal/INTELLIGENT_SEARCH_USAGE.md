# Intelligent Search Usage Guide

## Overview

The intelligent search system uses vector similarity and semantic search to find supplements, replacing the old hardcoded normalizer.

## Quick Start

### React Hook (Recommended)

```typescript
import { useIntelligentSearch } from '@/lib/portal/useIntelligentSearch';

function SearchComponent() {
  const { search, result, loading, error } = useIntelligentSearch();

  const handleSearch = async () => {
    const result = await search('Equinácea');
    
    if (result.success) {
      console.log('Found:', result.supplement?.name);
      console.log('Similarity:', result.similarity);
      console.log('Source:', result.source); // dynamodb, redis, postgres, fallback
    } else {
      console.log('Not found:', result.message);
      console.log('Added to discovery:', result.addedToDiscovery);
    }
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={loading}>
        Search
      </button>
      {loading && <p>Searching...</p>}
      {error && <p>Error: {error}</p>}
      {result?.success && <p>Found: {result.supplement?.name}</p>}
    </div>
  );
}
```

### Direct API Call

```typescript
import { intelligentSearch } from '@/lib/portal/useIntelligentSearch';

const result = await intelligentSearch('vitamin d');

if (result.success) {
  console.log(result.supplement);
}
```

### API Route

```bash
# Search for supplement
GET /api/portal/search?q=equinacea

# Disable fallback to legacy normalizer
GET /api/portal/search?q=test&fallback=false
```

## Response Format

### Success (200)

```json
{
  "success": true,
  "supplement": {
    "id": "echinacea-123",
    "name": "Echinacea",
    "scientificName": "Echinacea purpurea",
    "commonNames": ["Purple coneflower", "Equinácea"],
    "metadata": {},
    "similarity": 0.95
  },
  "similarity": 0.95,
  "source": "postgres",
  "cacheHit": false,
  "latency": 145
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Supplement not found. We've added it to our discovery queue.",
  "query": "unknown-supplement",
  "addedToDiscovery": true,
  "source": "discovery",
  "latency": 89
}
```

### Fallback (200 with warning)

```json
{
  "success": true,
  "supplement": {
    "id": "legacy-magnesium",
    "name": "Magnesium",
    "commonNames": ["Magnesium", "Magnesium supplementation"],
    "metadata": {
      "category": "mineral",
      "confidence": 1.0,
      "source": "legacy-normalizer"
    }
  },
  "similarity": 1.0,
  "source": "fallback",
  "cacheHit": false,
  "latency": 12,
  "warning": "Using legacy search system"
}
```

### Service Unavailable (503)

```json
{
  "success": false,
  "error": "Search service temporarily unavailable",
  "query": "test",
  "latency": 5001
}
```

## Features

### 1. Vector Similarity Search

Finds supplements by semantic meaning, not just exact matches:

```typescript
// All of these find "Echinacea"
await search('Equinácea');      // Spanish
await search('echinacea');      // English
await search('equinacea');      // Typo
await search('purple coneflower'); // Common name
```

### 2. Multi-Tier Caching

- **L1 Cache (DynamoDB DAX)**: < 1ms latency
- **L2 Cache (ElastiCache Redis)**: < 5ms latency
- **L3 Database (RDS Postgres)**: < 50ms latency

```typescript
const result = await search('vitamin d');
console.log(result.source);  // 'dynamodb', 'redis', or 'postgres'
console.log(result.cacheHit); // true if from cache
```

### 3. Automatic Discovery

Unknown supplements are automatically added to discovery queue:

```typescript
const result = await search('new-supplement-xyz');

if (!result.success && result.addedToDiscovery) {
  console.log('Added to discovery queue for future indexing');
}
```

### 4. Fallback to Legacy

Automatic fallback if Lambda fails:

```typescript
// Lambda fails → Falls back to legacy normalizer
const result = await search('magnesium');
console.log(result.source); // 'fallback'
console.log(result.warning); // 'Using legacy search system'
```

## Feature Flag

Control intelligent search with environment variable:

```bash
# Enable intelligent search
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true

# Disable (use legacy normalizer)
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=false
```

Check if enabled:

```typescript
import { isIntelligentSearchEnabled } from '@/lib/portal/useIntelligentSearch';

if (isIntelligentSearchEnabled()) {
  console.log('Using intelligent search');
} else {
  console.log('Using legacy normalizer');
}
```

## Migration from Legacy Normalizer

### Before (Deprecated)

```typescript
import { normalizeQuery } from '@/lib/portal/query-normalization/normalizer';

const result = normalizeQuery('equinácea');
console.log(result.normalized); // May not find it
```

### After (Recommended)

```typescript
import { useIntelligentSearch } from '@/lib/portal/useIntelligentSearch';

const { search } = useIntelligentSearch();
const result = await search('equinácea');
console.log(result.supplement?.name); // Finds "Echinacea"
```

## Performance

### Latency Targets

- Cache hit (DynamoDB): < 50ms
- Cache hit (Redis): < 100ms
- Cache miss (Vector search): < 200ms
- Fallback (Legacy): < 20ms

### Monitoring

```typescript
const result = await search('test');

console.log('Latency:', result.latency, 'ms');
console.log('Cache hit:', result.cacheHit);
console.log('Source:', result.source);
```

## Error Handling

```typescript
const { search, error } = useIntelligentSearch();

try {
  const result = await search('test');
  
  if (!result.success) {
    if (result.addedToDiscovery) {
      // Not found, but added to discovery
      showMessage('Supplement not found. We\'ll add it soon!');
    } else {
      // Other error
      showError(result.message);
    }
  }
} catch (err) {
  // Network or unexpected error
  showError('Search failed. Please try again.');
}
```

## Testing

```typescript
import { intelligentSearch } from '@/lib/portal/useIntelligentSearch';

describe('Intelligent Search', () => {
  it('should find supplement', async () => {
    const result = await intelligentSearch('vitamin d');
    
    expect(result.success).toBe(true);
    expect(result.supplement?.name).toBe('Vitamin D');
  });

  it('should handle not found', async () => {
    const result = await intelligentSearch('unknown-xyz');
    
    expect(result.success).toBe(false);
    expect(result.addedToDiscovery).toBe(true);
  });
});
```

## Troubleshooting

### Search returns 503

**Cause**: Lambda search-api is down or timing out

**Solution**: 
1. Check Lambda logs in CloudWatch
2. Verify RDS Postgres is accessible
3. Check Redis connection
4. Enable fallback: `?fallback=true`

### Search is slow (> 500ms)

**Cause**: Cache miss, vector search taking too long

**Solution**:
1. Check cache hit rate (should be > 85%)
2. Pre-warm cache with popular supplements
3. Optimize pgvector index
4. Check RDS performance metrics

### Fallback always used

**Cause**: Lambda not accessible or feature flag disabled

**Solution**:
1. Check `SEARCH_API_URL` environment variable
2. Verify Lambda is deployed
3. Check feature flag: `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true`
4. Check network connectivity to Lambda

## Architecture

```
User Query "Equinácea"
    ↓
useIntelligentSearch() Hook
    ↓
/api/portal/search (Next.js API Route)
    ↓
Lambda search-api (AWS)
    ↓
Check DynamoDB Cache (DAX) → HIT? Return
    ↓ MISS
Check Redis Cache → HIT? Return
    ↓ MISS
Generate Embedding (Sentence Transformers)
    ↓
Vector Search (RDS Postgres + pgvector)
    ↓
Found? → Cache & Return
Not Found? → Add to Discovery Queue
```

## Related Documentation

- [Integration Plan](/.kiro/specs/intelligent-supplement-search/INTEGRATION-PLAN.md)
- [Root Cause Analysis](/.kiro/specs/intelligent-supplement-search/ROOT-CAUSE-ANALYSIS.md)
- [Lambda search-api](/backend/lambda/search-api/lambda_function.py)
- [API Documentation](/.kiro/specs/frontend-error-display-fix/API-DOCUMENTATION.md)
