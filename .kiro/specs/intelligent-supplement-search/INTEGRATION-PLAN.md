# Integration Plan: Connect Frontend to Intelligent Search

## Overview

Connect the frontend to the existing intelligent search Lambda (search-api) to enable semantic search for all supplements, not just hardcoded ones.

## Current Architecture (BROKEN)

```
User Search "Equinácea"
    ↓
Frontend (results/page.tsx)
    ↓
/api/portal/enrich (Next.js API)
    ↓
Hardcoded Normalizer (70 supplements)
    ↓
❌ NOT FOUND → Error 500
```

**Intelligent Search Lambda**: ✅ Deployed but UNUSED

## Target Architecture (FIXED)

```
User Search "Equinácea"
    ↓
Frontend (results/page.tsx)
    ↓
/api/portal/search (New Next.js API)
    ↓
Lambda search-api (AWS)
    ↓
Vector Search (pgvector)
    ↓
✅ FOUND → Echinacea (similarity: 0.92)
```

**Fallback**: If Lambda fails → Old normalizer

## Implementation Steps

### Step 1: Create Search API Route
**File**: `app/api/portal/search/route.ts`

```typescript
/**
 * Intelligent Search API
 * Proxies requests to Lambda search-api with vector similarity
 */
import { NextRequest, NextResponse } from 'next/server';

const SEARCH_API_URL = process.env.SEARCH_API_URL || 
  'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter required' },
      { status: 400 }
    );
  }
  
  try {
    // Call Lambda search-api
    const response = await fetch(`${SEARCH_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({
        success: true,
        supplement: data.supplement,
        similarity: data.similarity,
        source: data.source,
        cacheHit: data.cacheHit,
      });
    }
    
    // Not found - return 404
    return NextResponse.json(
      { 
        success: false, 
        message: data.message || 'Supplement not found',
        addedToDiscovery: true 
      },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Fallback to old normalizer
    return NextResponse.json(
      { 
        success: false, 
        error: 'Search service unavailable',
        fallbackAvailable: true 
      },
      { status: 503 }
    );
  }
}
```

### Step 2: Update Frontend to Use New Search
**File**: `app/portal/results/page.tsx`

Add feature flag and new search logic:

```typescript
// Feature flag
const USE_INTELLIGENT_SEARCH = process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH === 'true';

async function searchSupplement(query: string) {
  if (USE_INTELLIGENT_SEARCH) {
    try {
      // Try intelligent search first
      const response = await fetch(`/api/portal/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          found: true,
          supplement: data.supplement,
          similarity: data.similarity,
          source: 'intelligent-search',
        };
      }
      
      // Not found but added to discovery
      if (response.status === 404 && data.addedToDiscovery) {
        return {
          found: false,
          message: 'Supplement not found. We\'ve added it to our discovery queue.',
          addedToDiscovery: true,
        };
      }
      
    } catch (error) {
      console.warn('Intelligent search failed, falling back to old system:', error);
    }
  }
  
  // Fallback to old system
  return searchWithOldNormalizer(query);
}
```

### Step 3: Add Environment Variables
**File**: `.env.local`

```bash
# Intelligent Search
SEARCH_API_URL=https://staging-search-api.execute-api.us-east-1.amazonaws.com/search
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=false  # Start disabled

# Production
# SEARCH_API_URL=https://prod-search-api.execute-api.us-east-1.amazonaws.com/search
# NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
```

### Step 4: Gradual Rollout

**Phase 1: Testing (Week 1)**
- Deploy with `USE_INTELLIGENT_SEARCH=false`
- Test manually with feature flag enabled locally
- Verify Lambda is responding correctly
- Test edge cases: typos, unknown supplements, multilingual

**Phase 2: Canary (Week 2)**
- Enable for 10% of users
- Monitor error rates, latency, cache hit rate
- Compare results with old system
- Collect user feedback

**Phase 3: Ramp Up (Week 3)**
- Increase to 50% if metrics are good
- Monitor for 3 days
- Increase to 100%

**Phase 4: Cleanup (Week 4)**
- Remove old normalizer code
- Archive deprecated files
- Update documentation

### Step 5: Monitoring

**Metrics to Track**:
- Search success rate (target: >99%)
- Latency P95 (target: <200ms)
- Cache hit rate (target: >85%)
- Error rate (target: <1%)
- Discovery queue size

**Alerts**:
- Error rate > 5%
- Latency P95 > 500ms
- Cache hit rate < 70%
- Lambda errors

### Step 6: Deprecation Plan

**Immediately**:
- Mark `lib/portal/query-normalization/normalizer.ts` as `@deprecated`
- Add warning logs when old normalizer is used
- Update documentation

**After 2 weeks at 100%**:
- Move old normalizer to `_archived/`
- Remove from imports
- Clean up tests

**After 1 month**:
- Delete archived code
- Remove feature flag
- Update architecture docs

## Testing Checklist

### Unit Tests
- [ ] Search API route handles valid queries
- [ ] Search API route handles invalid queries
- [ ] Search API route handles Lambda timeout
- [ ] Search API route falls back on error

### Integration Tests
- [ ] Frontend → Search API → Lambda → Response
- [ ] Cache hit scenario (DynamoDB)
- [ ] Cache miss scenario (Vector search)
- [ ] Unknown supplement → Discovery queue
- [ ] Fallback to old system on failure

### E2E Tests
- [ ] Search "Equinácea" → Returns Echinacea
- [ ] Search "vitamin d" → Returns Vitamin D
- [ ] Search "xyz123" → Not found, added to discovery
- [ ] Search with typo → Finds correct supplement
- [ ] Search in Spanish → Finds English equivalent

### Performance Tests
- [ ] Latency < 200ms (P95)
- [ ] Cache hit rate > 85%
- [ ] Handles 100 concurrent requests
- [ ] No memory leaks

## Rollback Plan

If issues occur:

1. **Immediate**: Set `USE_INTELLIGENT_SEARCH=false`
2. **Redeploy**: Push environment variable change
3. **Verify**: Confirm old system is working
4. **Investigate**: Review logs and metrics
5. **Fix**: Address root cause
6. **Retry**: Gradual rollout again

## Success Criteria

- ✅ "Equinácea" search returns Echinacea
- ✅ Error rate < 1%
- ✅ Latency P95 < 200ms
- ✅ Cache hit rate > 85%
- ✅ No manual supplement additions needed
- ✅ Discovery queue working
- ✅ Old normalizer deprecated

## Timeline

| Week | Phase | Tasks |
|------|-------|-------|
| 1 | Development | Create search API route, update frontend, add tests |
| 2 | Testing | Deploy to staging, manual testing, fix bugs |
| 3 | Canary | 10% rollout, monitor metrics |
| 4 | Ramp Up | 50% → 100% rollout |
| 5 | Cleanup | Deprecate old code, update docs |

## Resources Needed

- Development: 16 hours
- Testing: 8 hours
- Monitoring: 4 hours/week for 4 weeks
- Documentation: 4 hours

**Total**: ~40 hours over 1 month

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Lambda timeout | Medium | High | Add timeout handling, fallback to old system |
| Cache miss storm | Low | Medium | Pre-warm cache with popular supplements |
| Vector search errors | Low | High | Comprehensive error handling, fallback |
| Cost overrun | Low | Low | Monitor Lambda invocations, set budget alerts |
| User confusion | Medium | Low | Clear error messages, gradual rollout |

---

**Status**: Ready for Implementation
**Priority**: High
**Effort**: Medium (40 hours)
**Value**: High (Eliminates root cause of 15% errors)
