# Deployment Guide - Intelligent Supplement Search

This guide covers deploying the AWS-based intelligent supplement search system.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ installed
- Python 3.9+ installed (for Lambda functions)
- Terraform or AWS CloudFormation knowledge (optional)

## Architecture Components

### 1. CloudFront + Lambda@Edge
- Global CDN with 450+ edge locations
- Lambda@Edge for request routing and validation
- SSL/TLS termination

### 2. DynamoDB + DAX
- L1 cache with microsecond latency
- TTL: 7 days
- On-demand billing

### 3. ElastiCache Redis
- L2 cache with millisecond latency
- Cluster mode enabled
- LRU eviction policy

### 4. RDS Postgres + pgvector
- Vector search database
- HNSW index for fast similarity search
- Multi-AZ for high availability

### 5. Lambda Functions
- **search-api**: Vector search endpoint
- **embedding-generator**: ML embeddings (Sentence Transformers)
- **discovery-worker**: Auto-discovery background processing
- **content-enricher**: Content generation
- **studies-fetcher**: PubMed integration

### 6. EFS
- ML model storage (all-MiniLM-L6-v2)
- Shared across Lambda instances
- Eliminates cold start model loading

## Deployment Steps

### Phase 1: Infrastructure Setup

#### 1.1 Deploy Staging Environment
```bash
cd infrastructure
./deploy-staging.sh
```

This creates:
- RDS Postgres instance with pgvector
- DynamoDB tables (cache + discovery queue)
- DAX cluster
- ElastiCache Redis cluster
- EFS file system
- Lambda functions
- API Gateway
- CloudFront distribution

#### 1.2 Upload ML Model to EFS
```bash
cd backend/lambda
./upload-model-to-efs.sh
```

This downloads and uploads the Sentence Transformers model to EFS.

#### 1.3 Run Smoke Tests
```bash
cd infrastructure
./smoke-tests.sh
```

Verifies:
- All services are running
- Database connectivity
- Cache functionality
- API endpoints responding

### Phase 2: Data Migration

#### 2.1 Export Legacy Supplements
The legacy supplement-mappings.ts file has been removed. If you need to migrate data:

```bash
# Export from old system (if applicable)
node scripts/export-legacy-supplements.js > supplements.json
```

#### 2.2 Import to RDS Postgres
```bash
# Generate embeddings and import
node scripts/import-to-rds.ts
```

This:
- Reads supplement data
- Generates embeddings using Lambda
- Inserts into RDS Postgres
- Verifies vector index

#### 2.3 Pre-populate Caches
```bash
# Warm up caches with popular supplements
node scripts/prepopulate-caches.ts
```

### Phase 3: Production Deployment

#### 3.1 Deploy with 10% Traffic
```bash
cd infrastructure
./deploy-production-10-percent.sh
```

Monitor metrics:
- Error rate
- Latency (P50, P95, P99)
- Cache hit rate

#### 3.2 Increase to 50% Traffic
```bash
./deploy-production-50-percent.sh
```

Continue monitoring for 24 hours.

#### 3.3 Increase to 100% Traffic
```bash
./deploy-production-100-percent.sh
```

Monitor for 48 hours before considering rollout complete.

### Phase 4: Monitoring Setup

#### 4.1 CloudWatch Dashboards
Access pre-configured dashboards:
- Search latency metrics
- Cache hit rates
- Error rates
- Discovery queue size

#### 4.2 CloudWatch Alarms
Configured alerts for:
- Error rate > 1%
- Cache hit rate < 80%
- P95 latency > 300ms
- Discovery queue backlog > 100

#### 4.3 X-Ray Tracing
Enable distributed tracing:
```bash
aws xray get-trace-summaries --start-time $(date -u -d '1 hour ago' +%s) --end-time $(date -u +%s)
```

## API Endpoints

### Search Endpoint
```bash
curl -X POST https://api.suplementia.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "magnesium glycinate",
    "language": "es"
  }'
```

Response:
```json
{
  "supplement": {
    "id": 123,
    "name": "Magnesium Glycinate",
    "scientificName": "Magnesium",
    "commonNames": ["Magnesio Glicinato", "Magnesium Bisglycinate"],
    "similarity": 0.95,
    "metadata": {
      "category": "mineral",
      "evidenceGrade": "A",
      "studyCount": 150
    }
  },
  "latency": 45,
  "cacheHit": true,
  "source": "dax"
}
```

### Create Supplement
```bash
curl -X POST https://api.suplementia.com/supplements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Berberine",
    "scientificName": "Berberis vulgaris",
    "commonNames": ["Berberina"],
    "category": "herb"
  }'
```

### Update Supplement
```bash
curl -X PUT https://api.suplementia.com/supplements/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "metadata": {
      "evidenceGrade": "B",
      "studyCount": 75
    }
  }'
```

## Rollback Procedure

If issues are detected:

```bash
cd infrastructure
./rollback-traffic.sh
```

This:
1. Routes 100% traffic back to legacy system
2. Preserves new system for debugging
3. Allows gradual re-deployment after fixes

## Cost Monitoring

### View Current Costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Cost Breakdown by Service
- CloudFront: ~$3/month (10K searches/day)
- DynamoDB + DAX: ~$8/month
- ElastiCache Redis: ~$12/month
- RDS Postgres: $0 (free tier) or ~$15/month
- Lambda: $0 (free tier)
- EFS: ~$1/month

### Cost Optimization Tips
1. Enable DAX for 10x cost reduction on DynamoDB reads
2. Use ElastiCache Redis for high-frequency queries
3. Implement aggressive caching (85%+ hit rate)
4. Use Lambda free tier for embeddings (1M requests/month)
5. Enable RDS Multi-AZ only in production

## Troubleshooting

### High Latency
1. Check cache hit rate: `aws cloudwatch get-metric-statistics ...`
2. Verify DAX cluster health
3. Check RDS query performance
4. Review X-Ray traces

### High Error Rate
1. Check Lambda logs: `aws logs tail /aws/lambda/search-api --follow`
2. Verify database connectivity
3. Check PubMed API rate limits
4. Review CloudWatch alarms

### Low Cache Hit Rate
1. Verify TTL configuration (7 days)
2. Check cache eviction rate
3. Review popular supplement queries
4. Consider increasing cache size

### Discovery Queue Backlog
1. Check worker Lambda concurrency
2. Verify PubMed API availability
3. Review failed validation logs
4. Consider increasing worker instances

## Security Considerations

### API Authentication
- Use AWS Cognito for user authentication
- Implement API key rotation
- Enable request signing

### Data Encryption
- Enable encryption at rest (RDS, DynamoDB, EFS)
- Use TLS 1.3 for all connections
- Rotate SSL certificates annually

### Rate Limiting
- Per-IP: 100 requests/minute
- Per-user: 1000 requests/day
- PubMed API: Exponential backoff

### Input Validation
- Sanitize all user queries
- Limit query length (max 200 chars)
- Block SQL injection attempts
- Validate embedding dimensions

## Maintenance

### Weekly Tasks
- Review CloudWatch metrics
- Check error logs
- Monitor cache hit rates
- Review discovery queue

### Monthly Tasks
- Update ML model if needed
- Review cost optimization
- Update SSL certificates
- Backup RDS database

### Quarterly Tasks
- Performance testing
- Security audit
- Cost analysis
- Capacity planning

## Support

For issues or questions:
- Check [infrastructure/QUICK-REFERENCE.md](infrastructure/QUICK-REFERENCE.md)
- Review [.kiro/specs/intelligent-supplement-search/](..kiro/specs/intelligent-supplement-search/)
- Contact DevOps team

## References

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
