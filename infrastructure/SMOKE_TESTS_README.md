# Smoke Tests Guide

Comprehensive smoke tests for verifying SuplementIA system deployment and functionality.

## Overview

The smoke tests verify:
- ✅ Infrastructure deployment (CloudFormation, Lambda, DynamoDB, EFS)
- ✅ Lambda function functionality (embedding generation, search, discovery)
- ✅ Cache operations (DynamoDB read/write/delete)
- ✅ Integration flows (search, discovery queue, cache invalidation)

## Requirements

### AWS CLI
```bash
aws --version
# AWS CLI version 2.x or higher
```

### Python & Dependencies
```bash
python3 --version
# Python 3.9 or higher

pip install pytest boto3
```

### AWS Credentials
```bash
# Configure AWS credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

## Running Smoke Tests

### Quick Start

```bash
# Run all smoke tests for staging
cd infrastructure
./run-smoke-tests.sh staging

# Run for production
./run-smoke-tests.sh production
```

### Test Phases

The smoke tests run in three phases:

#### Phase 1: Infrastructure Verification
- CloudFormation stack status
- Lambda function deployment
- DynamoDB table status
- EFS file system availability
- CloudWatch log groups

#### Phase 2: Functional Tests
- Embedding generator (384-dim vectors)
- Search API (query processing)
- Cache operations (write/read/delete)

#### Phase 3: Integration Tests
- End-to-end search flow
- Discovery queue flow
- Cache invalidation flow

## Integration Tests

The integration test suite (`test_integration_suite.py`) provides comprehensive testing:

### Test Classes

#### 1. TestEndToEndSearchFlow
Tests complete search flow from query to response:
- Cache miss → vector search → cache population
- Cache hit performance
- Known supplement search
- Error handling

#### 2. TestDiscoveryQueueFlow
Tests auto-discovery system:
- Unknown supplement queuing
- Discovery worker processing
- PubMed validation
- LanceDB insertion

#### 3. TestCacheInvalidationFlow
Tests cache management:
- Cache write/read/delete operations
- TTL verification (7 days)
- Bulk invalidation patterns

#### 4. TestSystemIntegration
Tests system-wide integration:
- Embedding generator
- System health check
- Component connectivity

### Running Integration Tests Separately

```bash
cd backend/lambda

# Run all integration tests
pytest test_integration_suite.py -v

# Run specific test class
pytest test_integration_suite.py::TestEndToEndSearchFlow -v

# Run specific test
pytest test_integration_suite.py::TestEndToEndSearchFlow::test_search_with_cache_miss_then_hit -v

# Run with detailed output
pytest test_integration_suite.py -v -s

# Run with environment override
ENVIRONMENT=production pytest test_integration_suite.py -v
```

## Expected Output

### Successful Run

```
🧪 Enhanced Smoke Tests for staging
==================================================

Environment: staging
Region: us-east-1
Stack: staging-intelligent-search

📋 Phase 1: Infrastructure Verification
========================================

1. CloudFormation Stack Status
   ✓ PASS - Stack status: UPDATE_COMPLETE

2. Lambda Functions Deployment
   ✓ PASS - staging-search-api-lancedb: Active
   ✓ PASS - staging-embedding-generator: Active
   ✓ PASS - staging-discovery-worker-lancedb: Active

3. DynamoDB Tables
   ✓ PASS - staging-supplement-cache: Active
   ✓ PASS - staging-discovery-queue: Active

...

📊 Test Summary
==================================================

Environment: staging
Total Tests: 25
Passed: 22
Failed: 0
Skipped: 3

Pass Rate: 88%

✅ All tests passed!

🎉 staging environment is ready for use
```

### Failed Run

```
📋 Phase 2: Functional Tests
=============================

6. Embedding Generator Lambda
   ✗ FAIL - Lambda invocation failed

...

📊 Test Summary
==================================================

Total Tests: 25
Passed: 18
Failed: 4
Skipped: 3

❌ Some tests failed

Please review the failed tests and fix any issues before proceeding.

Common issues:
  - Lambda functions not deployed: Run ./deploy-staging-lambdas.sh
  - DynamoDB tables missing: Check CloudFormation stack
  - EFS not mounted: Verify Lambda VPC configuration
  - Model not loaded: Run upload-model-to-efs.sh
```

## Troubleshooting

### Lambda Function Not Found

```bash
# Check if Lambda exists
aws lambda list-functions --region us-east-1 | grep staging

# Deploy Lambda functions
cd backend/lambda
./deploy-staging-lambdas.sh
```

### DynamoDB Table Not Found

```bash
# Check if tables exist
aws dynamodb list-tables --region us-east-1 | grep staging

# Deploy CloudFormation stack
cd infrastructure
./deploy-staging.sh
```

### EFS Not Accessible

```bash
# Check EFS file systems
aws efs describe-file-systems --region us-east-1

# Verify Lambda VPC configuration
aws lambda get-function-configuration \
  --function-name staging-search-api-lancedb \
  --query 'VpcConfig'
```

### Model Not Loaded

```bash
# Upload model to EFS
cd backend/lambda
python3 download-model-to-efs.py
```

### Integration Tests Fail

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify environment variables
echo $ENVIRONMENT
echo $AWS_REGION

# Run with debug output
pytest test_integration_suite.py -v -s --tb=long
```

## Test Coverage

### Requirements Validated

- **1.1**: CloudFormation stack deployment
- **1.2**: EFS mount accessibility
- **1.3**: Lambda function deployment
- **1.4**: DynamoDB table creation
- **2.1**: LanceDB initialization
- **2.2**: Vector dimension consistency
- **3.1**: Model deployment to EFS
- **6.1**: API Gateway endpoint
- **6.3**: CORS configuration
- **11.3**: Integration test coverage

### Properties Tested

- **Property 3**: Embedding generation consistency (384-dim)
- **Property 8**: Discovery queue insertion
- **Property 13**: Cache-first search strategy
- **Property 14**: Cache hit performance
- **Property 15**: Cache population on miss
- **Property 16**: Cache TTL configuration (7 days)
- **Property 22**: Input validation and sanitization

## Continuous Integration

### GitHub Actions Example

```yaml
name: Smoke Tests

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install pytest boto3
      
      - name: Run smoke tests
        run: |
          cd infrastructure
          ./run-smoke-tests.sh staging
```

## Performance Benchmarks

Expected performance metrics:

- **Embedding Generation**: < 100ms
- **Cache Hit**: < 10ms
- **Cache Miss + Vector Search**: < 200ms
- **Discovery Queue Insertion**: < 50ms
- **End-to-End Search**: < 300ms

## Next Steps

After smoke tests pass:

1. **Performance Testing**
   ```bash
   cd backend/lambda
   pytest test_performance.py -v
   ```

2. **Security Audit**
   ```bash
   pytest test_security_audit.py -v
   ```

3. **Load Testing**
   ```bash
   cd scripts
   ./stress-test-production.sh
   ```

4. **Monitor Metrics**
   - Open CloudWatch dashboard
   - Check error rates
   - Verify latency targets
   - Monitor cache hit rate

## Support

For issues or questions:
- Check `TROUBLESHOOTING.md`
- Review CloudWatch logs
- Check Lambda function logs
- Verify AWS resource status

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `QUICK_DEPLOY_REFERENCE.md` - Quick deployment guide
- `TEST_README.md` - Testing overview
- `TROUBLESHOOTING.md` - Common issues and solutions
