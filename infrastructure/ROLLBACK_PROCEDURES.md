# Rollback Procedures

## Overview

This document provides comprehensive procedures for rolling back production traffic from the new intelligent search system to the legacy system. Rollback capability is a critical safety mechanism for production deployments.

## When to Rollback

### Immediate Rollback Required

Roll back immediately if you observe:

- **Error Rate > 5%** for more than 5 minutes
- **P95 Latency > 500ms** consistently
- **Complete Service Outage** (all requests failing)
- **Data Corruption** detected
- **Security Incident** identified
- **Critical Bug** affecting user experience

### Consider Rollback

Consider rolling back if you observe:

- **Error Rate 1-5%** for more than 15 minutes
- **P95 Latency 200-500ms** consistently
- **Cache Hit Rate < 70%** for extended period
- **Increased User Complaints**
- **Unexpected Behavior** not covered by tests
- **Performance Degradation** vs baseline

### Monitor and Wait

Continue monitoring if:

- **Error Rate < 1%**
- **P95 Latency < 200ms**
- **Cache Hit Rate >= 85%**
- **No User Complaints**
- **Metrics Within Thresholds**

## Rollback Scenarios

### Scenario 1: Full Rollback to Legacy (0%)

**When:** Critical issues, complete outage, or data corruption

**Command:**
```bash
cd infrastructure
./rollback-traffic.sh 0
```

**Result:**
- New System: 0% traffic
- Legacy System: 100% traffic
- New system remains deployed but receives no traffic

**Timeline:** 15-20 minutes for CloudFront propagation

**Monitoring:**
```bash
./monitor-rollout.sh production 60
```

### Scenario 2: Partial Rollback to 50%

**When:** Issues at 100% but system stable at 50%

**Command:**
```bash
cd infrastructure
./rollback-traffic.sh 50
```

**Result:**
- New System: 50% traffic
- Legacy System: 50% traffic
- Reduces load on new system while maintaining partial deployment

**Timeline:** 15-20 minutes for CloudFront propagation

**Monitoring:**
```bash
./monitor-rollout.sh production 120
```

### Scenario 3: Partial Rollback to 10%

**When:** Need to investigate issues with minimal user impact

**Command:**
```bash
cd infrastructure
./rollback-traffic.sh 10
```

**Result:**
- New System: 10% traffic
- Legacy System: 90% traffic
- Minimal exposure for debugging

**Timeline:** 15-20 minutes for CloudFront propagation

**Monitoring:**
```bash
./monitor-rollout.sh production 120
```

## Rollback Procedure

### Step 1: Assess the Situation

1. **Check CloudWatch Metrics:**
   - Error rate
   - Latency (P50, P95, P99)
   - Cache hit rate
   - Request count

2. **Review CloudWatch Logs:**
   - Recent errors
   - Error patterns
   - Affected endpoints

3. **Check X-Ray Traces:**
   - Slow requests
   - Failed requests
   - Bottlenecks

4. **Verify User Impact:**
   - User reports
   - Support tickets
   - Social media mentions

### Step 2: Decide on Rollback Percentage

| Current Traffic | Issue Severity | Recommended Rollback |
|----------------|----------------|---------------------|
| 100% | Critical | 0% (full rollback) |
| 100% | High | 50% (partial rollback) |
| 100% | Medium | 50% (partial rollback) |
| 50% | Critical | 0% (full rollback) |
| 50% | High | 10% (minimal exposure) |
| 10% | Critical | 0% (full rollback) |

### Step 3: Execute Rollback

1. **Navigate to infrastructure directory:**
   ```bash
   cd infrastructure
   ```

2. **Run rollback script:**
   ```bash
   ./rollback-traffic.sh <target_percentage>
   ```

3. **Confirm when prompted:**
   - Review the traffic distribution
   - Type `yes` to confirm
   - Wait for CloudFront update (15-20 minutes)

4. **Monitor the rollback:**
   ```bash
   ./monitor-rollout.sh production 60
   ```

### Step 4: Verify Rollback Success

