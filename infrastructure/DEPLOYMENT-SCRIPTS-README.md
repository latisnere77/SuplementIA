# Deployment Scripts - Intelligent Supplement Search

This directory contains scripts for deploying and managing the intelligent supplement search system with gradual traffic rollout.

## Overview

The deployment follows a phased approach with traffic routing:
1. Deploy infrastructure and route 10% traffic to new system
2. Monitor and validate, then increase to 50%
3. Monitor and validate, then increase to 100%
4. Keep legacy system as fallback for 48 hours
5. Cleanup legacy code after validation

## Scripts

### Deployment Scripts

#### `deploy-production-10-percent.sh`
Deploys the production infrastructure and routes 10% of traffic to the new system.

**Usage:**
```bash
./infrastructure/deploy-production-10-percent.sh
```

**What it does:**
- Deploys RDS Postgres with pgvector
- Deploys DynamoDB tables (cache + discovery queue)
- Deploys ElastiCache Redis cluster
- Deploys EFS for ML model storage
- Deploys CloudFront with Lambda@Edge for traffic routing
- Configures 10% traffic to new system, 90% to legacy

**Duration:** 30-40 minutes

**Prerequisites:**
- AWS CLI configured
- Staging environment tested
- Database migrated
- Lambda functions deployed

#### `deploy-production-50-percent.sh`
Updates CloudFront to route 50% of traffic to the new system.

**Usage:**
```bash
./infrastructure/deploy-production-50-percent.sh
```

**What it does:**
- Updates CloudFront Lambda@Edge function
- Changes traffic routing to 50% new, 50% legacy
- Maintains fallback to legacy system

**Duration:** 15-20 minutes

**Prerequisites:**
- System stable at 10% for at least 4 hours
- All validation criteria met

#### `deploy-production-100-percent.sh`
Updates CloudFront to route 100% of traffic to the new system.

**Usage:**
```bash
./infrastructure/deploy-production-100-percent.sh
```

**What it does:**
- Updates CloudFront Lambda@Edge function
- Changes traffic routing to 100% new system
- Keeps legacy system as fallback

**Duration:** 15-20 minutes

**Prerequisites:**
- System stable at 50% for at least 4 hours
- All validation criteria met
- Team ready to monitor 24/7

### Monitoring Scripts

#### `monitor-rollout.sh`
Monitors key metrics during the rollout in real-time.

**Usage:**
```bash
./infrastructure/monitor-rollout.sh [environment] [duration_minutes]

# Examples:
./infrastructure/monitor-rollout.sh production 120  # Monitor for 2 hours
./infrastructure/monitor-rollout.sh production 2880 # Monitor for 48 hours
```

**What it monitors:**
- Lambda invocations and errors
- Error rate (target: < 1%)
- Latency (P50, P95, P99)
- Cache hit rate (target: >= 85%)
- CloudFront requests and errors
- Active CloudWatch alarms
- Traffic distribution

**Output:** Updates every 60 seconds with current metrics

#### `compare-systems.sh`
Compares metrics between new and legacy systems.

**Usage:**
```bash
./infrastructure/compare-systems.sh [environment] [duration_hours]

# Examples:
./infrastructure/compare-systems.sh production 1  # Last 1 hour
./infrastructure/compare-systems.sh production 24 # Last 24 hours
```

**What it compares:**
- Error rates
- Latency (average, P95, P99)
- Cache performance
- Cost estimates
- Overall system health

**Output:** Detailed comparison report with recommendations

### Rollback Scripts

#### `rollback-traffic.sh`
Rolls back traffic routing to a previous percentage.

**Usage:**
```bash
./infrastructure/rollback-traffic.sh <percentage>

# Examples:
./infrastructure/rollback-traffic.sh 10  # Rollback to 10%
./infrastructure/rollback-traffic.sh 0   # Rollback to 100% legacy
```

**What it does:**
- Updates CloudFront Lambda@Edge function
- Changes traffic routing to specified percentage
- Provides immediate rollback capability

**Duration:** 15-20 minutes

**When to use:**
- Error rate exceeds 1%
- P95 latency exceeds 300ms
- Cache hit rate drops below 80%
- Critical issues detected

## Deployment Workflow

### Phase 1: 10% Traffic (Day 1)

```bash
# 1. Deploy infrastructure with 10% traffic
./infrastructure/deploy-production-10-percent.sh

# 2. Monitor for 2 hours
./infrastructure/monitor-rollout.sh production 120

# 3. Compare systems
./infrastructure/compare-systems.sh production 1

# 4. If issues detected, rollback
./infrastructure/rollback-traffic.sh 0
```

**Validation Criteria:**
- ✅ Error rate < 1%
- ✅ P95 latency < 200ms
- ✅ Cache hit rate >= 85%
- ✅ No critical alarms
- ✅ Stable for 4+ hours

### Phase 2: 50% Traffic (Day 2-3)

```bash
# 1. Increase to 50% traffic
./infrastructure/deploy-production-50-percent.sh

# 2. Monitor for 2 hours
./infrastructure/monitor-rollout.sh production 120

# 3. Compare systems
./infrastructure/compare-systems.sh production 1

# 4. If issues detected, rollback
./infrastructure/rollback-traffic.sh 10
```

