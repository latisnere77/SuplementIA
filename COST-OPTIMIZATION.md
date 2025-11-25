# Cost Optimization Strategies - Intelligent Supplement Search

## Current Cost Structure

### Monthly Costs (10K searches/day)

| Service | Cost | Optimization Potential |
|---------|------|----------------------|
| CloudFront + Lambda@Edge | $3 | Low (already optimized) |
| DynamoDB + DAX | $8 | Medium (cache tuning) |
| ElastiCache Redis | $12 | Medium (instance sizing) |
| RDS Postgres | $0-15 | High (free tier, then scaling) |
| Lambda (embeddings) | $0 | None (free tier) |
| EFS (model storage) | $1 | Low (minimal storage) |
| DynamoDB (queue) | $1 | Low (on-demand) |
| **Total** | **$25-40/month** | |

## Optimization Strategies

### 1. Multi-Tier Caching (Highest Impact)

**Current Implementation:**
```
Request → DAX (< 1ms) → Redis (< 5ms) → RDS (< 50ms)
```

**Optimization:**
- Target 90%+ cache hit rate on DAX
- Target 85%+ cache hit rate on Redis
- Reduces RDS queries by 90%

**Cost Savings:**
- Reduces RDS compute by 90%: **$13.50/month saved**
- Reduces DynamoDB reads by 85%: **$6.80/month saved**
- **Total: ~$20/month saved**

**Implementation:**
```typescript
// Aggressive cache TTL
const CACHE_TTL = {
  dax: 7 * 24 * 60 * 60,      // 7 days
  redis: 7 * 24 * 60 * 60,    // 7 days
  cloudfront: 24 * 60 * 60    // 1 day
};

// Pre-populate popular supplements
async function warmCache() {
  const popular = await getPopularSupplements(100);
  await Promise.all(
    popular.map(s => cacheInAllTiers(s))
  );
}
```

---

### 2. Local ML (Zero API Costs)

**Current Implementation:**
- Sentence Transformers in Lambda
- Model cached in EFS
- Zero per-request cost

**Alternative (Expensive):**
- OpenAI Embeddings: $0.0001/embedding
- 10K searches/day = $30/month
- 100K searches/day = $300/month

**Cost Savings:**
- **$30-300/month saved** vs external API

**Implementation:**
```python
# Lambda with EFS-cached model
from sentence_transformers import SentenceTransformer

# Load once, cache in memory
model = SentenceTransformer('/mnt/ml-models/all-MiniLM-L6-v2')

def generate_embedding(text):
    return model.encode(text)  # Free!
```

---

### 3. DAX Cluster Optimization

**Current Setup:**
- DAX t3.small: $0.04/hour = $29/month
- 10x faster than DynamoDB
- 10x cheaper per read

**Optimization Options:**

#### Option A: Smaller Instance (Low Traffic)
```
t3.micro: $0.02/hour = $14.50/month
Savings: $14.50/month
Trade-off: Lower throughput
```

#### Option B: Larger Instance (High Traffic)
```
t3.medium: $0.08/hour = $58/month
Cost increase: $29/month
Benefit: 2x throughput, handles 100K searches/day
```

**Recommendation:**
- Start with t3.small
- Monitor cache hit rate and latency
- Scale up only if P95 latency > 5ms

---

### 4. RDS Free Tier Maximization

**Free Tier Benefits (12 months):**
- db.t3.micro: 750 hours/month
- 20GB storage
- 20GB backup

**After Free Tier:**
- db.t3.micro: $15/month
- Multi-AZ: $30/month (production only)

