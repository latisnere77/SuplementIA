# SuplementIA Infrastructure Deployment Guide

This guide provides step-by-step instructions for deploying the SuplementIA infrastructure to AWS.

## Prerequisites

### 1. AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- IAM user with CloudFormation, Lambda, DynamoDB, EFS, EC2, and IAM permissions

### 2. Local Environment
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
pip install awscli  # Python

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# Verify configuration
aws sts get-caller-identity
```

### 3. Required Tools
- Node.js 18+ (for tests)
- Python 3.11+ (for Lambda functions)
- jq (for JSON parsing)
- Git

## Deployment Steps

### Step 1: Deploy CloudFormation Stack

The infrastructure uses the LanceDB stack template which includes:
- VPC with private subnets
- EFS file system for LanceDB and ML models
- DynamoDB tables (supplement-cache, discovery-queue)
- Lambda functions (search-api, discovery-worker)
- CloudWatch monitoring and alarms

```bash
cd infrastructure

# Deploy to staging
./deploy-lancedb-stack.sh staging your-email@example.com

# Or deploy to production
./deploy-lancedb-stack.sh production your-email@example.com
```

**What this does:**
1. Validates the CloudFormation template
2. Deploys the stack (takes 15-20 minutes)
3. Creates all AWS resources
4. Sets up CloudWatch alarms
5. Outputs resource IDs and ARNs

**Expected Output:**
```
==========================================
SuplementIA - LanceDB Stack Deployment
==========================================
Environment: staging
Stack Name: staging-lancedb
Alert Email: your-email@example.com
Region: us-east-1
==========================================

Deploy stack? (y/n): y

Step 1: Deploying CloudFormation stack...
==========================================
✓ CloudFormation stack deployed

Step 2: Getting stack outputs...
==========================================
EFS File System ID: fs-0123456789abcdef
Search API Lambda ARN: arn:aws:lambda:us-east-1:...
Cache Table Name: staging-lancedb-supplement-cache
```

### Step 2: Verify Infrastructure Deployment

Run the verification script to ensure all resources are created correctly:

```bash
./verify-deployment.sh staging
```

**Expected Output:**
```
==========================================
SuplementIA Infrastructure Verification
==========================================
Environment: staging
Stack Name: staging-suplementia-lancedb
Region: us-east-1
==========================================

✓ AWS CLI configured

Test Suite 1: CloudFormation Stack
====================================
Testing: CloudFormation stack exists... ✓ PASS
Testing: All stack resources created... ✓ PASS

Test Suite 2: VPC and Networking
====================================
Testing: VPC exists and is available... ✓ PASS
Testing: VPC has correct CIDR block... ✓ PASS
Testing: Private subnets exist... ✓ PASS
Testing: Subnets are in different AZs... ✓ PASS

...

==========================================
Test Summary
==========================================
Total Tests: 25
Passed: 25
Failed: 0

✅ All tests passed!
Infrastructure is ready for use
```

### Step 3: Run Integration Tests

Run the comprehensive integration test suite:

```bash
# Install dependencies
npm install

