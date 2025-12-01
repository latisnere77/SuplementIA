# Checkpoint Quick Reference

## Task 17: Staging Validation Checkpoint

### Quick Start

```bash
# Run full validation
cd infrastructure
./checkpoint-17-validation.sh

# Expected runtime: 5-10 minutes
# Expected result: All required tests pass
```

### What Gets Validated

1. **Infrastructure** (25+ checks)
   - CloudFormation stack
   - Lambda functions (3)
   - DynamoDB tables (2)
   - EFS file system
   - CloudWatch logs

2. **Properties** (22 properties)
   - Vector dimensions (384-dim)
   - Query performance (< 10ms)
   - Cache behavior (TTL, hit rate)
   - Discovery queue
   - Security controls

3. **Integration** (9 test cases)
   - End-to-end search flow
   - Discovery queue flow
   - Cache invalidation
   - System health

4. **Performance** (4 scenarios)
   - Cache hit latency
   - Vector search latency
   - Discovery queue
   - Concurrent load

### Success Criteria

✅ All required tests pass  
✅ Performance targets met  
✅ Security controls verified  
✅ 100% requirements coverage  

### If Tests Fail

Common issues and fixes:

```bash
# Lambda functions not deployed
cd backend/lambda
./deploy-staging-lambdas.sh

# DynamoDB tables missing
cd infrastructure
./deploy-staging.sh

# Model not loaded
python3 backend/lambda/download-model-to-efs.py

# LanceDB not initialized
python3 backend/lambda/initialize-lancedb.py
```

### Next Steps After Passing

1. Review CloudWatch metrics
2. Verify cost estimates
3. Prepare production deployment
4. Deploy to production (10% traffic)

```bash
cd infrastructure
./deploy-production-10-percent.sh
```

### Documentation

- Full details: `infrastructure/TASK_17_CHECKPOINT_SUMMARY.md`
- Completion summary: `TASK_17_COMPLETION_SUMMARY.md`
- Smoke tests guide: `infrastructure/SMOKE_TESTS_README.md`

### Support

If you encounter issues:

1. Check `TROUBLESHOOTING.md`
2. Review CloudWatch logs
3. Run smoke tests individually
4. Check AWS service status

---

**Quick Validation Command:**
```bash
./infrastructure/checkpoint-17-validation.sh && echo "✅ Ready for production!"
```