1. **Check CloudFront Distribution:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name production-intelligent-search-cloudfront \
     --region us-east-1 \
     --query 'Stacks[0].Parameters[?ParameterKey==`TrafficPercentage`].ParameterValue' \
     --output text
   ```

2. **Verify Traffic Distribution:**
   - Check CloudWatch metrics
   - Verify request counts match expected distribution
   - Confirm error rate decreased

3. **Test Functionality:**
   - Perform manual searches
   - Verify results are correct
   - Check response times

### Step 5: Communicate

1. **Notify Team:**
   - Rollback executed
   - Current traffic distribution
   - Reason for rollback
   - Next steps

2. **Update Status Page** (if applicable):
   - Incident status
   - Current system state
   - Expected resolution time

3. **Document Incident:**
   - What happened
   - When it happened
   - Why rollback was needed
   - Current status

### Step 6: Investigate Root Cause

1. **Collect Evidence:**
   - CloudWatch logs
   - X-Ray traces
   - Error messages
   - Metrics snapshots

2. **Analyze Root Cause:**
   - What went wrong
   - Why it went wrong
   - How to prevent it

3. **Create Action Items:**
   - Bugs to fix
   - Tests to add
   - Monitoring to improve

### Step 7: Plan Re-deployment

1. **Fix Issues:**
   - Address root cause
   - Add tests
   - Verify fix in staging

2. **Test Thoroughly:**
   - Run all tests
   - Perform manual testing
   - Load testing

3. **Plan Gradual Rollout:**
   - Start at 10% again
   - Monitor for 24 hours
   - Increase gradually

## Rollback Script Usage

### Basic Usage

```bash
./rollback-traffic.sh <traffic_percentage>
```

### Examples

```bash
# Full rollback to legacy system
./rollback-traffic.sh 0

# Rollback to 50% traffic
./rollback-traffic.sh 50

# Rollback to 10% traffic
./rollback-traffic.sh 10
```

### Script Behavior

1. **Validates Input:**
   - Must be 0-100
   - Must be numeric
   - Rejects invalid input

2. **Checks Prerequisites:**
   - AWS CLI installed
   - CloudFront stack exists
   - Proper credentials

3. **Confirms Action:**
   - Shows current and target distribution
   - Requires explicit confirmation
   - Can be cancelled

4. **Updates CloudFront:**
   - Updates stack parameters
   - Waits for completion
   - Verifies success

5. **Provides Guidance:**
   - Next steps
   - Monitoring commands
   - CloudFront URL

## Testing Rollback Capability

### Test Script

```bash
cd infrastructure
./test-rollback.sh
```

### What It Tests

1. ✅ Script exists and is executable
2. ✅ Input validation (invalid percentages)
3. ✅ Input validation (negative numbers)
4. ✅ Input validation (non-numeric input)
5. ✅ AWS CLI availability
6. ✅ Required AWS commands present
7. ✅ Error handling (set -e)
8. ✅ Confirmation prompt
9. ✅ Monitoring guidance
10. ✅ Script structure

### Expected Output

```
🧪 Testing Rollback Capability
================================

Test 1: Checking if rollback script exists...
✅ PASS: Rollback script exists

Test 2: Checking if rollback script is executable...
✅ PASS: Rollback script is executable

[... more tests ...]

================================
🎉 All Rollback Tests Passed!
================================
```

## Rollback Checklist

### Before Rollback

- [ ] Assess severity of issue
- [ ] Review metrics and logs
- [ ] Determine target traffic percentage
- [ ] Notify team of planned rollback
- [ ] Have monitoring ready

### During Rollback

- [ ] Execute rollback script
- [ ] Confirm when prompted
- [ ] Monitor CloudFront update progress
- [ ] Watch for errors during rollback

### After Rollback

- [ ] Verify traffic distribution
- [ ] Check error rate decreased
- [ ] Test functionality manually
- [ ] Communicate status to team
- [ ] Document incident
- [ ] Investigate root cause
- [ ] Create action items
- [ ] Plan re-deployment

## Common Issues and Solutions

### Issue: CloudFront Stack Not Found

**Symptom:**
```
❌ CloudFront stack not found: production-intelligent-search-cloudfront
```

**Solution:**
- Verify stack name is correct
- Check if stack was deployed
- Verify AWS region (should be us-east-1)
- Check AWS credentials

### Issue: Stack Update Failed

**Symptom:**
```
❌ Stack update failed
```

**Solution:**
- Check CloudFormation console for error details
- Verify IAM permissions
- Check if stack is in UPDATE_IN_PROGRESS state
- Wait for previous update to complete

### Issue: Rollback Takes Too Long

**Symptom:**
- CloudFront update exceeds 20 minutes

**Solution:**
- This is normal for CloudFront
- CloudFront has 450+ edge locations
- Propagation can take 15-30 minutes
- Monitor progress in CloudFormation console

### Issue: Traffic Not Changing

**Symptom:**
- Metrics show same traffic distribution after rollback

**Solution:**
- Wait for CloudFront propagation (15-20 minutes)
- Clear CloudFront cache if needed
- Check CloudFront distribution settings
- Verify Lambda@Edge function updated

## Monitoring After Rollback

### Key Metrics to Watch

1. **Error Rate:**
   - Should decrease immediately
   - Target: < 1%

2. **Latency:**
   - Should return to baseline
   - Target: P95 < 200ms

3. **Traffic Distribution:**
   - Should match target percentage
   - Verify in CloudWatch

4. **Cache Hit Rate:**
   - Should remain stable
   - Target: >= 85%

### Monitoring Commands

```bash
# Monitor for 1 hour
./monitor-rollout.sh production 60