**Validation Criteria:**
- ✅ Error rate < 1%
- ✅ P95 latency < 200ms
- ✅ Cache hit rate >= 85%
- ✅ No critical alarms
- ✅ Stable for 4+ hours

### Phase 3: 100% Traffic (Day 4-6)

```bash
# 1. Increase to 100% traffic
./infrastructure/deploy-production-100-percent.sh

# 2. Monitor for 48 hours
./infrastructure/monitor-rollout.sh production 2880

# 3. Compare systems periodically
./infrastructure/compare-systems.sh production 24

# 4. If issues detected, rollback
./infrastructure/rollback-traffic.sh 50
```

**Validation Criteria:**
- ✅ Error rate < 1% consistently
- ✅ P95 latency < 200ms consistently
- ✅ Cache hit rate >= 85% consistently
- ✅ No critical alarms
- ✅ Stable for 48+ hours
- ✅ No user-reported issues

### Phase 4: Cleanup (Day 7+)

After 48 hours of stable operation at 100% traffic:

```bash
# 1. Remove legacy code (manual)
git rm lib/portal/supplement-mappings.ts
git rm lib/portal/query-normalization.ts
git commit -m "Remove legacy supplement search code"

# 2. Update documentation (manual)
# Edit README.md and other docs

# 3. Decommission CloudFront traffic routing (optional)
aws cloudformation delete-stack \
  --stack-name production-intelligent-search-cloudfront
```

## Monitoring and Alerting

### CloudWatch Dashboards

View the monitoring dashboard:

```bash
# Get dashboard URL
aws cloudwatch get-dashboard \
  --dashboard-name production-intelligent-search
```

### CloudWatch Alarms

Check active alarms:

```bash
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --alarm-name-prefix production
```

### CloudWatch Logs

View Lambda logs:

```bash
# Search API logs
aws logs tail /aws/lambda/production-search-api --follow

# Embedding generator logs
aws logs tail /aws/lambda/production-embedding-generator --follow

# Discovery worker logs
aws logs tail /aws/lambda/production-discovery-worker --follow
```

### CloudFront Logs

Download and analyze CloudFront logs:

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Download logs
aws s3 sync \
  s3://production-supplement-search-cloudfront-logs-${ACCOUNT_ID}/production/cloudfront/ \
  ./cloudfront-logs/

# Analyze traffic distribution
grep -h "x-routing-target" cloudfront-logs/*.gz | \
  gunzip | \
  awk '{print $NF}' | \
  sort | uniq -c
```

## Troubleshooting

### High Error Rate

```bash
# Check Lambda errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/production-search-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Check database connectivity
aws rds describe-db-instances \
  --db-instance-identifier production-supplements-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check Redis connectivity
aws elasticache describe-cache-clusters \
  --cache-cluster-id production-supplements-redis \
  --query 'CacheClusters[0].CacheClusterStatus'
```

### High Latency

```bash
# Check Lambda duration metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-search-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --extended-statistics p95,p99

# Check database query performance
# (Connect to RDS and run EXPLAIN ANALYZE on slow queries)
```

### Low Cache Hit Rate

```bash
# Check cache metrics
aws cloudwatch get-metric-statistics \
  --namespace IntelligentSearch \
  --metric-name CacheHitRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Check Redis memory usage
aws elasticache describe-cache-clusters \
  --cache-cluster-id production-supplements-redis \
  --show-cache-node-info
```

## Cost Monitoring

### Current Costs

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Cost Breakdown

Expected monthly costs at different traffic levels:

| Traffic | Lambda | DynamoDB | RDS | Redis | EFS | Total |
|---------|--------|----------|-----|-------|-----|-------|
| 10% | $1 | $2 | $15 | $12 | $1 | $31 |
| 50% | $3 | $5 | $15 | $12 | $1 | $36 |
| 100% | $5 | $10 | $15 | $12 | $1 | $43 |

## Security

### IAM Permissions Required

The deployment scripts require the following IAM permissions:

- CloudFormation: Full access
- Lambda: Full access
- RDS: Full access
- DynamoDB: Full access
- ElastiCache: Full access
- EFS: Full access
- CloudFront: Full access
- CloudWatch: Full access
- S3: Full access (for CloudFront logs)
- IAM: Create/update roles and policies

### Security Best Practices

1. **Database Credentials**: Store in AWS Secrets Manager
2. **VPC Security**: RDS and Redis in private subnets
3. **Encryption**: Enable encryption at rest for all services
4. **Access Logs**: Enable CloudFront and S3 access logs
5. **WAF**: Configure WAF rules for API Gateway
6. **Rate Limiting**: Configure API Gateway throttling

## Support

### Contact Information

- **DevOps Lead**: [contact info]
- **Backend Team**: [contact info]
- **On-Call Engineer**: [contact info]

### Escalation Path

1. **Level 1**: Monitor metrics, check logs
2. **Level 2**: Rollback to previous traffic level
3. **Level 3**: Rollback to 100% legacy system
4. **Level 4**: Escalate to engineering leadership

## Additional Resources

- [Production Rollout Guide](./PRODUCTION-ROLLOUT-GUIDE.md)
- [Staging Deployment Guide](./STAGING-DEPLOYMENT-GUIDE.md)
- [Quick Start Guide](./QUICK-START.md)
- [CloudFormation Templates](./cloudformation/)
- [AWS Documentation](https://docs.aws.amazon.com/)

## License

Internal use only. Do not distribute.
