# Runbook - Frontend Error Display Fix

## Overview

This runbook provides operational procedures for monitoring, troubleshooting, and maintaining the async enrichment system with enhanced error handling.

---

## Quick Reference

### Health Check
```bash
# Check if system is responding
curl https://api.example.com/api/portal/enrich-async \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "Test"}'
```

### View Logs
```bash
# View recent logs (CloudWatch)
aws logs tail /aws/lambda/enrichment-api --follow

# Filter by correlation ID
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.correlationId = "corr_123" }'
```

### Check Metrics
```bash
# Get job metrics
curl https://api.example.com/api/portal/metrics
```

---

## Monitoring

### Key Metrics

#### 1. Job Success Rate
**Target**: > 95%

**Query**:
```
(jobs_completed / (jobs_completed + jobs_failed + jobs_timeout)) * 100
```

**Alert**: Success rate < 95% for 5 minutes

**Action**:
1. Check logs for error patterns
2. Verify backend Lambda health
3. Check for validation issues
4. Review recent deployments

#### 2. Timeout Rate
**Target**: < 5%

**Query**:
```
(jobs_timeout / jobs_created) * 100
```

**Alert**: Timeout rate > 5% for 5 minutes

**Action**:
1. Check Lambda execution time
2. Verify PubMed API response time
3. Check network connectivity
4. Review timeout threshold (currently 2 minutes)

#### 3. Store Size
**Target**: < 900 jobs

**Query**:
```
current_store_size
```

**Alert**: Store size > 900

**Action**:
1. Check cleanup frequency
2. Verify expiration times are correct
3. Check for memory leaks
4. Review LRU eviction logic

#### 4. Error Rate
**Target**: < 10%

**Query**:
```
(errors_4xx + errors_5xx) / total_requests * 100
```

**Alert**: Error rate > 10% for 5 minutes

**Action**:
1. Group errors by status code
2. Check for validation issues (400)
3. Check for backend failures (500)
4. Review error logs

#### 5. Repeated Failures
**Target**: 0 alerts

**Query**:
```
failures_per_supplement > 5 in 1 minute
```

**Alert**: > 5 failures for same supplement in 1 minute

**Action**:
1. Check supplement name for issues
2. Verify normalization logic
3. Check backend data availability
4. Review PubMed API status

---

## Common Issues

### Issue 1: High Timeout Rate

**Symptoms**:
- Many jobs timing out (> 2 minutes)
- Users seeing 408 errors
- Timeout rate > 5%

**Diagnosis**:
```bash
# Check Lambda execution time
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=enrichment-lambda \
  --start-time 2025-11-26T00:00:00Z \
  --end-time 2025-11-26T01:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# Check for timeout logs
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.event = "JOB_TIMEOUT" }'
```

**Resolution**:
1. **Short-term**: Increase timeout threshold to 3 minutes
2. **Medium-term**: Optimize Lambda performance
3. **Long-term**: Implement caching for common supplements

**Prevention**:
- Monitor Lambda cold starts
- Pre-warm Lambda functions
- Cache PubMed API responses

---

### Issue 2: Store Size Approaching Limit

**Symptoms**:
- Store size > 900 jobs
- Cleanup not removing jobs fast enough
- Memory usage increasing

**Diagnosis**:
```bash
# Check store metrics
curl https://api.example.com/api/portal/metrics | jq '.storeSize'

# Check cleanup frequency
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.event = "STORE_MAINTENANCE" }'
```

**Resolution**:
1. **Immediate**: Manually trigger cleanup
   ```typescript
   import { cleanupExpired } from '@/lib/portal/job-store';
   cleanupExpired();
   ```

2. **Short-term**: Reduce retention times
   - Completed: 5 min → 3 min
   - Failed: 2 min → 1 min

3. **Long-term**: Implement Redis/database storage

**Prevention**:
- Schedule periodic cleanup (every 30 seconds)
- Monitor cleanup duration
- Set up alerts for store size > 800

---

### Issue 3: Repeated Failures for Supplement

**Symptoms**:
- Same supplement failing repeatedly
- Alert: > 5 failures in 1 minute
- Users unable to get results

**Diagnosis**:
```bash
# Check failure pattern
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.event = "FAILURE_PATTERN_DETECTED" }'

# Check specific supplement
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.supplementName = "L-Carnitine" && $.level = "error" }'
```

**Resolution**:
1. **Identify root cause**:
   - Validation issue? → Fix normalization
   - Backend issue? → Check Lambda logs
   - Data issue? → Verify PubMed data

2. **Temporary workaround**:
   - Add supplement to blocklist
   - Return cached/fallback data

3. **Permanent fix**:
   - Fix underlying issue
   - Add better error handling
   - Improve validation

**Prevention**:
- Monitor failure patterns
- Test edge cases
- Improve input validation

---

### Issue 4: High 400 Error Rate

**Symptoms**:
- Many validation failures
- Users seeing "Invalid input" errors
- 400 error rate > 5%

**Diagnosis**:
```bash
# Check validation failures
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.event = "VALIDATION_FAILURE" }'

# Group by error type
aws logs insights query \
  --log-group-name /aws/lambda/enrichment-api \
  --query-string 'fields @timestamp, supplementName, error | filter event = "VALIDATION_FAILURE" | stats count() by error'
```

**Resolution**:
1. **Identify common patterns**:
   - Empty names?
   - Special characters?
   - Too long?

