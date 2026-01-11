# Quick Deployment Reference Card

## Prerequisites Check
```bash
# Verify AWS CLI
aws --version

# Verify credentials
aws sts get-caller-identity

# Verify region
echo $AWS_REGION  # Should be us-east-1
```

## Deploy Infrastructure (5 commands)

```bash
# 1. Deploy CloudFormation stack
cd infrastructure
./deploy-lancedb-stack.sh staging your-email@example.com

# 2. Verify deployment
./verify-deployment.sh staging

# 3. Run integration tests
cd ..
npm install
TEST_ENVIRONMENT=staging npm test infrastructure/test-infrastructure.test.ts

# 4. Run smoke tests
cd infrastructure
./smoke-tests.sh staging

# 5. Get stack outputs
aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Quick Verification

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].StackStatus' \
  --output text

# Check Lambda functions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `staging`)].FunctionName' \
  --output table

# Check DynamoDB tables
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `staging`)]' \
  --output table

# Check EFS
aws efs describe-file-systems \
  --query 'FileSystems[?Tags[?Key==`Environment` && Value==`staging`]]' \
  --output table
```

## Troubleshooting Quick Fixes

```bash
# View recent CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name staging-suplementia-lancedb \
  --max-items 10 \
  --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,ResourceStatusReason]' \
  --output table

# Check Lambda logs
aws logs tail /aws/lambda/staging-search-api-lancedb --follow

# Test Lambda function
aws lambda invoke \
  --function-name staging-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json && cat response.json | jq .

# Delete and redeploy
aws cloudformation delete-stack --stack-name staging-suplementia-lancedb
aws cloudformation wait stack-delete-complete --stack-name staging-suplementia-lancedb
./deploy-lancedb-stack.sh staging your-email@example.com
```

## Expected Costs

| Service | Monthly Cost |
|---------|-------------|
| Lambda | $1.20 |
| DynamoDB | $0.80 |
| EFS | $0.02 |
| API Gateway | $3.50 |
| CloudWatch | $0.07 |
| **Total** | **$5.59** |

## Key Endpoints

```bash
# Get API Gateway endpoint
aws cloudformation describe-stacks \
  --stack-name staging-api-gateway \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text

# Get EFS ID
aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
  --output text

# Get Cache Table Name
aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`SupplementCacheTableName`].OutputValue' \
  --output text
```

## Success Criteria

- [ ] Stack status: CREATE_COMPLETE
- [ ] All 17 integration tests pass
- [ ] All 25 smoke tests pass
- [ ] Lambda functions active
- [ ] DynamoDB tables active
- [ ] EFS available
- [ ] CloudWatch alarms configured

## Support

- Full guide: `DEPLOYMENT_GUIDE.md`
- Test docs: `TEST_README.md`
- Verification: `./verify-deployment.sh staging`
