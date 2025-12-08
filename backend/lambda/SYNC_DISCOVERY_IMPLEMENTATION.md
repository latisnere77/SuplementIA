# Synchronous Discovery Implementation

## Problem
When users search for ingredients not yet in LanceDB, they receive a 404 error and must search again later. This creates a poor user experience.

## Solution
Implement **synchronous discovery** where new ingredients are discovered and indexed in real-time during the search request.

## Changes Made

### 1. Modified `/backend/lambda/search-api-lancedb/lambda_function.py`

#### Added Import
```python
import requests
```

#### New Function: `try_sync_discovery(query: str)`
- **Purpose**: Discover and index supplements in real-time
- **Process**:
  1. Query PubMed for study count (8s timeout)
  2. Check minimum threshold (default: 3 studies)
  3. Grade evidence (A/B/C/D based on study count)
  4. Generate embedding using Bedrock Titan V2
  5. Insert into LanceDB immediately
  6. Return success/failure

- **Returns**:
  ```python
  {
      'success': bool,
      'study_count': int,
      'evidence_grade': str,  # A, B, C, or D
      'reason': str,          # if failed
      'message': str
  }
  ```

#### Modified Flow in `lambda_handler`
**Before**:
```
No results found → Add to discovery queue → Return 404
```

**After**:
```
No results found → Try sync discovery →
  ├─ Success → Search again → Return result ✅
  └─ Failed → Add to background queue → Return 404 with reason
```

### 2. New Behavior

When a user searches for an unknown ingredient:

1. **First Search** (vector_search): Not found in LanceDB
2. **Sync Discovery** (try_sync_discovery):
   - Query PubMed (~2-3s)
   - Generate embedding (~1-2s)
   - Insert to LanceDB (~0.5s)
   - **Total: ~5-8 seconds**
3. **Second Search** (vector_search): Now found!
4. **Return Result**: User sees content immediately

### 3. Fallback Strategy

If sync discovery fails:
- **Insufficient studies** (< 3): Return 404 with study count
- **PubMed timeout**: Return 404, add to background queue
- **Other error**: Return 404, add to background queue

Background queue ensures eventual indexing for all valid supplements.

## Benefits

✅ **Better UX**: Users see results immediately (5-10s delay acceptable)
✅ **Auto-learning**: LanceDB grows automatically with real user searches
✅ **No manual indexing**: Thousands of supplements indexed on-demand
✅ **Smart threshold**: Only ingredients with ≥3 studies are indexed
✅ **Backward compatible**: Existing supplements remain fast (<200ms)

## Performance

| Scenario | Before | After |
|----------|--------|-------|
| Existing supplement | ~150ms | ~150ms (no change) |
| New supplement (≥3 studies) | 404 → Manual search later | ~5-10s → Result shown |
| New supplement (<3 studies) | 404 | 404 with study count |

## Testing

Run local test:
```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda/search-api-lancedb
python test-sync-discovery.py
```

Test with Lambda:
```bash
# Search for new ingredient
curl "https://y7kmfjbldddeslucthyaomytem0etqnc.lambda-url.us-east-1.on.aws/?q=Rhodiola"

# Should return result in ~5-10s (first time)
# Subsequent searches should be instant
```

## Deployment

The changes are ready to deploy. No infrastructure changes needed.

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda
# Deploy using existing scripts
```

## Environment Variables

Uses existing configuration:
- `MIN_STUDIES`: Minimum study threshold (default: 3)
- `PUBMED_API_KEY`: Optional PubMed API key
- `BEDROCK_EMBEDDING_MODEL`: Titan model for embeddings
- `LANCEDB_PATH`: EFS mount path

## Monitoring

Watch CloudWatch logs for:
```
[SYNC DISCOVERY] Starting for: <query>
[SYNC DISCOVERY] PubMed results: X studies (Y.YYs)
[SYNC DISCOVERY] Adding to LanceDB (grade: X)...
[SYNC DISCOVERY] Successfully indexed: <query> (ID: X, total time: Y.YYs)
```

## Future Enhancements

1. **Progress feedback**: Stream progress to frontend ("Querying PubMed..." → "Adding to index...")
2. **Batch discovery**: Queue multiple related ingredients
3. **Smart caching**: Cache PubMed results to speed up retries
4. **Popularity tracking**: Prioritize frequently searched ingredients

---

**Status**: ✅ Implementation Complete
**Next Step**: Deploy to production
