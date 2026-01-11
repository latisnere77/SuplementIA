# Quick Start - Deploy Staging Environment

This guide provides the fastest path to deploying the intelligent supplement search system to staging.

## Prerequisites

- AWS CLI configured with appropriate credentials
- PostgreSQL client (psql) installed
- Python 3.11+ with pip
- Bash shell

## Step-by-Step Deployment

### 1. Deploy Infrastructure (15-20 minutes)

```bash
cd infrastructure
./deploy-staging.sh
```

When prompted, enter a secure RDS password (min 8 characters).

**What this does:**
- Creates VPC, subnets, security groups
- Deploys RDS Postgres, DynamoDB, Redis, EFS
- Sets up IAM roles and CloudWatch monitoring

### 2. Initialize Database (2 minutes)

```bash
./init-rds-pgvector.sh staging
```

When prompted:
- Username: `postgres` (default)
- Password: (same as step 1)

**What this does:**
- Enables pgvector extension
- Creates supplements table
- Creates HNSW index for vector search

### 3. Store RDS Password in Parameter Store

```bash
aws ssm put-parameter \
  --name /suplementia/staging/rds/password \
  --value "YOUR_PASSWORD" \
  --type SecureString \
  --region us-east-1
```

Replace `YOUR_PASSWORD` with the password from step 1.

### 4. Deploy Lambda Functions (5 minutes)

```bash
cd ../backend/lambda
./deploy-staging-lambdas.sh
```

**What this does:**
- Packages and deploys 3 Lambda functions
- Configures VPC and environment variables
- Sets up DynamoDB Stream trigger

### 5. Upload ML Model to EFS (10 minutes)

```bash
./upload-model-to-efs.sh staging
```

**What this does:**
- Downloads Sentence Transformers model
- Uploads to EFS for Lambda access
- Verifies model is accessible

### 6. Run Smoke Tests (2 minutes)

```bash
cd ../../infrastructure
./smoke-tests.sh staging
```

**What this does:**
- Tests all infrastructure components
- Verifies Lambda functions work
- Checks cache operations
- Validates monitoring setup

## Verification

After deployment, verify the system:

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name staging-intelligent-search \
  --query 'Stacks[0].StackStatus'

# Test embedding generator
aws lambda invoke \
  --function-name staging-embedding-generator \
  --payload '{"text":"vitamin d"}' \
  response.json

cat response.json | python3 -m json.tool

# Test search API
aws lambda invoke \
  --function-name staging-search-api \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json

cat response.json | python3 -m json.tool
```

## Common Issues

### Issue: Lambda VPC timeout

**Solution:** Ensure NAT Gateway is configured or use VPC endpoints for AWS services.

### Issue: EFS mount fails

**Solution:** Check security groups allow NFS (port 2049) and Lambda is in correct subnets.

### Issue: RDS connection refused

**Solution:** Verify password in Parameter Store and security group rules.

### Issue: Model download timeout

**Solution:** Increase Lambda timeout and memory in the upload script.

## Next Steps

1. **Populate Data**
   - Export supplements from legacy system
   - Generate embeddings
   - Insert into RDS

2. **Integration Testing**
   - Test search with real queries
   - Verify cache performance
   - Check discovery queue

3. **Performance Testing**
   - Benchmark latency
   - Test throughput
   - Measure cache hit rate

4. **Production Deployment**
   - Follow Task 15 for gradual rollout
   - Monitor metrics closely
   - Keep legacy system as fallback

## Cost Monitoring

Monitor costs in AWS Cost Explorer:

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

Expected staging costs: $14-18/month

## Cleanup

To delete the staging environment:

```bash
# Delete Lambda functions
aws lambda delete-function --function-name staging-search-api
aws lambda delete-function --function-name staging-embedding-generator
aws lambda delete-function --function-name staging-discovery-worker

# Delete CloudFormation stack (deletes all infrastructure)
aws cloudformation delete-stack --stack-name staging-intelligent-search

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name staging-intelligent-search
```

## Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Review CloudFormation events
3. Consult STAGING-DEPLOYMENT-GUIDE.md
4. Contact DevOps team

## Summary

Total deployment time: ~35 minutes

| Step | Time | Status |
|------|------|--------|
| Infrastructure | 15-20 min | ✅ |
| Database Init | 2 min | ✅ |
| Lambda Deploy | 5 min | ✅ |
| Model Upload | 10 min | ✅ |
| Smoke Tests | 2 min | ✅ |

After completion, you'll have a fully functional staging environment ready for testing and validation.