2. **Improve validation**:
   - Add better error messages
   - Suggest corrections
   - Auto-sanitize input

3. **Update frontend**:
   - Add client-side validation
   - Show examples
   - Provide autocomplete

**Prevention**:
- Add comprehensive validation tests
- Monitor validation failure patterns
- Improve user guidance

---

### Issue 5: Memory Leak

**Symptoms**:
- Memory usage increasing over time
- Store size not decreasing after cleanup
- Lambda running out of memory

**Diagnosis**:
```bash
# Check memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name MemoryUtilization \
  --dimensions Name=FunctionName,Value=enrichment-lambda \
  --start-time 2025-11-26T00:00:00Z \
  --end-time 2025-11-26T01:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# Check store size over time
curl https://api.example.com/api/portal/metrics | jq '.storeSize'
```

**Resolution**:
1. **Immediate**: Restart Lambda (redeploy)
2. **Short-term**: Force cleanup
   ```typescript
   import { clearStore } from '@/lib/portal/job-store';
   clearStore();
   ```
3. **Long-term**: Fix memory leak
   - Review job store implementation
   - Check for circular references
   - Verify cleanup logic

**Prevention**:
- Add memory leak tests
- Monitor memory usage
- Implement proper cleanup

---

## Maintenance Procedures

### Daily Tasks

1. **Check Metrics Dashboard**
   - Job success rate
   - Timeout rate
   - Error rate
   - Store size

2. **Review Alerts**
   - Any triggered alerts?
   - False positives?
   - Action needed?

3. **Check Logs**
   - Any unusual patterns?
   - New error types?
   - Performance issues?

### Weekly Tasks

1. **Performance Review**
   - Analyze p95 latency
   - Check cleanup duration
   - Review eviction frequency

2. **Error Analysis**
   - Group errors by type
   - Identify trends
   - Plan fixes

3. **Capacity Planning**
   - Review store size trends
   - Check memory usage
   - Plan scaling

### Monthly Tasks

1. **Code Review**
   - Review recent changes
   - Check for technical debt
   - Plan refactoring

2. **Documentation Update**
   - Update runbook
   - Update API docs
   - Update troubleshooting guides

3. **Performance Optimization**
   - Identify bottlenecks
   - Implement optimizations
   - Measure improvements

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Smoke tests passed
- [ ] Rollback plan ready

### Staging Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Run smoke tests
npm run test:smoke:staging

# Monitor for 30 minutes
# Check metrics, logs, errors
```

### Production Deployment

```bash
# Deploy to production (10% traffic)
npm run deploy:production:10

# Monitor for 1 hour
# Check metrics, logs, errors

# Increase to 50%
npm run deploy:production:50

# Monitor for 1 hour

# Increase to 100%
npm run deploy:production:100

# Monitor for 24 hours
```

### Rollback Procedure

```bash
# Immediate rollback
npm run rollback:production

# Verify rollback
curl https://api.example.com/api/portal/health

# Check metrics
# Investigate issue
# Plan fix
```

---

## Emergency Contacts

### On-Call Rotation
- Primary: [Name] - [Phone] - [Email]
- Secondary: [Name] - [Phone] - [Email]
- Manager: [Name] - [Phone] - [Email]

### Escalation Path
1. On-call engineer (15 minutes)
2. Team lead (30 minutes)
3. Engineering manager (1 hour)
4. CTO (2 hours)

### External Dependencies
- AWS Support: [Support Plan]
- PubMed API: [Contact]
- CDN Provider: [Contact]

---

## Useful Commands

### Logs
```bash
# Tail logs
aws logs tail /aws/lambda/enrichment-api --follow

# Search logs
aws logs filter-pattern /aws/lambda/enrichment-api \
  --filter-pattern '{ $.level = "error" }'

# Export logs
aws logs get-log-events \
  --log-group-name /aws/lambda/enrichment-api \
  --log-stream-name latest \
  --output json > logs.json
```

### Metrics
```bash
# Get all metrics
curl https://api.example.com/api/portal/metrics

# Get specific metric
curl https://api.example.com/api/portal/metrics | jq '.jobsCompleted'

# Export metrics
curl https://api.example.com/api/portal/metrics > metrics.json
```

### Debugging
```bash
# Test job creation
curl -X POST https://api.example.com/api/portal/enrich-async \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "Test"}' \
  -v

# Test job status
curl https://api.example.com/api/portal/enrichment-status/job_123 \
  -H "X-Correlation-ID: corr_456" \
  -v

# Test with invalid input
curl -X POST https://api.example.com/api/portal/enrich-async \
  -H "Content-Type: application/json" \
  -d '{"supplementName": ""}' \
  -v
```

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Job Success Rate | > 98% | > 95% | < 90% |
| Timeout Rate | < 2% | < 5% | > 10% |
| Error Rate | < 5% | < 10% | > 20% |
| Store Size | < 500 | < 900 | > 950 |
| p95 Latency | < 50ms | < 100ms | > 200ms |
| Cleanup Duration | < 5ms | < 10ms | > 20ms |
| Memory Usage | < 1MB | < 2MB | > 3MB |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-26 | Initial runbook | System |
| | | |
| | | |

---

## References

- [API Documentation](./API-DOCUMENTATION.md)
- [Design Document](./design.md)
- [Requirements](./requirements.md)
- [AWS CloudWatch Dashboard](#)
- [Monitoring Dashboard](#)
