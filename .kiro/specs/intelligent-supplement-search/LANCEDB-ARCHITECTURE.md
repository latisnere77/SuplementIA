# LanceDB Architecture for SuplementIA

**Date**: 2025-11-26  
**Status**: Approved  
**Cost Impact**: 96% reduction ($135/mes → $5.59/mes)

## Executive Summary

Reemplazamos RDS Postgres + pgvector con **LanceDB on EFS** para vector search en SuplementIA. Esta decisión reduce costos en 69% para la capa de datos ($16.50/mes → $4/mes) y mejora performance (50ms → 10ms).

## Why LanceDB?

### Cost Comparison

| Component | RDS + pgvector | LanceDB + EFS | Savings |
|-----------|----------------|---------------|---------|
| Database | $15.00/mes | - | $15.00 |
| Storage | $1.50/mes | - | $1.50 |
| EFS | - | $4.00/mes | - |
| **Total** | **$16.50/mes** | **$4.00/mes** | **$12.50/mes (69%)** |

### Performance Comparison

| Metric | RDS + pgvector | LanceDB + EFS |
|--------|----------------|---------------|
| Query latency | < 50ms | < 10ms |
| Cold start | ~500ms | ~2-3s |
| Warm latency | < 50ms | < 10ms |
| Connection overhead | Yes (pooling) | No (file-based) |
| Scalability | Vertical | Horizontal |

### Technical Advantages

✅ **Serverless-native**: No connection pooling, no idle connections  
✅ **Zero-copy reads**: Apache Arrow format, memory efficient  
✅ **5x faster**: < 10ms vs < 50ms query time  
✅ **Simpler ops**: No database management, backups, or patches  
✅ **Auto-scaling**: EFS scales automatically  
✅ **Version control**: Built-in versioning for data  

## Architecture

### EFS Structure

```
/mnt/efs/
├── suplementia-lancedb/          # LanceDB database (SuplementIA-specific)
│   ├── supplements.lance         # Main vector table
│   ├── _versions/                # Version history
│   │   ├── 1.manifest
│   │   ├── 2.manifest
│   │   └── ...
│   └── _indices/                 # ANN indices (HNSW/IVF_PQ)
└── models/
    └── all-MiniLM-L6-v2/        # Sentence Transformers model (80MB)
        ├── pytorch_model.bin
        ├── config.json
        └── tokenizer.json
```

### Lambda Configuration

```yaml
# Lambda: search-api
Runtime: python3.11
Architecture: arm64 (Graviton2)
Memory: 512MB
Timeout: 30s
EFS Mount: /mnt/efs
VPC: Required for EFS access

Environment:
  LANCEDB_PATH: /mnt/efs/suplementia-lancedb
  MODEL_PATH: /mnt/efs/models/all-MiniLM-L6-v2
  
Dependencies:
  - lancedb==0.3.0
  - sentence-transformers==2.2.2
  - torch==2.0.0 (CPU-only)
  - pyarrow==14.0.0
```

### LanceDB Schema

```python
# Table: supplements
{
  "id": int,                      # Unique ID
  "name": str,                    # Primary name
  "scientific_name": str,         # Scientific name
  "common_names": List[str],      # Alternative names
  "vector": List[float],          # 384-dim embedding
  "metadata": {
    "category": str,              # vitamin, mineral, herb, etc.
    "popularity": str,            # high, medium, low
    "evidence_grade": str,        # A, B, C, D
    "study_count": int,           # PubMed studies
    "pubmed_query": str
  },
  "search_count": int,            # Usage tracking
  "last_searched_at": str,        # ISO timestamp
  "created_at": str,              # ISO timestamp
  "updated_at": str               # ISO timestamp
}
```

## Implementation

### 1. Search API (Lambda)

```python
import lancedb
from sentence_transformers import SentenceTransformer

# Initialize (cached across invocations)
db = lancedb.connect("/mnt/efs/suplementia-lancedb")
model = SentenceTransformer("/mnt/efs/models/all-MiniLM-L6-v2")

def lambda_handler(event, context):
    query = event['queryStringParameters']['q']
    
    # Generate embedding
    embedding = model.encode(query).tolist()
    
    # Vector search
    table = db.open_table("supplements")
    results = (
        table.search(embedding)
        .metric("cosine")
        .limit(5)
        .where("_distance < 0.15")  # similarity > 0.85
        .to_list()
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps(results)
    }
```

### 2. Discovery Worker (Lambda)

