# Legacy System Decommission Guide

## Overview

This guide documents the process of decommissioning the legacy SuplementIA system after successful migration to the new LanceDB-based intelligent search system.

**Status:** Ready for execution after 1 week of production stability  
**Requirements:** Task 22, Requirement 15.5  
**Prerequisites:** Task 21 complete, 7 days of stable production operation

## Background

### Legacy System Components

The legacy system consisted of:

1. **Hardcoded Supplement Mappings** (`supplement-mappings.ts`)
   - Static dictionary of ~70 supplements
   - Manual updates required for new supplements
   - No semantic search capability
   - Limited to exact name matches

2. **Query Normalization** (`query-normalization.ts`)
   - Basic string matching
   - Limited multilingual support
   - No fuzzy matching

3. **Compatibility Layer**
   - Fallback mechanism during migration
   - Response format translation
   - Temporary bridge between old and new systems

### New System Components

The new system provides:

1. **LanceDB Vector Database**
   - Semantic search with 384-dim embeddings
   - Fast similarity search (< 10ms)
   - HNSW index for ANN queries
   - Scalable to millions of supplements

2. **Auto-Discovery System**
   - Automatic supplement detection
   - PubMed validation
   - Background processing via DynamoDB Streams

3. **Multi-Layer Cache**
   - DynamoDB cache (< 10ms)
   - 85%+ hit rate
   - 7-day TTL

4. **ML-Powered Search**
   - Sentence Transformers model
   - Multilingual support (100+ languages)
   - Semantic understanding

## Decommission Checklist

### Pre-Decommission Validation

Before decommissioning, verify:

- [ ] **Production Stability**
  - [ ] 7+ days at 100% traffic
  - [ ] Error rate < 1%
  - [ ] Latency p95 < 200ms
  - [ ] No critical alarms

- [ ] **Data Migration Complete**
  - [ ] All 70+ supplements migrated
  - [ ] Search accuracy validated
  - [ ] No missing data

- [ ] **System Health**
  - [ ] All Lambda functions operational
  - [ ] EFS mounted and accessible
  - [ ] DynamoDB tables healthy
  - [ ] Cache hit rate ≥ 85%

- [ ] **Monitoring Active**
  - [ ] CloudWatch dashboards configured
  - [ ] Alarms set up and tested
  - [ ] X-Ray tracing enabled
  - [ ] Cost tracking active

- [ ] **Rollback Tested**
  - [ ] Rollback procedures documented
  - [ ] Rollback tested in staging
  - [ ] Emergency contacts identified

### Decommission Steps

#### Step 1: Archive Documentation

Archive temporary documentation files created during migration:

```bash
# Run the decommission script
./infrastructure/decommission-legacy-system.sh
```

Files to archive:
- Task completion summaries (TASK_*_COMPLETION_SUMMARY.md)
- Debugging session reports
- EFS setup status files
- Batch enrichment reports
- Temporary analysis documents

Archive location: `_archived/legacy-system-YYYY-MM-DD/`

#### Step 2: Remove Legacy Code References

The decommission script will identify and archive:

1. **Diagnostic Scripts**
   - `scripts/diagnose-*.ts` (if referencing supplement-mappings)
   - `scripts/test-*.ts` (if referencing legacy code)

2. **Compatibility Tests**
   - `lib/services/__tests__/fallback-logic.property.test.ts`
   - `lib/services/__tests__/response-compatibility.property.test.ts`

3. **Legacy Utilities**
   - Any remaining references to `supplement-mappings`
   - Any remaining references to `query-normalization`

**Note:** The main legacy files (`supplement-mappings.ts`, `query-normalization.ts`) were already removed in Task 16.

#### Step 3: Update DNS Records

If using a custom domain with CloudFront traffic routing:

1. **Get CloudFront Distribution Domain**
   ```bash
   aws cloudfront list-distributions \
     --query 'DistributionList.Items[?Comment==`SuplementIA Production`].DomainName' \
     --output text
   ```

2. **Update DNS CNAME Record**
   - Remove legacy system CNAME (if any)
   - Point domain to CloudFront distribution
   - Example: `suplementia.com` → `d1234567890.cloudfront.net`

