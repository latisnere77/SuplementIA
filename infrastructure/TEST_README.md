# Infrastructure Integration Tests

This directory contains integration tests for validating AWS infrastructure deployment.

## Test Coverage

The integration tests verify:

1. **CloudFormation Stack**
   - Stack status (CREATE_COMPLETE or UPDATE_COMPLETE)
   - All required resources created
   - All resources in healthy state

2. **VPC Configuration**
   - VPC with correct CIDR block (10.0.0.0/16)
   - Two private subnets in different AZs
   - Proper subnet CIDR blocks

3. **Security Groups**
   - Lambda security group with egress rules
   - EFS security group allowing NFS (port 2049) from Lambda

4. **DynamoDB Tables**
   - `supplement-cache` table with correct schema (PK/SK)
   - `discovery-queue` table with correct schema
   - TTL enabled on cache table
   - Streams enabled on both tables
   - PAY_PER_REQUEST billing mode

5. **EFS File System**
   - File system in available state
   - Encryption enabled
   - Mount targets in both AZs
   - Access point configured

6. **Lambda Functions**
   - `search-api-lancedb` function deployed
   - `discovery-worker-lancedb` function deployed
   - Correct runtime (Python 3.11)
   - ARM64 architecture
   - VPC configuration
   - EFS mount at `/mnt/efs`
   - Environment variables set

7. **CloudWatch Monitoring**
   - Log groups for Lambda functions
   - CloudWatch alarms for errors and latency

8. **IAM Roles**
   - Lambda execution roles with correct permissions

## Prerequisites

1. AWS credentials configured:
   ```bash
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   export AWS_REGION=us-east-1
   ```

2. Infrastructure deployed:
   ```bash
   cd infrastructure
   ./deploy-staging.sh
   ```

3. Dependencies installed:
   ```bash
   npm install
   ```

## Running Tests

### Run all infrastructure tests:
```bash
npm test infrastructure/test-infrastructure.test.ts
```

### Run with specific environment:
```bash
TEST_ENVIRONMENT=staging npm test infrastructure/test-infrastructure.test.ts
```

### Run with different region:
```bash
AWS_REGION=us-west-2 npm test infrastructure/test-infrastructure.test.ts
```

## Environment Variables

- `TEST_ENVIRONMENT`: Environment to test (default: `staging`)
- `AWS_REGION`: AWS region (default: `us-east-1`)

## Test Timeout

Some tests may take longer due to AWS API calls. The default timeout is set to 30 seconds for the beforeAll hook.

## Troubleshooting

### Stack not found
If you get "Stack not found" errors, ensure:
1. The stack is deployed: `aws cloudformation describe-stacks --stack-name staging-suplementia-lancedb`
2. You're using the correct region
3. Your AWS credentials have permission to describe stacks

### Resource not found
If specific resources are not found:
1. Check the CloudFormation stack outputs
2. Verify the resource was created successfully
3. Check the resource naming convention matches the test expectations

### Timeout errors
If tests timeout:
1. Increase the Jest timeout in the test file
2. Check your network connection to AWS
3. Verify AWS services are responding normally

## CI/CD Integration

These tests should be run:
1. After infrastructure deployment
2. Before promoting to production
3. As part of smoke tests
4. In CI/CD pipeline after stack updates

## Related Files

- `deploy-staging.sh`: Deploys staging infrastructure
- `smoke-tests.sh`: Bash-based smoke tests
- `cloudformation/lancedb-stack.yml`: Infrastructure template
