# Production Rollout Guide - Intelligent Supplement Search

This guide provides step-by-step instructions for gradually rolling out the intelligent supplement search system to production with traffic routing.

## Overview

The rollout follows a phased approach:
1. **Phase 1**: Deploy with 10% traffic to new system
2. **Phase 2**: Increase to 50% traffic after validation
3. **Phase 3**: Increase to 100% traffic after validation
4. **Phase 4**: Cleanup legacy system

Each phase includes monitoring, validation, and rollback procedures.

## Prerequisites

1. **AWS CLI** installed and configured
2. **Staging environment** deployed and tested
3. **Database migration** completed
4. **Lambda functions** deployed and tested
5. **ML model** uploaded to EFS
6. **Backup** of legacy system data

## Phase 1: Deploy with 10% Traffic

### Step 1.1: Pre-Deployment Checklist

Before deploying, verify:

- [ ] Staging environment is stable
- [ ] All smoke tests pass in staging
- [ ] Database has been migrated with all 70+ supplements
- [ ] Lambda functions are deployed and tested
- [ ] EFS has ML model cached
- [ ] CloudWatch dashboards are configured
- [ ] SNS alerts are configured
- [ ] Team is ready to monitor deployment
- [ ] Rollback plan is documented

### Step 1.2: Deploy Infrastructure

Deploy the production infrastructure with 10% traffic routing:

```bash
cd infrastructure
./deploy-production-10-percent.sh
```

This script will:
1. Prompt for RDS master password
2. Prompt for legacy system domain (Vercel)
3. Deploy infrastructure stack (RDS, DynamoDB, Redis, EFS)
4. Deploy CloudFront with Lambda@Edge for traffic routing
5. Configure 10% traffic to new system, 90% to legacy

**Expected Duration**: 30-40 minutes

### Step 1.3: Verify Deployment

After deployment completes, verify all resources:

```bash
# Check infrastructure stack
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search \
  --query 'Stacks[0].StackStatus'

# Check CloudFront stack
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].StackStatus'

# Get CloudFront URL
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text
```

All stacks should show `CREATE_COMPLETE` or `UPDATE_COMPLETE`.

### Step 1.4: Test New System

Test the new system directly (bypassing CloudFront):

```bash
# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name production-intelligent-search \
  --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
  --output text)

# Test search endpoint
curl -X POST "${API_URL}/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamin d", "language": "en"}'

# Test with Spanish query
curl -X POST "${API_URL}/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamina d", "language": "es"}'
```

Expected response:
```json
{
  "success": true,
  "supplement": {
    "name": "Vitamin D",
    "scientificName": "Cholecalciferol",
    "similarity": 0.95
  },
  "latency": 120,
  "cacheHit": false,
  "source": "postgres"
}
```

### Step 1.5: Monitor Metrics

Start monitoring the rollout:

```bash
# Monitor for 2 hours
./monitor-rollout.sh production 120
```

This will display real-time metrics every 60 seconds:
- Lambda invocations and errors
- Error rate (target: < 1%)
- Latency (P50, P95, P99)
- Cache hit rate (target: >= 85%)
- CloudFront requests and errors
- Active alarms

### Step 1.6: Compare Systems

Compare metrics between new and legacy systems:

```bash
# View CloudWatch dashboard
aws cloudwatch get-dashboard \
  --dashboard-name production-intelligent-search

# Check error rate (last hour)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check P95 latency (last hour)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --extended-statistics p95
```

### Step 1.7: Analyze CloudFront Logs

Download and analyze CloudFront logs to verify traffic distribution:

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Download logs (last hour)
aws s3 sync \
  s3://production-supplement-search-cloudfront-logs-${ACCOUNT_ID}/production/cloudfront/ \
  ./cloudfront-logs/ \
  --exclude "*" \
  --include "$(date -u +%Y-%m-%d)*"