**Optimization:**
```sql
-- Optimize queries
CREATE INDEX idx_supplements_search_count 
ON supplements(search_count DESC);

CREATE INDEX idx_supplements_embedding 
USING hnsw (embedding vector_cosine_ops);

-- Vacuum regularly
VACUUM ANALYZE supplements;

-- Monitor slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

**Cost Savings:**
- Efficient indexes reduce compute by 50%
- **$7.50/month saved** on RDS

---

### 5. Lambda Free Tier Optimization

**Free Tier Limits:**
- 1M requests/month
- 400K GB-seconds compute

**Current Usage (10K searches/day):**
- 300K requests/month (30% of free tier)
- 50K GB-seconds (12.5% of free tier)

**Optimization:**
```typescript
// Increase memory for faster execution
// 512MB @ 200ms = 0.1 GB-seconds
// 1024MB @ 100ms = 0.1 GB-seconds (same cost, 2x faster!)

export const handler = {
  memorySize: 1024,  // Increase memory
  timeout: 10,       // Reduce timeout
  reservedConcurrency: 10  // Limit concurrent executions
};
```

**Cost Savings:**
- Stay within free tier: **$0 cost**
- Faster execution = better UX

---

### 6. ElastiCache Redis Optimization

**Current Setup:**
- cache.t3.micro: $0.017/hour = $12/month
- 0.5GB memory
- Cluster mode enabled

**Optimization Options:**

#### Option A: Smaller Instance
```
cache.t2.micro: $0.012/hour = $8.64/month
Savings: $3.36/month
Trade-off: No cluster mode
```

#### Option B: Disable Cluster Mode (Low Traffic)
```
Single node: $8.64/month
Savings: $3.36/month
Trade-off: No high availability
```

**Recommendation:**
- Use cache.t3.micro with cluster mode for production
- Use cache.t2.micro single node for staging
- **Savings: $3.36/month on staging**

---

### 7. CloudFront Optimization

**Current Costs:**
- $0.085/GB data transfer
- $0.0075/10K requests
- ~$3/month for 10K searches/day

**Optimization:**
```javascript
// Aggressive edge caching
const cloudfrontConfig = {
  defaultTTL: 86400,        // 24 hours
  maxTTL: 604800,           // 7 days
  minTTL: 3600,             // 1 hour
  compress: true,           // Enable compression
  viewerProtocolPolicy: 'redirect-to-https'
};

// Cache popular supplements at edge
const edgeCacheKeys = [
  'vitamin-d3',
  'magnesium-glycinate',
  'omega-3',
  // ... top 100 supplements
];
```

**Cost Savings:**
- 90% cache hit rate at edge
- Reduces origin requests by 90%
- **$2.70/month saved** on data transfer

---

### 8. DynamoDB On-Demand vs Provisioned

**Current Setup:**
- On-demand pricing
- Pay per request
- No capacity planning needed

**Cost Comparison (10K searches/day):**

| Mode | Cost | Pros | Cons |
|------|------|------|------|
| On-demand | $8/month | Simple, auto-scaling | Higher per-request cost |
| Provisioned | $5/month | Lower cost at scale | Requires capacity planning |

**Optimization:**
```typescript
// Switch to provisioned for predictable traffic
const provisionedCapacity = {
  readCapacityUnits: 5,   // 5 reads/sec
  writeCapacityUnits: 1   // 1 write/sec
};

// Enable auto-scaling
const autoScaling = {
  minCapacity: 5,
  maxCapacity: 50,
  targetUtilization: 70
};
```

**Cost Savings:**
- **$3/month saved** with provisioned capacity
- Only for predictable traffic patterns

---

### 9. EFS Optimization

**Current Usage:**
- 1GB for ML model
- $0.30/GB/month = $0.30/month

**Optimization:**
- Use EFS Infrequent Access (IA): $0.025/GB/month
- **Savings: $0.275/month** (minimal)

**Not Recommended:**
- Model needs frequent access
- IA has higher access costs
- Keep standard EFS

---

### 10. Discovery Queue Optimization

**Current Setup:**
- DynamoDB on-demand
- ~$1/month for queue operations

**Optimization:**
```typescript
// Batch processing
const batchSize = 25;  // Max DynamoDB batch size

async function processBatch(items) {
  const batch = items.slice(0, batchSize);
  await dynamodb.batchWriteItem({
    RequestItems: {
      'discovery-queue': batch.map(item => ({
        PutRequest: { Item: item }
      }))
    }
  });
}

