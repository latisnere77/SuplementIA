# Task 18.1: Monitor 10% Traffic for 24 Hours - Complete Guide

## Overview

This guide provides detailed instructions for monitoring the production deployment at 10% traffic for 24 hours, as required by Task 18.1.

## Monitoring Requirements

Per the task requirements (9.3, 9.4, 9.5), we must monitor:

1. **Error Rate** - Check error rate (Requirement 9.3)
2. **Latency** - Monitor latency (Requirement 9.4)
3. **Cache Hit Rate** - Verify cache hit rate (Requirement 9.5)

## Quick Start

### Option 1: Automated 24-Hour Monitoring (Recommended)

Run the automated monitoring script:

```bash
cd infrastructure
./monitor-production-24h.sh
```

This script will:
- Check metrics every 5 minutes for 24 hours
- Alert on threshold violations
- Log all data to a timestamped file
- Generate a summary report
- Provide recommendation for 50% rollout

### Option 2: Manual Monitoring

For manual monitoring at specific intervals:

```bash
# Monitor for 2 hours (check every minute)
./monitor-rollout.sh production 120

# Monitor for 4 hours
./monitor-rollout.sh production 240

# Monitor for 8 hours
./monitor-rollout.sh production 480
```

## Monitoring Schedule

### Phase 1: First 2 Hours (Critical)

**Frequency:** Every 5 minutes

**Focus:**
- Immediate error detection
- Performance validation
- Traffic distribution verification

**Actions:**
```bash
# Start intensive monitoring
./monitor-rollout.sh production 120
```

**What to watch:**
- Error rate spikes
- Latency increases
- Cache hit rate drops
- CloudFront errors

### Phase 2: Hours 2-8 (Active)

**Frequency:** Every 30 minutes

**Focus:**
- Trend analysis
- Pattern identification
- Resource utilization

**Actions:**
```bash
# Check metrics every 30 minutes
watch -n 1800 './monitor-rollout.sh production 1'
```

### Phase 3: Hours 8-24 (Passive)

**Frequency:** Every 2 hours

**Focus:**
- Long-term stability
- Cost monitoring
- User feedback

**Actions:**
```bash
# Periodic checks
watch -n 7200 './monitor-rollout.sh production 1'
```

## Key Metrics

### 1. Error Rate (Requirement 9.3)

**Target:** < 1%
**Warning Threshold:** > 0.5%
**Critical Threshold:** > 1%

**Check Command:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

**Interpretation:**
- **< 0.5%:** Excellent - System performing well
- **0.5-1%:** Good - Monitor closely
- **1-2%:** Warning - Investigate errors
- **> 2%:** Critical - Consider rollback

**Actions if High:**
1. Check CloudWatch logs for error details
2. Identify error patterns
3. Verify database connectivity
4. Check cache operations
5. Review recent deployments

### 2. Latency (Requirement 9.4)

**Target:** P95 < 200ms
**Warning Threshold:** P95 > 250ms
**Critical Threshold:** P95 > 300ms

**Check Command:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --extended-statistics p50,p95,p99 \
  --region us-east-1
```

**Interpretation:**
- **P95 < 200ms:** Excellent - Meeting target
- **P95 200-250ms:** Good - Acceptable performance
- **P95 250-300ms:** Warning - Optimization needed
- **P95 > 300ms:** Critical - Performance issue

**Actions if High:**
1. Check cold start frequency
2. Analyze database query performance
3. Review cache hit rate
4. Check Lambda memory allocation
5. Investigate network latency

### 3. Cache Hit Rate (Requirement 9.5)

**Target:** >= 85%
**Warning Threshold:** < 80%
**Critical Threshold:** < 70%

**Check Command:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace IntelligentSearch \
  --metric-name CacheHitRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

**Interpretation:**
- **>= 85%:** Excellent - Cache working well
- **80-85%:** Good - Acceptable performance
- **70-80%:** Warning - Cache optimization needed
- **< 70%:** Critical - Cache issue

**Actions if Low:**
1. Check DynamoDB cache table
2. Verify TTL configuration
3. Analyze query patterns
4. Review cache warming strategy
5. Check cache invalidation logic

## Additional Metrics

### CloudFront Metrics

**4xx Error Rate:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --dimensions Name=DistributionId,Value=<DISTRIBUTION_ID> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

**5xx Error Rate:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=<DISTRIBUTION_ID> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

### Lambda Concurrent Executions

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=production-search-api-lancedb \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum \
  --region us-east-1
```

## Traffic Distribution Analysis

