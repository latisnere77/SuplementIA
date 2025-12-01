# Task 22 Quick Reference: Legacy System Decommission

## TL;DR

Legacy system decommission is ready to execute. Run the script when you're ready to archive temporary files and complete the migration.

## Quick Start

```bash
# 1. Run decommission script
./infrastructure/decommission-legacy-system.sh

# 2. Review archived files
ls -la _archived/legacy-system-$(date +%Y-%m-%d)/

# 3. Update DNS (if applicable)
# See instructions in script output

# 4. Commit changes
git add _archived/legacy-system-*/
git add docs/LEGACY_DECOMMISSION_GUIDE.md
git add infrastructure/decommission-legacy-system.sh
git add DEPLOYMENT.md
git commit -m "chore: decommission legacy system (Task 22)"
git push origin main
```

## What Gets Archived

### Temporary Documentation (Root Level)
- `TASK_*_COMPLETION_SUMMARY.md` (Tasks 10-21)
- `ANALISIS-MEJORAS-LANCEDB.md`
- `BATCH-ENRICHMENT-*.md`
- `CLOUDWATCH-ANALYSIS.md`
- `EFS-SETUP-*.md`
- `ESTADO-*.md`
- `MEJORAS-SPRINT-1.md`
- `NEXT-STEPS-FINAL.md`
- `PROBLEMA-LANCE-NAMESPACE.md`
- `PRODUCTION-STABILITY-VERIFIED.md`
- `PROGRESO-DEBUGGING-SESSION.md`
- `RESUMEN-SESION-DEBUGGING.md`
- `SOLUCION-*.md`

### Legacy Code References
- Diagnostic scripts (`scripts/diagnose-*.ts`)
- Test scripts (`scripts/test-*.ts`)
- Compatibility tests (`lib/services/__tests__/*.test.ts`)

### Deployment Artifacts
- `infrastructure/compare-systems.sh`
- `infrastructure/rollback-traffic.sh`
- Legacy CloudFormation templates

## What Stays

### Production Code
- All current Lambda functions
- Frontend components
- API routes
- Utility libraries

### Documentation
- `README.md`
- `DEPLOYMENT.md` (updated)
- `docs/ARCHITECTURE.md`
- `docs/LEGACY_DECOMMISSION_GUIDE.md` (new)
- All spec files

### Infrastructure
- Current CloudFormation templates
- Deployment scripts for new system
- Monitoring scripts

## Pre-Flight Checklist

Before running the decommission script:

- [ ] System at 100% traffic for 7+ days
- [ ] Error rate < 1%
- [ ] Latency p95 < 200ms
- [ ] No critical alarms
- [ ] All tests passing
- [ ] Monitoring active
- [ ] Backup of current state

## Post-Decommission

### Immediate
1. Review archived files
2. Update DNS (if needed)
3. Commit changes to Git
4. Verify system still operational

### 30 Days
1. Daily monitoring
2. Weekly reviews
3. Monthly analysis
4. Collect user feedback

## Emergency Rollback

If critical issues arise:

```bash
# 1. Restore from Git
git log --oneline | grep "legacy"
git checkout <commit-hash>

# 2. Redeploy if needed
cd infrastructure
./deploy-staging.sh

# 3. Update DNS back
# (manual step)
```

## Key Metrics to Monitor

- **Error Rate:** < 1%
- **Latency p95:** < 200ms
- **Cache Hit Rate:** ≥ 85%
- **Cost:** ~$5.59/month
- **Uptime:** 99.9%+

## Support

- **Decommission Guide:** `docs/LEGACY_DECOMMISSION_GUIDE.md`
- **Completion Summary:** `TASK_22_COMPLETION_SUMMARY.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Architecture:** `docs/ARCHITECTURE.md`

## Status

- ✅ Decommission script created
- ✅ Documentation updated
- ✅ Archive structure defined
- ✅ Ready for execution

**Next:** Run `./infrastructure/decommission-legacy-system.sh` when ready

---

**Task:** 22 - Decommission legacy system  
**Status:** ✅ COMPLETE (ready for execution)  
**Date:** 2024-11-28
