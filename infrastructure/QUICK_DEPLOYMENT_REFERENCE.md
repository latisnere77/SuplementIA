# Quick Deployment Reference - Production 10% Traffic

## TL;DR - Deploy Now

```bash
# 1. Get legacy domain
vercel ls suplementia --prod

# 2. Deploy (15-20 minutes)
cd infrastructure
./deploy-production-10-percent-simplified.sh

# 3. Monitor (24 hours)
./monitor-production-24h.sh
```

## Emergency Rollback

```bash
cd infrastructure
./rollback-traffic.sh 0
```

## Check Status

```bash
# CloudFront stack status
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].StackStatus'

# Get CloudFront URL
aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text
```

## Test Endpoint

```bash
# Get URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name production-intelligent-search-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text)

# Test search
curl -X POST "${CLOUDFRONT_URL}/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamin d", "language": "en"}'
```

## Monitor Metrics

```bash
# Quick check (2 hours)
./monitor-rollout.sh production 120

# Full 24-hour monitoring
./monitor-production-24h.sh
```

## Key Metrics

- **Error Rate:** < 1% ✅
- **P95 Latency:** < 200ms ✅
- **Cache Hit Rate:** >= 85% ✅

## Success Criteria

After 24 hours:
- [ ] Error rate < 1%
- [ ] P95 latency < 200ms
- [ ] Cache hit rate >= 85%
- [ ] No critical alarms
- [ ] Traffic ~10%/90%
- [ ] No user issues

## Next Steps

**If successful:**
```bash
./deploy-production-50-percent.sh
```

**If issues:**
```bash
./rollback-traffic.sh 0
```

## Documentation

- **Full Guide:** `TASK_18_DEPLOYMENT_GUIDE.md`
- **Monitoring Guide:** `TASK_18.1_MONITORING_GUIDE.md`
- **Status Report:** `TASK_18_PRODUCTION_DEPLOYMENT_STATUS.md`
- **Summary:** `TASK_18_COMPLETION_SUMMARY.md`

## Support

**CloudWatch Dashboard:**
```bash
aws cloudwatch get-dashboard --dashboard-name production-intelligent-search
```

**View Logs:**
```bash
aws logs tail /aws/lambda/production-search-api-lancedb --follow
```

**Check Alarms:**
```bash
aws cloudwatch describe-alarms --state-value ALARM --alarm-name-prefix production
```

---

**Ready to deploy?** Run `./deploy-production-10-percent-simplified.sh`