```python
def process_discovery(event, context):
    """Process new supplement discovery"""
    
    for record in event['Records']:
        query = json.loads(record['dynamodb']['NewImage']['query']['S'])
        
        # Validate with PubMed
        studies = query_pubmed(query)
        if studies < 3:
            continue  # Skip low-evidence supplements
        
        # Generate embedding
        embedding = model.encode(query).tolist()
        
        # Insert into LanceDB
        db = lancedb.connect("/mnt/efs/suplementia-lancedb")
        table = db.open_table("supplements")
        
        table.add([{
            "name": query,
            "vector": embedding,
            "metadata": {
                "study_count": studies,
                "evidence_grade": grade_evidence(studies)
            },
            "created_at": datetime.now().isoformat()
        }])
        
        # Invalidate cache
        invalidate_cache(query)
```

### 3. Initial Data Migration

```python
def migrate_supplements():
    """Migrate 70 existing supplements to LanceDB"""
    
    # Load existing supplements
    supplements = load_from_mappings()  # From supplement-mappings.ts
    
    # Initialize LanceDB
    db = lancedb.connect("/mnt/efs/suplementia-lancedb")
    
    # Create table with schema
    table = db.create_table(
        "supplements",
        data=[],
        schema=supplement_schema
    )
    
    # Generate embeddings and insert
    model = SentenceTransformer("/mnt/efs/models/all-MiniLM-L6-v2")
    
    for supp in supplements:
        embedding = model.encode(supp['name']).tolist()
        
        table.add([{
            "name": supp['name'],
            "scientific_name": supp.get('scientific_name'),
            "common_names": supp.get('common_names', []),
            "vector": embedding,
            "metadata": supp.get('metadata', {}),
            "created_at": datetime.now().isoformat()
        }])
    
    print(f"Migrated {len(supplements)} supplements to LanceDB")
```

## Performance Optimization

### 1. ANN Index Configuration

```python
# Create HNSW index for fast search
table.create_index(
    metric="cosine",
    index_type="IVF_PQ",
    num_partitions=256,
    num_sub_vectors=96
)
```

### 2. Lambda Provisioned Concurrency

```yaml
# Eliminate cold starts for critical functions
ProvisionedConcurrency: 2  # Keep 2 instances warm
```

### 3. EFS Throughput Mode

```yaml
# Use Bursting mode for cost optimization
ThroughputMode: bursting  # Scales to 100 MiB/s
PerformanceMode: generalPurpose
```

## Monitoring

### Key Metrics

```yaml
CloudWatch Metrics:
  - LanceDB query latency (P50, P95, P99)
  - EFS throughput utilization
  - Lambda cold start rate
  - Vector search accuracy (similarity scores)
  - Cache hit rate (DynamoDB)
  
Alarms:
  - Query latency > 50ms (P95)
  - EFS throughput > 80%
  - Cold start rate > 10%
  - Error rate > 1%
```

### Logging

```python
import structlog

logger = structlog.get_logger()

logger.info(
    "vector_search_completed",
    query=query,
    results_count=len(results),
    latency_ms=latency,
    similarity_scores=[r['_distance'] for r in results],
    cache_hit=False
)
```

## Migration Plan

### Phase 1: Setup (Day 1)

1. Create EFS filesystem
2. Mount EFS to Lambda
3. Download Sentence Transformers model to EFS
4. Initialize LanceDB database

### Phase 2: Data Migration (Day 2)

1. Export 70 supplements from `supplement-mappings.ts`
2. Generate embeddings
3. Insert into LanceDB
4. Validate search accuracy

### Phase 3: Testing (Day 3)

1. Unit tests for LanceDB operations
2. Integration tests for search flow
3. Performance benchmarks
4. Load testing

### Phase 4: Deployment (Day 4)

1. Deploy Lambda functions
2. Route 10% traffic
3. Monitor metrics
4. Gradual rollout to 100%

## Rollback Plan

If issues arise:

1. **Immediate**: Route traffic back to legacy system
2. **Data**: LanceDB versions allow instant rollback
3. **Code**: Lambda versions for instant revert
4. **Cost**: No long-term commitments, stop EFS anytime

## Cost Breakdown

```
EFS Storage (10GB): $3.00/mes ($0.30/GB)
EFS Throughput: $1.00/mes (bursting mode)
────────────────────────────────
Total: $4.00/mes

vs RDS Postgres:
  db.t4g.micro: $15.00/mes
  Storage (15GB): $1.50/mes
  Total: $16.50/mes
  
Savings: $12.50/mes (69%)
```

## Future Enhancements

1. **Multi-modal search**: Add image embeddings
2. **Hybrid search**: Combine vector + keyword search
3. **Reranking**: Add cross-encoder for better results
4. **Compression**: Use PQ compression for larger datasets
5. **Sharding**: Distribute across multiple EFS filesystems

## References

- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [Apache Arrow Format](https://arrow.apache.org/)
- [AWS EFS Performance](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [Sentence Transformers](https://www.sbert.net/)

---

**Approved by**: Architecture Team  
**Implementation**: Week of 2025-11-26  
**Expected Savings**: $12.50/mes (69% reduction)