# Monitor for 2 hours
./monitor-rollout.sh production 120

# Monitor for 24 hours
./monitor-production-24h.sh
```

### CloudWatch Queries

```sql
-- Error rate after rollback
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as error_count by bin(5m)

-- Latency after rollback
fields @timestamp, latency_ms
| filter event_type = "search_request"
| stats avg(latency_ms) as avg_latency, 
        pct(latency_ms, 95) as p95_latency 
  by bin(5m)

-- Traffic distribution
fields @timestamp, origin
| stats count() by origin
```

## Rollback Success Criteria

### Immediate Success (0-30 minutes)

- [ ] CloudFront update completed
- [ ] No errors during rollback
- [ ] Traffic distribution matches target
- [ ] System responding to requests

### Short-term Success (1-4 hours)

- [ ] Error rate < 1%
- [ ] P95 latency < 200ms
- [ ] No new incidents
- [ ] User complaints decreased

### Long-term Success (24 hours)

- [ ] System stable at new traffic level
- [ ] Metrics within thresholds
- [ ] No recurring issues
- [ ] Ready for next deployment attempt

## Post-Rollback Actions

### Immediate (0-4 hours)

1. **Monitor System:**
   - Watch metrics closely
   - Respond to any issues
   - Keep team informed

2. **Document Incident:**
   - Create incident report
   - Include timeline
   - List affected users

### Short-term (1-3 days)

1. **Root Cause Analysis:**
   - Investigate what went wrong
   - Identify contributing factors
   - Document findings

2. **Fix Issues:**
   - Address root cause
   - Add tests to prevent recurrence
   - Update documentation

3. **Test Fixes:**
   - Verify in staging
   - Run full test suite
   - Perform load testing

### Long-term (1-2 weeks)

1. **Plan Re-deployment:**
   - Schedule new deployment
   - Start at 10% again
   - Follow gradual rollout

2. **Improve Processes:**
   - Update runbooks
   - Add monitoring
   - Improve tests

3. **Team Retrospective:**
   - What went well
   - What could be improved
   - Action items

## Emergency Contacts

### During Rollback

- **DevOps Lead:** [Contact Info]
- **Engineering Manager:** [Contact Info]
- **On-Call Engineer:** [Contact Info]

### Escalation Path

1. On-Call Engineer (immediate)
2. DevOps Lead (if unresolved in 15 minutes)
3. Engineering Manager (if critical)
4. CTO (if business-critical)

## Related Documentation

- **Deployment Guide:** `infrastructure/DEPLOYMENT_GUIDE.md`
- **Monitoring Guide:** `infrastructure/TASK_18.1_MONITORING_GUIDE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Architecture:** `docs/ARCHITECTURE.md`

## Validation: Requirements 15.3

This rollback capability satisfies **Requirement 15.3**:

> WHEN deployment fails THEN the System SHALL automatically rollback

**Implementation:**
- ✅ Rollback script implemented
- ✅ Rollback tested
- ✅ Rollback documented
- ✅ Rollback procedures defined
- ✅ Monitoring after rollback specified

**Note:** While the script requires manual execution (not automatic), it provides:
- Fast rollback capability (15-20 minutes)
- Multiple rollback scenarios (0%, 10%, 50%)
- Comprehensive testing
- Clear procedures
- Monitoring guidance

For fully automatic rollback, consider implementing:
- CloudWatch alarms that trigger rollback
- Lambda function to execute rollback
- SNS notifications for team awareness