3. **Verify DNS Propagation**
   ```bash
   dig suplementia.com
   nslookup suplementia.com
   ```

4. **Test New DNS**
   ```bash
   curl -I https://suplementia.com/api/portal/search?q=vitamin+d
   ```

#### Step 4: Clean Up Deployment Artifacts

Archive deployment scripts that are no longer needed:

1. **Traffic Routing Scripts**
   - `infrastructure/compare-systems.sh`
   - `infrastructure/rollback-traffic.sh`

2. **Legacy CloudFormation Templates**
   - Any templates specific to legacy system
   - Keep production templates for new system

3. **Migration Scripts**
   - Keep for reference but mark as archived
   - Document in archive README

#### Step 5: Update Documentation

Update the following files to remove legacy references:

1. **README.md**
   - Remove legacy system mentions
   - Update architecture description
   - Update deployment instructions

2. **DEPLOYMENT.md**
   - Remove legacy deployment steps
   - Update with new system only
   - Remove rollback to legacy instructions

3. **docs/ARCHITECTURE.md**
   - Remove legacy system diagrams
   - Update with new system architecture
   - Document migration completion

4. **API.md**
   - Remove legacy endpoint references
   - Update with new API endpoints only

#### Step 6: Git Cleanup

Commit the decommission changes:

```bash
# Review changes
git status

# Add archived files
git add _archived/legacy-system-*/

# Commit decommission
git commit -m "chore: decommission legacy system (Task 22)

- Archive temporary documentation
- Remove legacy code references
- Update DNS records
- Clean up deployment artifacts
- Update documentation

Requirements: 15.5"

# Push to repository
git push origin main
```

## Post-Decommission Validation

After decommissioning, verify:

### System Health

```bash
# Run smoke tests
./infrastructure/run-smoke-tests.sh

# Check Lambda functions
aws lambda list-functions --query 'Functions[?Runtime==`python3.11`].[FunctionName,LastModified]' --output table

# Check DynamoDB tables
aws dynamodb list-tables --output table

# Check EFS
aws efs describe-file-systems --query 'FileSystems[?Name==`suplementia-lancedb`]' --output table
```

### Performance Metrics

```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=search-api-lancedb \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --output table
```

### Cost Validation

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --output table
```

## Rollback Procedure

If critical issues arise after decommissioning:

### Emergency Rollback

1. **Restore Legacy Code**
   ```bash
   # Checkout previous commit
   git log --oneline | grep "legacy"
   git checkout <commit-hash>
   ```

2. **Redeploy Legacy System**
   ```bash
   # Deploy from archived CloudFormation
   aws cloudformation create-stack \
     --stack-name suplementia-legacy-emergency \
     --template-body file://_archived/legacy-system-*/legacy-system.yml
   ```

3. **Update DNS**
   - Point domain back to legacy system
   - Wait for DNS propagation

4. **Notify Team**
   - Alert on-call engineer
   - Document issue in incident report
   - Plan remediation

### Partial Rollback

If only specific components need rollback:

1. **Restore Specific Files**
   ```bash
   git checkout <commit-hash> -- path/to/file
   ```

2. **Redeploy Affected Components**
   ```bash
   # Redeploy specific Lambda
   cd backend/lambda/<function-name>
   ./deploy.sh
   ```

## Monitoring After Decommission

Continue monitoring for 30 days:

### Daily Checks

- [ ] Error rate < 1%
- [ ] Latency p95 < 200ms
- [ ] Cache hit rate ≥ 85%
- [ ] No critical alarms
- [ ] Cost within budget

### Weekly Reviews

- [ ] Review CloudWatch logs
- [ ] Analyze user feedback
- [ ] Check cost trends
- [ ] Review performance metrics
- [ ] Update documentation

### Monthly Analysis

- [ ] Cost optimization review
- [ ] Performance optimization
- [ ] Capacity planning
- [ ] Security audit
- [ ] Documentation update

## Success Criteria

Decommission is considered successful when:

- ✅ All legacy code removed or archived
- ✅ Documentation updated
- ✅ DNS records updated
- ✅ System operational at 100% traffic
- ✅ No increase in error rate
- ✅ Performance targets met
- ✅ Cost within budget
- ✅ No user complaints
- ✅ 30 days of stable operation

## Troubleshooting

### Issue: Files Still Reference Legacy Code

**Symptom:** Build errors or import errors after decommission

**Solution:**
```bash
# Find remaining references
grep -r "supplement-mappings" --include="*.ts" --include="*.tsx" .

