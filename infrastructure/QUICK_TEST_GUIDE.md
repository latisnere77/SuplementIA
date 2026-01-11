# Quick Test Guide

Fast reference for running smoke tests and integration tests.

## Prerequisites

```bash
# Install dependencies
pip install pytest boto3

# Configure AWS credentials
aws configure
# OR
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

## Quick Commands

### Run All Tests (Recommended)

```bash
# Staging environment
cd infrastructure
./run-smoke-tests.sh staging
```

This runs:
1. Infrastructure verification (CloudFormation, Lambda, DynamoDB, EFS)
2. Functional tests (embedding, search, cache)
3. Integration tests (end-to-end flows)

### Run Only Integration Tests

```bash
cd backend/lambda
pytest test_integration_suite.py -v
```

### Run Specific Test Class

```bash
# Search flow tests
pytest test_integration_suite.py::TestEndToEndSearchFlow -v

# Discovery queue tests
pytest test_integration_suite.py::TestDiscoveryQueueFlow -v

# Cache tests
pytest test_integration_suite.py::TestCacheInvalidationFlow -v

# System integration tests
pytest test_integration_suite.py::TestSystemIntegration -v
```

### Run Single Test

```bash
pytest test_integration_suite.py::TestEndToEndSearchFlow::test_search_with_cache_miss_then_hit -v
```

## Expected Results

### ✅ Success

```
📊 Test Summary
==================================================
Total Tests: 25
Passed: 22
Failed: 0
Skipped: 3
Pass Rate: 88%

✅ All tests passed!
🎉 staging environment is ready for use
```

### ❌ Failure

```
📊 Test Summary
==================================================
Total Tests: 25
Passed: 18
Failed: 4
Skipped: 3

❌ Some tests failed

Common issues:
  - Lambda functions not deployed: Run ./deploy-staging-lambdas.sh
  - DynamoDB tables missing: Check CloudFormation stack
```

## Quick Fixes

### Lambda Not Deployed
```bash
cd backend/lambda
./deploy-staging-lambdas.sh
```

### Stack Not Deployed
```bash
cd infrastructure
./deploy-staging.sh
```

### Model Not Uploaded
```bash
cd backend/lambda
python3 download-model-to-efs.py
```

## Test Coverage

- **Infrastructure**: CloudFormation, Lambda, DynamoDB, EFS, CloudWatch
- **Functionality**: Embedding generation, search, cache operations
- **Integration**: End-to-end search, discovery queue, cache invalidation
- **Properties**: 8 correctness properties validated

## Performance Targets

- Embedding generation: < 100ms
- Cache hit: < 10ms
- Vector search: < 200ms
- End-to-end: < 300ms

## More Information

- Full guide: `SMOKE_TESTS_README.md`
- Troubleshooting: `../TROUBLESHOOTING.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
