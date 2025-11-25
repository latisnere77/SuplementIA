# Quick Reference - Production Rollout

## 🚀 Deployment Commands

### Phase 1: 10% Traffic
```bash
./infrastructure/deploy-production-10-percent.sh
./infrastructure/monitor-rollout.sh production 120
./infrastructure/compare-systems.sh production 1
```

### Phase 2: 50% Traffic
```bash
./infrastructure/deploy-production-50-percent.sh
./infrastructure/monitor-rollout.sh production 120
./infrastructure/compare-systems.sh production 1
```

### Phase 3: 100% Traffic
```bash
./infrastructure/deploy-production-100-percent.sh
./infrastructure/monitor-rollout.sh production 2880
./infrastructure/compare-systems.sh production 24
```

## 🔄 Rollback Commands

### Emergency Rollback (100% Legacy)
```bash
./infrastructure/rollback-traffic.sh 0
```

### Partial Rollback
```bash
./infrastructure/rollback-traffic.sh 10  # Back to 10%
./infrastructure/rollback-traffic.sh 50  # Back to 50%
```

## 📊 Monitoring Commands

### Real-time Metrics
```bash
# Monitor for 2 hours
./infrastructure/monitor-rollout.sh production 120

# Monitor for 48 hours
./infrastructure/monitor-rollout.sh production 2880
```

### System Comparison
```bash
# Compare last hour
./infrastructure/compare-systems.sh production 1

# Compare last 24 hours
./infrastructure/compare-systems.sh production 24
```

### CloudWatch Dashboard
```bash
aws cloudwatch get-dashboard --dashboard-name production-intelligent-search
```

### View Logs
```bash
# Search API logs
aws logs tail /aws/lambda/production-search-api --follow

# Embedding generator logs
aws logs tail /aws/lambda/production-embedding-generator --follow

# Discovery worker logs
aws logs tail /aws/lambda/production-discovery-worker --follow
```

### Check Alarms
```bash
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --alarm-name-prefix production
```

## 📈 Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | < 1% | > 1% | > 5% |
| P95 Latency | < 200ms | > 300ms | > 500ms |
| Cache Hit Rate | >= 85% | < 80% | < 70% |
| CloudFront 5xx | < 0.1% | > 0.5% | > 1% |

## ✅ Validation Checklist

### Before Increasing Traffic
- [ ] Error rate < 1%
- [ ] P95 latency < 200ms
- [ ] Cache hit rate >= 85%
- [ ] No critical alarms
- [ ] Stable for 4+ hours (10% → 50%)
- [ ] Stable for 4+ hours (50% → 100%)
- [ ] No user-reported issues

### Before Cleanup
- [ ] 100% traffic for 48+ hours
- [ ] All metrics consistently good
- [ ] No critical issues
- [ ] Cost within budget
- [ ] Team approval

## 🔍 Troubleshooting

### High Error Rate
```bash
# Check Lambda errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/production-search-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Check database status
aws rds describe-db-instances \
  --db-instance-identifier production-supplements-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

### High Latency
```bash
# Check P95 latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-search-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --extended-statistics p95,p99
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
```

## 💰 Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

## 📞 Emergency Contacts

- **DevOps Lead**: [contact]
- **Backend Team**: [contact]
- **On-Call Engineer**: [contact]

## 🔗 Documentation Links

- [Production Rollout Guide](./PRODUCTION-ROLLOUT-GUIDE.md)
- [Deployment Scripts README](./DEPLOYMENT-SCRIPTS-README.md)
- [Staging Deployment Guide](./STAGING-DEPLOYMENT-GUIDE.md)
- [Quick Start Guide](./QUICK-START.md)

## ⏱️ Timeline

| Phase | Duration | Monitoring | Total Time |
|-------|----------|------------|------------|
| 10% Traffic | 30-40 min | 4+ hours | ~5 hours |
| 50% Traffic | 15-20 min | 4+ hours | ~5 hours |
| 100% Traffic | 15-20 min | 48+ hours | ~48 hours |
| **Total** | | | **~58 hours** |

## 🎯 Success Criteria

- ✅ Error rate < 1% consistently
- ✅ P95 latency < 200ms consistently
- ✅ Cache hit rate >= 85% consistently
- ✅ System stable for 48 hours at 100%
- ✅ No user-reported issues
- ✅ Cost within budget ($25-60/month)

## 📝 Quick Notes

### Traffic Distribution
- **10%**: ~100 requests/1000 to new system
- **50%**: ~500 requests/1000 to new system
- **100%**: All requests to new system (legacy as fallback)

### Deployment Times
- Infrastructure: 30-40 minutes
- Traffic update: 15-20 minutes
- CloudFront propagation: 5-10 minutes

### Rollback Times
- Traffic rollback: 15-20 minutes
- Full rollback: 20-30 minutes

### Monitoring Frequency
- **10% & 50%**: Every 15 minutes for first 2 hours
- **100%**: Every 30 minutes for first 48 hours
- **After 48h**: Every 4 hours until cleanup

---

**Last Updated**: $(date +%Y-%m-%d)
**Version**: 1.0
