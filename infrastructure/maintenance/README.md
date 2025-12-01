# Ongoing Maintenance System

## Overview

This directory contains scripts and documentation for the ongoing maintenance of the SuplementIA intelligent search system.

**Requirements:** 9.1, 9.2, 14.5

## Maintenance Schedule

### Weekly Reviews
- **Frequency:** Every Monday
- **Script:** `./weekly-review.sh`
- **Duration:** ~5 minutes
- **Purpose:** Monitor system health, check metrics, identify issues

### Monthly Cost Analysis
- **Frequency:** First day of each month
- **Script:** `./monthly-cost-analysis.sh`
- **Duration:** ~10 minutes
- **Purpose:** Analyze costs, compare with budget, optimize spending

### Quarterly Testing
- **Frequency:** First week of each quarter (Jan, Apr, Jul, Oct)
- **Script:** `./quarterly-testing.sh`
- **Duration:** ~30 minutes
- **Purpose:** Comprehensive testing, security audit, performance validation

## Quick Start

### Run Weekly Review

```bash
cd infrastructure/maintenance
./weekly-review.sh
```

**Output:** `reports/weekly-review-YYYY-MM-DD.md`

**What it checks:**
- CloudWatch metrics (error rate, invocations)
- CloudWatch alarms status
- Lambda function health
- DynamoDB table health
- EFS file system status
- Recent error logs

### Run Monthly Cost Analysis

```bash
cd infrastructure/maintenance
./monthly-cost-analysis.sh
```

**Output:** `reports/cost-analysis-YYYY-MM.md`

**What it analyzes:**
- Cost breakdown by service
- Budget comparison (target: $5.59/month)
- Lambda cost analysis
- DynamoDB cost analysis
- EFS cost analysis
- Cost optimization recommendations
- 3-month cost trends

### Run Quarterly Testing

```bash
cd infrastructure/maintenance
./quarterly-testing.sh
```

**Output:** `reports/quarterly-testing-YYYY-QX.md`

**What it tests:**
- Smoke tests (infrastructure health)
- Performance tests (latency targets)
- Integration tests (end-to-end flows)
- Security audit (controls and compliance)
- Property-based tests (correctness properties)
- System metrics (90-day trends)

## Automation

### Cron Jobs

To automate maintenance tasks, add these cron jobs:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Weekly review every Monday at 9 AM
0 9 * * 1 cd /path/to/suplementia/infrastructure/maintenance && ./weekly-review.sh

# Monthly cost analysis on the 1st of each month at 10 AM
0 10 1 * * cd /path/to/suplementia/infrastructure/maintenance && ./monthly-cost-analysis.sh

# Quarterly testing on the 1st of Jan, Apr, Jul, Oct at 11 AM
0 11 1 1,4,7,10 * cd /path/to/suplementia/infrastructure/maintenance && ./quarterly-testing.sh
```

### AWS EventBridge (Alternative)

For cloud-based automation:

1. **Create Lambda function** to run maintenance scripts
2. **Create EventBridge rules:**
   - Weekly: `cron(0 9 ? * MON *)`
   - Monthly: `cron(0 10 1 * ? *)`
   - Quarterly: `cron(0 11 1 1,4,7,10 ? *)`

## Reports

All reports are saved in the `reports/` directory:

```
reports/
├── weekly-review-2024-11-28.md
├── weekly-review-2024-12-05.md
├── cost-analysis-2024-11.md
├── cost-analysis-2024-12.md
├── quarterly-testing-2024-Q4.md
└── quarterly-testing-2025-Q1.md
```

### Report Retention

- **Weekly reports:** Keep for 3 months
- **Monthly reports:** Keep for 1 year
- **Quarterly reports:** Keep indefinitely

## Metrics Targets

### Performance
- **Search latency (p95):** < 200ms
- **Cache hit latency:** < 10ms
- **Vector search latency:** < 10ms
- **Error rate:** < 1%
- **Uptime:** 99.9%+

### Cost
- **Target:** $5.59/month (10K searches/day)
- **Acceptable variance:** ±10%
- **Alert threshold:** +20%

### Reliability
- **Cache hit rate:** ≥ 85%
- **Lambda cold starts:** < 5%
- **DynamoDB throttling:** 0
- **EFS throughput:** Within limits

## Troubleshooting

### High Error Rate

If error rate exceeds 1%:

1. Check CloudWatch logs:
   ```bash
   aws logs tail /aws/lambda/search-api-lancedb --follow
   ```

2. Review recent errors in weekly report

3. Check for:
   - Database connectivity issues
   - EFS mount problems
   - Model loading errors
   - PubMed API rate limits

### High Costs

If costs exceed budget by 20%:

1. Review cost breakdown in monthly report

2. Check for:
   - Unexpected Lambda invocations
   - High DynamoDB read/write units
   - EFS storage growth
   - CloudWatch log retention

3. Implement optimizations:
   - Increase cache hit rate
   - Optimize Lambda memory
   - Review log retention
   - Check for unused resources

### Failing Tests

If quarterly tests fail:

1. Review test output in quarterly report

2. Check specific test logs:
   ```bash
   cat /tmp/smoke-tests.log
   cat /tmp/perf-backend.log
   cat /tmp/integration.log
   ```

3. Fix issues and re-run:
   ```bash
   ./quarterly-testing.sh
   ```

## Maintenance Checklist

### Daily (Automated via CloudWatch)
- [ ] Monitor error rate
- [ ] Check active alarms
- [ ] Review critical logs

### Weekly (Manual)
- [ ] Run weekly review script
- [ ] Review metrics report
- [ ] Address any warnings
- [ ] Update team on status

### Monthly (Manual)
- [ ] Run cost analysis script
- [ ] Review cost report
- [ ] Implement optimizations
- [ ] Share with finance team

### Quarterly (Manual)
- [ ] Run comprehensive testing
- [ ] Review all test results
- [ ] Fix any failing tests
- [ ] Update documentation
- [ ] Plan improvements

### Annually
- [ ] Security audit
- [ ] Architecture review
- [ ] Capacity planning
- [ ] Documentation update
- [ ] Team training

## Key Contacts

- **DevOps Lead:** [Name/Email]
- **On-Call Engineer:** [Rotation schedule]
- **Finance Contact:** [Name/Email]
- **Security Team:** [Name/Email]

## References

- **Architecture:** `docs/ARCHITECTURE.md`
- **Deployment:** `DEPLOYMENT.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Cost Optimization:** `COST-OPTIMIZATION.md`
- **Requirements:** `.kiro/specs/system-completion-audit/requirements.md`
- **Design:** `.kiro/specs/system-completion-audit/design.md`

## Support

For issues or questions:
1. Check `TROUBLESHOOTING.md`
2. Review recent maintenance reports
3. Contact DevOps team
4. Escalate to on-call engineer if critical

---

**Last Updated:** 2024-11-28  
**Maintained By:** DevOps Team  
**Review Schedule:** Quarterly
