# Task 18: Production Deployment (10% Traffic) - Status Report

## Current State Analysis

### ✅ What's Already Deployed

1. **Production Infrastructure Stack** (`production-intelligent-search`)
   - Status: `CREATE_COMPLETE`
   - Components:
     - DynamoDB Tables: `production-supplement-cache`, `production-discovery-queue`
     - IAM Role: `production-intelligent-search-lambda-role`
     - SNS Topic: `production-intelligent-search-alerts`
     - CloudWatch Log Groups and Alarms

2. **Lambda Functions**
   - `production-search-api-lancedb` - Search API with LanceDB
   - `production-batch-enricher` - Batch enrichment worker

3. **Current Production System**
   - Running on Vercel
   - Domain: TBD (need to identify from Vercel)
   - Serving 100% of traffic

### ❌ What's Missing for Task 18

1. **API Gateway**
   - No REST API Gateway deployed yet
   - Lambda functions don't have public endpoints
   - Need to create API Gateway with:
     - `/search` endpoint → `production-search-api-lancedb`
     - CORS configuration
     - Rate limiting
     - API key validation

2. **CloudFront Distribution**
   - No CloudFront distribution deployed
   - Need to create distribution with:
     - Lambda@Edge for traffic routing
     - Weighted routing (10% new, 90% legacy)
     - Origin groups for failover
     - Logging to S3

3. **Lambda Function URLs** (Alternative to API Gateway)
   - Could use Lambda Function URLs instead of API Gateway
   - Simpler, cheaper option
   - Need to configure CORS and auth

## Deployment Strategy

### Option 1: Full CloudFormation Deployment (Recommended)

Deploy the complete production stack with API Gateway and CloudFront:

```bash
cd infrastructure
./deploy-production-10-percent.sh
```

**Requirements:**
- RDS Postgres password (for future use)
- Legacy system domain (Vercel URL)

**What it deploys:**
1. Updates infrastructure stack (adds RDS, Redis, EFS if needed)
2. Creates API Gateway REST API
3. Deploys CloudFront distribution with Lambda@Edge
4. Configures 10% traffic to new system

**Duration:** 30-40 minutes

### Option 2: Simplified Deployment (Current Architecture)

Since the current production stack is simplified (no RDS/Redis/EFS), we can:

1. **Create Lambda Function URLs** (5 minutes)
   ```bash
   # Create function URL for search API
   aws lambda create-function-url-config \
     --function-name production-search-api-lancedb \
     --auth-type NONE \
     --cors '{
       "AllowOrigins": ["*"],
       "AllowMethods": ["GET", "POST", "OPTIONS"],
       "AllowHeaders": ["*"],
       "MaxAge": 86400
     }'
   ```

2. **Deploy CloudFront with traffic routing** (20 minutes)
   - Use Lambda Function URL as new system origin
   - Use Vercel URL as legacy system origin
   - Deploy CloudFront stack

### Option 3: Gradual Approach (Safest)

1. **Phase 1: Deploy API Gateway only**
   - Create API Gateway for Lambda functions
   - Test endpoints directly
   - Verify functionality

2. **Phase 2: Deploy CloudFront**
   - Create CloudFront distribution
   - Configure traffic routing
   - Start with 0% traffic to new system

3. **Phase 3: Increase to 10%**
   - Update CloudFront configuration
   - Monitor metrics
   - Validate performance

## Recommended Next Steps

### Step 1: Identify Legacy System Domain

```bash
# Get Vercel deployment URL
vercel ls suplementia --prod
```

### Step 2: Choose Deployment Strategy

**For production-ready deployment:**
- Use Option 1 (Full CloudFormation)
- Requires RDS password and legacy domain
- Deploys complete infrastructure

**For quick testing:**
- Use Option 2 (Simplified)
- Uses Lambda Function URLs
- Faster deployment

### Step 3: Pre-Deployment Checklist

- [ ] Staging environment validated (Task 17 complete)
- [ ] All smoke tests passing
- [ ] Lambda functions tested
- [ ] Database migrated (70+ supplements)
- [ ] Team ready to monitor
- [ ] Rollback plan documented
- [ ] Legacy system domain identified
- [ ] RDS password prepared (if using Option 1)

### Step 4: Execute Deployment

```bash
# Option 1: Full deployment
cd infrastructure
./deploy-production-10-percent.sh

# Option 2: Simplified deployment
# (Create script for this approach)
```

### Step 5: Post-Deployment Validation

```bash
# Monitor metrics
./monitor-rollout.sh production 120

# Check CloudFront distribution
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].Outputs'

# Test new system endpoint
curl -X POST "https://<cloudfront-url>/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamin d", "language": "en"}'
```

## Task 18.1: Monitor 10% Traffic for 24 Hours

Once deployment is complete, monitor these metrics:

### Key Metrics

1. **Error Rate** (Target: < 1%)
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

2. **Latency P95** (Target: < 200ms)
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --extended-statistics p95
   ```

3. **Cache Hit Rate** (Target: >= 85%)
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace IntelligentSearch \
     --metric-name CacheHitRate \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

### Monitoring Schedule

- **First 2 hours:** Monitor every 5 minutes
- **Next 6 hours:** Monitor every 30 minutes
- **Next 16 hours:** Monitor every 2 hours
- **After 24 hours:** Review and decide on 50% rollout

### Success Criteria

- [ ] Error rate < 1% consistently
- [ ] P95 latency < 200ms consistently
- [ ] Cache hit rate >= 85%
- [ ] No critical alarms triggered
- [ ] Traffic distribution ~10% new, ~90% legacy
- [ ] No user-reported issues
- [ ] System stable for 24 hours

### Rollback Procedure

If issues detected:

```bash
# Rollback to 0% traffic (100% legacy)
aws cloudformation update-stack \
  --stack-name production-intelligent-search-cloudfront \
  --use-previous-template \
  --parameters \
    ParameterKey=TrafficPercentage,ParameterValue=0 \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for update
aws cloudformation wait stack-update-complete \
  --stack-name production-intelligent-search-cloudfront
```

## Decision Required

**Which deployment strategy should we use?**

1. **Full CloudFormation (Option 1)** - Complete infrastructure with RDS/Redis/EFS
2. **Simplified (Option 2)** - Lambda Function URLs + CloudFront
3. **Gradual (Option 3)** - Step-by-step deployment

**Recommendation:** Option 2 (Simplified) for now, since:
- Current production stack is simplified (no RDS/Redis/EFS)
- Faster deployment
- Lower cost
- Can upgrade to full stack later if needed

## Next Actions

1. **Identify legacy system domain** from Vercel
2. **Choose deployment strategy** based on requirements
3. **Execute deployment** following chosen strategy
4. **Monitor metrics** for 24 hours
5. **Validate success criteria** before proceeding to 50%

---

**Status:** Ready for deployment pending:
- Legacy system domain identification
- Deployment strategy selection
- User approval to proceed