// Priority-based processing
const priorities = {
  high: 10,    // > 10 searches
  medium: 5,   // 5-10 searches
  low: 1       // < 5 searches
};
```

**Cost Savings:**
- Batch operations reduce costs by 50%
- **$0.50/month saved**

---

## Cost Scaling Projections

### 1 User (12 searches/month)
```
CloudFront: $0
Lambda: $0 (free tier)
DynamoDB: $0 (free tier)
RDS: $0 (free tier)
Total: $0/month
```

### 10K Searches/Day (300K/month)
```
CloudFront: $3
Lambda: $0 (free tier)
DynamoDB + DAX: $8
Redis: $12
RDS: $0 (free tier)
EFS: $1
Total: $24/month
```

### 100K Searches/Day (3M/month)
```
CloudFront: $15
Lambda: $5
DynamoDB + DAX: $25
Redis: $25
RDS: $15
EFS: $1
Total: $86/month
```

### 1M Searches/Day (30M/month)
```
CloudFront: $80
Lambda: $30
DynamoDB + DAX: $150
Redis: $100
RDS: $50
EFS: $1
Total: $411/month
```

---

## Cost Monitoring

### CloudWatch Cost Anomaly Detection
```bash
aws ce get-anomalies \
  --monitor-arn arn:aws:ce::123456789012:anomalymonitor/monitor-id \
  --date-interval Start=2024-01-01,End=2024-01-31
```

### Cost Allocation Tags
```typescript
const tags = {
  Project: 'SuplementIA',
  Environment: 'Production',
  Component: 'Search',
  CostCenter: 'Engineering'
};
```

### Budget Alerts
```yaml
budgets:
  - name: monthly-budget
    amount: 50
    threshold: 80  # Alert at 80% ($40)
    notification:
      email: devops@suplementia.com
```

---

## Cost Optimization Checklist

### Daily
- [ ] Monitor cache hit rates
- [ ] Check for cost anomalies
- [ ] Review error rates (errors = wasted compute)

### Weekly
- [ ] Analyze slow queries
- [ ] Review Lambda execution times
- [ ] Check discovery queue backlog

### Monthly
- [ ] Review AWS Cost Explorer
- [ ] Optimize cache TTLs
- [ ] Right-size instances
- [ ] Clean up unused resources

### Quarterly
- [ ] Evaluate Reserved Instances
- [ ] Review Savings Plans
- [ ] Benchmark against alternatives
- [ ] Capacity planning

---

## Cost Optimization Tools

### AWS Cost Explorer
```bash
# View costs by service
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### AWS Trusted Advisor
- Cost optimization recommendations
- Idle resource detection
- Reserved Instance recommendations

### Third-Party Tools
- CloudHealth
- CloudCheckr
- Spot.io

---

## Summary

### Top 5 Cost Optimizations

1. **Multi-tier caching** → $20/month saved
2. **Local ML** → $30-300/month saved
3. **RDS optimization** → $7.50/month saved
4. **CloudFront edge caching** → $2.70/month saved
5. **DynamoDB provisioned capacity** → $3/month saved

**Total Potential Savings: $63-343/month**

### Cost per Search

| Traffic Level | Cost/Search | Notes |
|--------------|-------------|-------|
| 10K/day | $0.0008 | Mostly free tier |
| 100K/day | $0.00029 | Economies of scale |
| 1M/day | $0.00014 | Maximum efficiency |

### ROI Analysis

**Investment:**
- Development: 4 weeks
- Infrastructure setup: 1 week
- Total: ~$20K

**Savings:**
- Reduced errors: $5K/year (less support)
- Reduced maintenance: $10K/year (8 hours/month → 1 hour/month)
- Reduced API costs: $3.6K/year (vs OpenAI embeddings)
- **Total: $18.6K/year**

**Payback Period: 13 months**

---

## References

- [AWS Cost Optimization](https://aws.amazon.com/pricing/cost-optimization/)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [RDS Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