### Download CloudFront Logs

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Download today's logs
aws s3 sync \
  s3://production-supplement-search-cloudfront-logs-${ACCOUNT_ID}/production/cloudfront/ \
  ./cloudfront-logs/ \
  --exclude "*" \
  --include "$(date -u +%Y-%m-%d)*"
```

### Analyze Traffic Split

```bash
# Count requests by routing target
grep -h "x-routing-target" cloudfront-logs/*.gz | \
  gunzip | \
  awk '{print $NF}' | \
  sort | uniq -c | \
  awk '{printf "%s: %d (%.1f%%)\n", $2, $1, ($1/total)*100}'
```

Expected output:
```
legacy-system: 900 (90.0%)
new-system: 100 (10.0%)
```

### Hourly Traffic Analysis

```bash
# Traffic by hour
for hour in {00..23}; do
  echo "Hour ${hour}:00"
  grep -h "${hour}:" cloudfront-logs/*.gz | \
    gunzip | \
    grep "x-routing-target" | \
    awk '{print $NF}' | \
    sort | uniq -c
  echo ""
done
```

## CloudWatch Dashboard

### View Dashboard

```bash
# Get dashboard JSON
aws cloudwatch get-dashboard \
  --dashboard-name production-intelligent-search \
  --region us-east-1 \
  --query 'DashboardBody' \
  --output text | jq -r
```

### Key Dashboard Widgets

1. **Lambda Invocations** - Total requests
2. **Lambda Errors** - Error count
3. **Lambda Duration** - Latency metrics
4. **Cache Hit Rate** - Cache performance
5. **CloudFront Requests** - Total traffic
6. **CloudFront Errors** - 4xx/5xx rates

## Alerting

### Active Alarms

Check for triggered alarms:

```bash
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --alarm-name-prefix production \
  --region us-east-1 \
  --query 'MetricAlarms[*].[AlarmName,StateReason]' \
  --output table
```

### Configure SNS Notifications

Subscribe to alerts:

```bash
# Get SNS topic ARN
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name production-intelligent-search \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' \
  --output text)

# Subscribe email
aws sns subscribe \
  --topic-arn ${TOPIC_ARN} \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1
```

## Monitoring Checklist

### Hourly Checks (First 8 Hours)

- [ ] Error rate < 1%
- [ ] P95 latency < 300ms
- [ ] Cache hit rate >= 80%
- [ ] No critical alarms
- [ ] CloudFront 5xx < 1%
- [ ] Traffic distribution ~10%/90%

### Every 4 Hours (Hours 8-24)

- [ ] Review error trends
- [ ] Check latency trends
- [ ] Verify cache performance
- [ ] Review CloudWatch logs
- [ ] Check user feedback
- [ ] Monitor costs

### End of 24 Hours

- [ ] Generate summary report
- [ ] Calculate overall metrics
- [ ] Review all logs
- [ ] Document any issues
- [ ] Make go/no-go decision for 50%

## Success Criteria

After 24 hours, all of the following must be true:

### Error Rate
- [ ] Overall error rate < 1%
- [ ] No error rate spikes > 2%
- [ ] Error rate stable or decreasing

### Latency
- [ ] P95 latency < 200ms average
- [ ] No latency spikes > 500ms
- [ ] Latency stable or decreasing

### Cache Performance
- [ ] Cache hit rate >= 85% average
- [ ] Cache hit rate improving over time
- [ ] No cache failures

### System Stability
- [ ] No critical alarms triggered
- [ ] No system outages
- [ ] No data corruption

### Traffic Distribution
- [ ] Traffic split ~10%/90% (±2%)
- [ ] Both systems handling traffic
- [ ] No routing errors

### User Experience
- [ ] No user-reported issues
- [ ] No increase in support tickets
- [ ] Positive or neutral feedback

## Decision Matrix

### Proceed to 50% Traffic

**Conditions:**
- All success criteria met
- No critical issues identified
- Team confident in system stability
- User feedback positive

**Action:**
```bash
cd infrastructure
./deploy-production-50-percent.sh
```

### Continue at 10% Traffic

**Conditions:**
- Minor issues identified
- Need more data
- Want longer observation period

**Action:**
- Continue monitoring
- Fix identified issues
- Re-evaluate after another 24 hours

### Rollback to 0% Traffic

**Conditions:**
- Error rate > 2%
- P95 latency > 500ms
- Critical system failures
- User-reported issues

**Action:**
```bash
cd infrastructure
./rollback-traffic.sh 0
```

## Troubleshooting

### High Error Rate

**Investigation Steps:**
1. View recent errors:
   ```bash
   aws logs tail /aws/lambda/production-search-api-lancedb --follow
   ```

2. Filter by error type:
   ```bash
   aws logs filter-pattern /aws/lambda/production-search-api-lancedb \
     --filter-pattern "ERROR" \
     --start-time $(date -u -d '1 hour ago' +%s)000
   ```

3. Check error distribution:
   ```bash
   aws logs filter-pattern /aws/lambda/production-search-api-lancedb \
     --filter-pattern "ERROR" \
     --start-time $(date -u -d '24 hours ago' +%s)000 | \
     jq -r '.message' | \
     sort | uniq -c | sort -rn
   ```

### High Latency

**Investigation Steps:**
1. Check cold starts:
   ```bash
   aws logs filter-pattern /aws/lambda/production-search-api-lancedb \
     --filter-pattern "REPORT" \
     --start-time $(date -u -d '1 hour ago' +%s)000 | \
     grep "Init Duration"
   ```

2. Analyze duration distribution:
   ```bash
   aws logs filter-pattern /aws/lambda/production-search-api-lancedb \
     --filter-pattern "REPORT" \
     --start-time $(date -u -d '1 hour ago' +%s)000 | \
     grep -oP 'Duration: \K[0-9.]+' | \
     sort -n | \
     awk '{sum+=$1; count++} END {print "Avg:", sum/count, "Count:", count}'
   ```

### Low Cache Hit Rate

**Investigation Steps:**
1. Check cache table:
   ```bash
   aws dynamodb scan \
     --table-name production-supplement-cache \
     --select COUNT \
     --region us-east-1
   ```

2. Sample cache entries:
   ```bash
   aws dynamodb scan \
     --table-name production-supplement-cache \
     --limit 10 \
     --region us-east-1
   ```

3. Check TTL configuration:
   ```bash
   aws dynamodb describe-time-to-live \
     --table-name production-supplement-cache \
     --region us-east-1
   ```

## Reporting

### Hourly Report Template

```
Hour: [X]
Time: [YYYY-MM-DD HH:MM:SS]

Metrics:
- Error Rate: [X]%
- P95 Latency: [X]ms
- Cache Hit Rate: [X]%
- CloudFront Requests: [X]
- Active Alarms: [X]

Status: ✅ Good / ⚠️ Warning / ❌ Critical

Notes:
- [Any observations]
- [Any actions taken]
```

### 24-Hour Summary Report

The automated monitoring script generates this automatically, but you can also create manually:

```
24-Hour Monitoring Summary
==========================

Period: [Start] to [End]

Overall Metrics:
- Total Invocations: [X]
- Total Errors: [X]
- Error Rate: [X]%
- Average P95 Latency: [X]ms
- Average Cache Hit Rate: [X]%

Traffic Distribution:
- New System: [X]% ([X] requests)
- Legacy System: [X]% ([X] requests)

Issues Identified:
- [List any issues]

Actions Taken:
- [List any actions]

Recommendation:
✅ Proceed to 50% traffic
⚠️ Continue at 10% traffic
❌ Rollback to 0% traffic

Reasoning:
[Explain recommendation]
```

## Next Steps

### If Proceeding to 50%

1. Review this monitoring report
2. Document any lessons learned
3. Update runbook with findings
4. Deploy 50% traffic:
   ```bash
   ./deploy-production-50-percent.sh
   ```
5. Start 24-hour monitoring at 50%

### If Continuing at 10%

1. Document issues identified
2. Create action plan for fixes
3. Implement fixes
4. Test in staging
5. Re-deploy to production
6. Restart 24-hour monitoring

### If Rolling Back

1. Execute rollback immediately
2. Document root cause
3. Create detailed incident report
4. Fix issues in staging
5. Re-test thoroughly
6. Plan new deployment

## Summary

Task 18.1 monitoring is complete when:

✅ 24 hours of monitoring completed
✅ All metrics collected and analyzed
✅ Success criteria evaluated
✅ Decision made (proceed/continue/rollback)
✅ Report generated and documented

**Monitoring Tools:**
- `monitor-production-24h.sh` - Automated 24-hour monitoring
- `monitor-rollout.sh` - Manual monitoring at intervals
- CloudWatch Dashboard - Real-time metrics
- CloudWatch Logs - Detailed error analysis
- CloudFront Logs - Traffic distribution

**Key Files:**
- Monitoring logs: `production-monitoring-*.log`
- CloudFront logs: `./cloudfront-logs/`
- Summary report: Generated by monitoring script

---

**Status:** Ready for 24-hour monitoring
**Duration:** 24 hours
**Next Task:** Task 19 (50% traffic) or rollback based on results
