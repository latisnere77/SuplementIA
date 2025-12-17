#!/bin/bash
set -e

# SuplementIA - Deploy Complete LanceDB Stack
# Usage: ./deploy-lancedb-stack.sh [staging|production] [alert-email]

ENVIRONMENT=${1:-production}
ALERT_EMAIL=${2:-alerts@suplementia.com}
STACK_NAME="${ENVIRONMENT}-lancedb"
REGION="us-east-1"

echo "=========================================="
echo "SuplementIA - LanceDB Stack Deployment"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"
echo "Alert Email: $ALERT_EMAIL"
echo "Region: $REGION"
echo "=========================================="
echo ""

# Confirm deployment
read -p "Deploy stack? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy CloudFormation stack
echo ""
echo "Step 1: Deploying CloudFormation stack..."
echo "=========================================="

aws cloudformation deploy \
  --template-file cloudformation/lancedb-stack.yml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AlertEmail="$ALERT_EMAIL" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --no-fail-on-empty-changeset

echo "✓ CloudFormation stack deployed"

# Get stack outputs
echo ""
echo "Step 2: Getting stack outputs..."
echo "=========================================="

EFS_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
  --output text)

SEARCH_API_ARN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`SearchAPILambdaArn`].OutputValue' \
  --output text)

CACHE_TABLE=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`SupplementCacheTableName`].OutputValue' \
  --output text)

echo "EFS File System ID: $EFS_ID"
echo "Search API Lambda ARN: $SEARCH_API_ARN"
echo "Cache Table Name: $CACHE_TABLE"

# Instructions for model download
echo ""
echo "=========================================="
echo "Step 3: Download ML Model to EFS"
echo "=========================================="
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo ""
echo "You need to download the Sentence Transformers model to EFS."
echo "Options:"
echo ""
echo "Option A: Use EC2 instance with EFS mounted"
echo "  1. Launch EC2 instance in same VPC"
echo "  2. Mount EFS: sudo mount -t efs $EFS_ID:/ /mnt/efs"
echo "  3. Run: python3 backend/scripts/download-model-to-efs.py"
echo ""
echo "Option B: Use Lambda function (one-time)"
echo "  1. Create temporary Lambda with EFS access"
echo "  2. Run download script"
echo "  3. Delete temporary Lambda"
echo ""
read -p "Press Enter when model download is complete..."

# Instructions for data migration
echo ""
echo "=========================================="
echo "Step 4: Migrate Data to LanceDB"
echo "=========================================="
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo ""
echo "Run the migration script to populate LanceDB:"
echo "  python3 backend/scripts/migrate-to-lancedb.py"
echo ""
read -p "Press Enter when data migration is complete..."

# Deploy Lambda functions
echo ""
echo "Step 5: Deploying Lambda functions..."
echo "=========================================="

echo "Deploying Search API Lambda..."
cd ../backend/lambda/search-api-lancedb
./deploy.sh "$ENVIRONMENT"

echo ""
echo "Deploying Discovery Worker Lambda..."
cd ../discovery-worker-lancedb
./deploy.sh "$ENVIRONMENT"

cd ../../../infrastructure

# Verify deployment
echo ""
echo "=========================================="
echo "Step 6: Verifying deployment..."
echo "=========================================="

echo "Testing Search API Lambda..."
aws lambda invoke \
  --function-name "${ENVIRONMENT}-search-api-lancedb" \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  --region "$REGION" \
  response.json \
  --no-cli-pager

echo ""
echo "Response:"
cat response.json | jq .
rm response.json

# Summary
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""
echo "Resources Created:"
echo "  ✓ EFS File System: $EFS_ID"
echo "  ✓ DynamoDB Tables: 2"
echo "  ✓ Lambda Functions: 2"
echo "  ✓ CloudWatch Alarms: 2"
echo ""
echo "Next Steps:"
echo "  1. Monitor CloudWatch metrics"
echo "  2. Test search functionality"
echo "  3. Verify cost in AWS Cost Explorer"
echo ""
echo "Expected Monthly Cost: \$5.59"
echo "=========================================="