# Run integration tests
TEST_ENVIRONMENT=staging npm test infrastructure/test-infrastructure.test.ts
```

**Expected Output:**
```
PASS infrastructure/test-infrastructure.test.ts
  Infrastructure Deployment Tests
    CloudFormation Stack
      ✓ should have stack in CREATE_COMPLETE or UPDATE_COMPLETE status (1234ms)
      ✓ should have all required resources created (567ms)
      ✓ should have all resources in CREATE_COMPLETE status (890ms)
    VPC Configuration
      ✓ should have VPC with correct CIDR block (456ms)
      ✓ should have two private subnets in different AZs (678ms)
    Security Groups
      ✓ should have Lambda security group with correct egress rules (345ms)
      ✓ should have EFS security group allowing NFS from Lambda (456ms)
    DynamoDB Tables
      ✓ should have supplement-cache table with correct schema (789ms)
      ✓ should have discovery-queue table with correct schema (567ms)
    EFS File System
      ✓ should have EFS file system in available state (890ms)
      ✓ should have mount targets in both availability zones (678ms)
      ✓ should have access point configured (345ms)
    Lambda Functions
      ✓ should have search-api Lambda function deployed (1234ms)
      ✓ should have discovery-worker Lambda function deployed (1123ms)
    CloudWatch Monitoring
      ✓ should have log groups created for Lambda functions (456ms)
      ✓ should have CloudWatch alarms configured (567ms)
    IAM Roles
      ✓ should have Lambda execution role with correct permissions (345ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        45.678s
```

### Step 4: Upload ML Model to EFS

The ML model (Sentence Transformers all-MiniLM-L6-v2) needs to be uploaded to EFS.

**Option A: Using EC2 Instance (Recommended)**

1. Launch an EC2 instance in the same VPC:
```bash
# Get VPC ID from stack outputs
VPC_ID=$(aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
  --output text)

# Get Subnet ID
SUBNET_ID=$(aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1Id`].OutputValue' \
  --output text)

# Launch EC2 instance (Amazon Linux 2)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --subnet-id $SUBNET_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=efs-uploader}]'
```

2. SSH into the instance and mount EFS:
```bash
# Get EFS ID
EFS_ID=$(aws cloudformation describe-stacks \
  --stack-name staging-suplementia-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
  --output text)

# Mount EFS
sudo mkdir -p /mnt/efs
sudo mount -t efs $EFS_ID:/ /mnt/efs

# Create directories
sudo mkdir -p /mnt/efs/suplementia-lancedb
sudo mkdir -p /mnt/efs/models
```

3. Download and upload the model:
```bash
# Install Python and dependencies
sudo yum install -y python3 python3-pip
pip3 install sentence-transformers

# Download model
python3 << EOF
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
model.save('/mnt/efs/models/all-MiniLM-L6-v2')
print("Model saved successfully!")
EOF

# Verify model files
ls -lh /mnt/efs/models/all-MiniLM-L6-v2/
```

4. Terminate the EC2 instance:
```bash
# Get instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=efs-uploader" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Terminate
aws ec2 terminate-instances --instance-ids $INSTANCE_ID
```

**Option B: Using CodeBuild (Automated)**

```bash
# Deploy CodeBuild project for EFS setup
aws cloudformation deploy \
  --template-file cloudformation/codebuild-efs-setup.yml \
  --stack-name staging-efs-setup \
  --capabilities CAPABILITY_IAM

# Trigger build
aws codebuild start-build --project-name staging-efs-model-download
```

### Step 5: Initialize LanceDB

Create the LanceDB database and table structure:

```bash
# Run initialization script via Lambda
aws lambda invoke \
  --function-name staging-search-api-lancedb \
  --payload '{"action":"init_database"}' \
  response.json

# Verify response
cat response.json | jq .
```

### Step 6: Migrate Legacy Data

Migrate the 70 legacy supplements to LanceDB:

```bash
cd backend/scripts

# Run migration script
python3 migrate-to-lancedb.py --environment staging

# Expected output:
# Migrating 70 supplements to LanceDB...
# ✓ Generated embeddings for all supplements
# ✓ Inserted 70 supplements into LanceDB
# ✓ Created HNSW index
# ✓ Migration complete!
```

### Step 7: Deploy Lambda Function Code

Deploy the actual Lambda function code (the CloudFormation stack creates placeholder functions):

```bash
cd backend/lambda

# Deploy Search API
cd search-api-lancedb
./deploy.sh staging

# Deploy Discovery Worker
cd ../discovery-worker-lancedb
./deploy.sh staging

# Deploy Embedding Generator
cd ../embedding-generator
./deploy.sh staging
```

### Step 8: Configure API Gateway

Set up API Gateway to expose the search endpoint:

```bash
cd infrastructure

# Deploy API Gateway
./deploy-api-gateway.sh staging

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name staging-api-gateway \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "API Endpoint: $API_ENDPOINT"
```

### Step 9: Run Smoke Tests

Execute smoke tests to verify end-to-end functionality:

```bash
cd infrastructure

# Run smoke tests
./smoke-tests.sh staging

# Expected output:
# 🧪 Running Smoke Tests for staging
# ==================================================
# 
# Testing: CloudFormation stack exists... ✓ PASS
# Testing: RDS instance is available... ✓ PASS
# Testing: DynamoDB cache table exists... ✓ PASS
# Testing: DynamoDB discovery queue exists... ✓ PASS
# Testing: EFS file system is available... ✓ PASS
# Testing: Embedding generator Lambda exists... ✓ PASS
# Testing: Search API Lambda exists... ✓ PASS
# Testing: Discovery worker Lambda exists... ✓ PASS
# Testing: Embedding generator Lambda... ✓ PASS - Generated 384-dimensional embedding
# Testing: Search API Lambda... ✓ PASS - Search API responded (status: 200)
# Testing: DynamoDB cache write/read... ✓ PASS
# 
# ==================================================
# 📊 Test Summary
# ==================================================
# Total Tests: 25
# Passed: 25
# Failed: 0
# 
# ✅ All tests passed!
# 🎉 Staging environment is ready for use
```

### Step 10: Update Frontend Configuration

Update the frontend environment variables to point to the new API:

```bash
# Get API Gateway endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name staging-api-gateway \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Update .env.staging
echo "NEXT_PUBLIC_SEARCH_API_URL=${API_ENDPOINT}" >> .env.staging
echo "NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true" >> .env.staging

# Deploy to Vercel
vercel --prod --env NEXT_PUBLIC_SEARCH_API_URL=${API_ENDPOINT}
```

## Verification Checklist

After deployment, verify the following:

- [ ] CloudFormation stack status is CREATE_COMPLETE
- [ ] All 25 infrastructure tests pass
- [ ] VPC and subnets created in 2 AZs
- [ ] EFS file system mounted and accessible
- [ ] ML model uploaded to EFS (~80MB)
- [ ] DynamoDB tables active with correct schemas
- [ ] Lambda functions deployed and active
- [ ] Lambda functions have VPC and EFS configuration
- [ ] CloudWatch log groups created
- [ ] CloudWatch alarms configured
- [ ] LanceDB initialized with supplements table
- [ ] 70 legacy supplements migrated
- [ ] Search API returns results
- [ ] Discovery queue processes unknown supplements
- [ ] API Gateway endpoint accessible
- [ ] Frontend connected to new API

## Troubleshooting

### Stack Creation Fails

**Error:** "Resource creation failed"

**Solution:**
1. Check CloudFormation events:
```bash
aws cloudformation describe-stack-events \
  --stack-name staging-suplementia-lancedb \
  --max-items 20
```

2. Look for specific resource failures
3. Fix the issue and update the stack:
```bash
aws cloudformation update-stack \
  --stack-name staging-suplementia-lancedb \
  --template-body file://cloudformation/lancedb-stack.yml \
  --capabilities CAPABILITY_NAMED_IAM
```

### EFS Mount Fails

**Error:** "Failed to mount EFS"

**Solution:**
1. Verify security group allows NFS (port 2049)
2. Check mount targets are in correct subnets
3. Verify Lambda is in same VPC as EFS

### Lambda Function Timeout

**Error:** "Task timed out after 30.00 seconds"

**Solution:**
1. Increase Lambda timeout:
```bash
aws lambda update-function-configuration \
  --function-name staging-search-api-lancedb \
  --timeout 60
```

2. Check EFS mount is working
3. Verify model is loaded correctly

### Model Not Found

**Error:** "Model not found at /mnt/efs/models/all-MiniLM-L6-v2"

**Solution:**
1. Verify EFS mount:
```bash
aws lambda invoke \
  --function-name staging-search-api-lancedb \
  --payload '{"action":"check_efs"}' \
  response.json
```

2. Re-upload model using EC2 instance
3. Check file permissions

### DynamoDB Throttling

**Error:** "ProvisionedThroughputExceededException"

**Solution:**
- Tables use PAY_PER_REQUEST billing, so this shouldn't happen
- If it does, check for infinite loops or excessive requests

## Cost Monitoring

Monitor costs in AWS Cost Explorer:

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

**Expected Monthly Costs (10K searches/day):**
- Lambda: $1.20
- DynamoDB: $0.80
- EFS: $0.02
- API Gateway: $3.50
- CloudWatch: $0.07
- **Total: ~$5.59/month**

## Rollback Procedure

If deployment fails or issues arise:

```bash
# Delete the stack
aws cloudformation delete-stack \
  --stack-name staging-suplementia-lancedb

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name staging-suplementia-lancedb

# Redeploy
./deploy-lancedb-stack.sh staging your-email@example.com
```

## Next Steps

After successful deployment:

1. **Monitor Performance**
   - Check CloudWatch dashboards
   - Review Lambda execution times
   - Monitor cache hit rates

2. **Test Functionality**
   - Test search with known supplements
   - Test discovery queue with unknown supplements
   - Verify cache is working

3. **Production Deployment**
   - Follow same steps for production environment
   - Use gradual rollout (10% → 50% → 100%)
   - Monitor metrics closely

4. **Documentation**
   - Update API documentation
   - Document any custom configurations
   - Create runbooks for common operations

## Support

For issues or questions:
- Check CloudWatch logs
- Review CloudFormation events
- Run verification scripts
- Check AWS service health dashboard