# Analyze traffic distribution
grep -h "x-routing-target" cloudfront-logs/*.gz | \
  gunzip | \
  awk '{print $NF}' | \
  sort | uniq -c
```

Expected output (approximately):
```
  900 legacy-system
  100 new-system
```

### Step 1.8: Validation Criteria

Before proceeding to 50% traffic, verify:

- [ ] Error rate < 1% for new system
- [ ] P95 latency < 200ms for new system
- [ ] Cache hit rate >= 85%
- [ ] No critical alarms triggered
- [ ] Traffic distribution is ~10% new, ~90% legacy
- [ ] No user-reported issues
- [ ] System has been stable for at least 4 hours

### Step 1.9: Rollback Procedure (if needed)

If issues are detected, rollback to 100% legacy traffic:

```bash
# Update CloudFront stack to route 0% to new system
aws cloudformation update-stack \
  --stack-name production-intelligent-search-cloudfront \
  --use-previous-template \
  --parameters \
    ParameterKey=Environment,UsePreviousValue=true \
    ParameterKey=NewSystemOriginDomain,UsePreviousValue=true \
    ParameterKey=LegacySystemOriginDomain,UsePreviousValue=true \
    ParameterKey=TrafficPercentage,ParameterValue=0 \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for update to complete
aws cloudformation wait stack-update-complete \
  --stack-name production-intelligent-search-cloudfront

# Verify rollback
echo "Rollback complete. All traffic now routed to legacy system."
```

## Phase 2: Increase to 50% Traffic

### Prerequisites

- Phase 1 completed successfully
- System stable for at least 4 hours at 10% traffic
- All validation criteria met
- Team ready to monitor increased traffic

### Step 2.1: Deploy 50% Traffic

```bash
./deploy-production-50-percent.sh
```

### Step 2.2: Monitor Metrics

Monitor for at least 2 hours:

```bash
./monitor-rollout.sh production 120
```

### Step 2.3: Validation Criteria

Before proceeding to 100% traffic, verify:

- [ ] Error rate < 1% for new system
- [ ] P95 latency < 200ms for new system
- [ ] Cache hit rate >= 85%
- [ ] No critical alarms triggered
- [ ] Traffic distribution is ~50% new, ~50% legacy
- [ ] No user-reported issues
- [ ] System has been stable for at least 4 hours

## Phase 3: Increase to 100% Traffic

### Prerequisites

- Phase 2 completed successfully
- System stable for at least 4 hours at 50% traffic
- All validation criteria met
- Team ready to monitor full traffic

### Step 3.1: Deploy 100% Traffic

```bash
./deploy-production-100-percent.sh
```

### Step 3.2: Monitor Metrics

Monitor for at least 48 hours:

```bash
# Monitor for 48 hours (2880 minutes)
./monitor-rollout.sh production 2880
```

### Step 3.3: Keep Legacy System as Fallback

Keep the legacy system running for 48 hours as a fallback:

- Do not delete legacy infrastructure
- Keep legacy system deployments active
- Monitor both systems
- Be ready to rollback if needed

### Step 3.4: Final Validation

After 48 hours of stable operation at 100% traffic:

- [ ] Error rate < 1% consistently
- [ ] P95 latency < 200ms consistently
- [ ] Cache hit rate >= 85% consistently
- [ ] No critical alarms triggered
- [ ] No user-reported issues
- [ ] Cost is within budget ($25-60/month)
- [ ] All features working correctly

## Phase 4: Cleanup Legacy System

### Prerequisites

- Phase 3 completed successfully
- System stable for 48 hours at 100% traffic
- All validation criteria met
- Backup of legacy data completed

### Step 4.1: Remove Legacy Code

```bash
# Remove legacy files (as per task 16.1)
git rm lib/portal/supplement-mappings.ts
git rm lib/portal/query-normalization.ts

# Commit changes
git commit -m "Remove legacy supplement search code"
git push
```

### Step 4.2: Update Documentation

Update README and documentation to reflect new architecture.

### Step 4.3: Decommission Legacy Infrastructure

After confirming new system is stable:

```bash
# Remove CloudFront traffic routing (no longer needed)
aws cloudformation delete-stack \
  --stack-name production-intelligent-search-cloudfront

# Keep production infrastructure running
# (RDS, DynamoDB, Redis, Lambda, etc.)
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1%
   - Alert threshold: > 1%
   - Action: Investigate immediately, consider rollback

2. **Latency (P95)**
   - Target: < 200ms
   - Alert threshold: > 300ms
   - Action: Investigate performance, optimize if needed

3. **Cache Hit Rate**
   - Target: >= 85%
   - Alert threshold: < 80%
   - Action: Investigate cache configuration

4. **CloudFront 5xx Errors**
   - Target: < 0.1%
   - Alert threshold: > 0.5%
   - Action: Check origin health, investigate errors

### CloudWatch Dashboards

Access the monitoring dashboard:

```bash
# Open in browser
aws cloudwatch get-dashboard \
  --dashboard-name production-intelligent-search \
  --query 'DashboardBody' \
  --output text | jq -r
```

### SNS Alerts

Configure SNS topic for alerts:

```bash
# Subscribe email to alerts
aws sns subscribe \
  --topic-arn $(aws cloudformation describe-stacks \
    --stack-name production-intelligent-search \
    --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' \
    --output text) \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Troubleshooting

### High Error Rate

1. Check CloudWatch logs for error details
2. Verify database connectivity
3. Check Redis connectivity
4. Verify EFS model is accessible
5. Review Lambda function configuration

### High Latency

1. Check cache hit rate
2. Verify pgvector index is being used
3. Check database query performance
4. Review Lambda cold start times
5. Optimize embedding generation

### Low Cache Hit Rate

1. Verify DynamoDB TTL configuration
2. Check Redis eviction policy
3. Review cache key generation
4. Analyze search patterns
5. Adjust cache warming strategy

### Traffic Not Routing Correctly

1. Check Lambda@Edge function logs
2. Verify CloudFront distribution configuration
3. Review traffic percentage parameter
4. Check origin health
5. Analyze CloudFront access logs

## Cost Monitoring

Monitor costs during rollout:

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Set budget alert
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json
```

Expected monthly costs:
- 10% traffic: ~$15-20/month
- 50% traffic: ~$20-30/month
- 100% traffic: ~$25-60/month

## Support and Escalation

### Contact Information

- **DevOps Lead**: [contact info]
- **Backend Team**: [contact info]
- **On-Call Engineer**: [contact info]

### Escalation Path

1. **Level 1**: Monitor metrics, investigate logs
2. **Level 2**: Rollback to previous traffic level
3. **Level 3**: Rollback to 100% legacy system
4. **Level 4**: Escalate to engineering leadership

## Success Criteria

The rollout is considered successful when:

- ✅ Error rate < 1% consistently
- ✅ P95 latency < 200ms consistently
- ✅ Cache hit rate >= 85% consistently
- ✅ System stable for 48 hours at 100% traffic
- ✅ No critical issues reported
- ✅ Cost within budget
- ✅ All features working correctly
- ✅ Legacy system decommissioned

## Conclusion

This gradual rollout approach minimizes risk by:
- Starting with small traffic percentage (10%)
- Monitoring metrics at each phase
- Validating before increasing traffic
- Keeping legacy system as fallback
- Providing clear rollback procedures

Follow this guide carefully and don't rush the process. It's better to take extra time validating each phase than to rush and encounter issues at scale.