# Update or remove files
# For diagnostic scripts: archive them
# For tests: update to use new system
# For production code: fix imports
```

### Issue: DNS Not Propagating

**Symptom:** Domain still points to old system

**Solution:**
```bash
# Check DNS propagation
dig suplementia.com +trace

# Clear local DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Wait 24-48 hours for full propagation
```

### Issue: Performance Degradation

**Symptom:** Latency increased after decommission

**Solution:**
```bash
# Check Lambda cold starts
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=search-api-lancedb \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum \
  --output table

# Check cache hit rate
# If < 85%, investigate cache configuration
```

## References

- **Requirements:** `.kiro/specs/system-completion-audit/requirements.md`
- **Design:** `.kiro/specs/system-completion-audit/design.md`
- **Tasks:** `.kiro/specs/system-completion-audit/tasks.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Deployment:** `DEPLOYMENT.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`

## Appendix

### Archived Files Inventory

The decommission script creates an archive with the following structure:

```
_archived/legacy-system-YYYY-MM-DD/
├── DECOMMISSION_SUMMARY.md
├── docs/
│   ├── ANALISIS-MEJORAS-LANCEDB.md
│   ├── BATCH-ENRICHMENT-*.md
│   ├── CLOUDWATCH-ANALYSIS.md
│   ├── EFS-SETUP-*.md
│   ├── ESTADO-*.md
│   ├── MEJORAS-SPRINT-1.md
│   ├── NEXT-STEPS-FINAL.md
│   ├── PROBLEMA-LANCE-NAMESPACE.md
│   ├── PRODUCTION-STABILITY-VERIFIED.md
│   ├── PROGRESO-DEBUGGING-SESSION.md
│   ├── RESUMEN-SESION-DEBUGGING.md
│   └── SOLUCION-*.md
├── task-summaries/
│   ├── TASK_10_COMPLETION_SUMMARY.md
│   ├── TASK_14_COMPLETION_SUMMARY.md
│   ├── TASK_15_COMPLETION_SUMMARY.md
│   ├── TASK_17_COMPLETION_SUMMARY.md
│   ├── TASK_18_*.md
│   ├── TASK_19_*.md
│   ├── TASK_20_*.md
│   └── TASK_21_*.md
├── scripts/
│   ├── diagnose-*.ts
│   └── test-*.ts
└── tests/
    └── *.property.test.ts
```

### Migration Timeline

- **Week 1:** Infrastructure setup and ML model deployment
- **Week 2:** Data migration and LanceDB initialization
- **Week 3:** Testing and validation
- **Week 4:** Production deployment (10% → 50% → 100%)
- **Week 5:** Monitoring and stability verification
- **Week 6:** Legacy system decommission

### Cost Comparison

| Component | Legacy System | New System | Savings |
|-----------|--------------|------------|---------|
| Compute | N/A (Vercel) | $1.20/mo | - |
| Database | N/A | $0.80/mo | - |
| Storage | N/A | $0.02/mo | - |
| API Gateway | N/A | $3.50/mo | - |
| Monitoring | N/A | $0.07/mo | - |
| **Total** | ~$20/mo | $5.59/mo | 72% |

### Performance Comparison

| Metric | Legacy System | New System | Improvement |
|--------|--------------|------------|-------------|
| Search Latency (p95) | ~500ms | < 200ms | 60% faster |
| Cache Hit Rate | N/A | 85%+ | New capability |
| Multilingual Support | Limited | 100+ languages | Significant |
| Semantic Search | No | Yes | New capability |
| Auto-Discovery | No | Yes | New capability |
| Scalability | Limited | Unlimited | Significant |

---

**Document Version:** 1.0  
**Last Updated:** 2024-11-28  
**Maintained By:** DevOps Team  
**Review Schedule:** Quarterly
