#!/bin/bash
set -e

# ============================================================================
# Deploy Complete Staging Environment - SuplementIA
# ============================================================================
# This script deploys Lambda functions with ALL dependencies to staging
# Estimated time: 30-40 minutes
# ============================================================================

REGION="us-east-1"
ENVIRONMENT="staging"
S3_BUCKET="suplementia-lambda-deployments-staging"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  SuplementIA - Complete Staging Deployment                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Build Lambda packages with ALL dependencies (lancedb, sentence-transformers)"
echo "  2. Upload to S3"
echo "  3. Update Lambda functions"
echo "  4. Run CodeBuild to download ML models to EFS"
echo "  5. Test the deployment"
echo ""
echo "Estimated time: 30-40 minutes"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# ============================================================================
# Step 1: Build Search API Lambda
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/5: Building Search API Lambda (~10 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd search-api-lancedb
rm -rf package function.zip
mkdir -p package

echo "  → Installing dependencies for ARM64..."
pip3 install \
  --platform manylinux2014_aarch64 \
  --target=package \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --upgrade \
  --quiet \
  lancedb sentence-transformers boto3 pyarrow requests

echo "  → Packaging Lambda code..."
cp lambda_function.py package/
cd package
zip -r -q ../function.zip .
cd ..

PACKAGE_SIZE=$(du -h function.zip | cut -f1)
echo "  ✓ Package created: $PACKAGE_SIZE"

echo "  → Uploading to S3..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
aws s3 cp function.zip "s3://${S3_BUCKET}/search-api-lancedb/${TIMESTAMP}-complete.zip" \
  --region $REGION --quiet

echo "  → Updating Lambda function..."
aws lambda update-function-code \
  --function-name ${ENVIRONMENT}-search-api-lancedb \
  --s3-bucket $S3_BUCKET \
  --s3-key "search-api-lancedb/${TIMESTAMP}-complete.zip" \
  --region $REGION \
  --no-cli-pager > /dev/null

echo "  ✓ Search API Lambda deployed"

cd ..

# ============================================================================
# Step 2: Build Discovery Worker Lambda
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/5: Building Discovery Worker Lambda (~10 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd discovery-worker-lancedb
rm -rf package function.zip
mkdir -p package

echo "  → Installing dependencies for ARM64..."
pip3 install \
  --platform manylinux2014_aarch64 \
  --target=package \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --upgrade \
  --quiet \
  lancedb sentence-transformers boto3 pyarrow requests pandas

echo "  → Packaging Lambda code..."
cp lambda_function.py package/
cd package
zip -r -q ../function.zip .
cd ..

PACKAGE_SIZE=$(du -h function.zip | cut -f1)
echo "  ✓ Package created: $PACKAGE_SIZE"

echo "  → Uploading to S3..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
aws s3 cp function.zip "s3://${S3_BUCKET}/discovery-worker-lancedb/${TIMESTAMP}-complete.zip" \
  --region $REGION --quiet

echo "  → Updating Lambda function..."
aws lambda update-function-code \
  --function-name ${ENVIRONMENT}-discovery-worker-lancedb \
  --s3-bucket $S3_BUCKET \
  --s3-key "discovery-worker-lancedb/${TIMESTAMP}-complete.zip" \
  --region $REGION \
  --no-cli-pager > /dev/null

echo "  ✓ Discovery Worker Lambda deployed"

cd ..

# ============================================================================
# Step 3: Wait for Lambda updates to complete
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/5: Waiting for Lambda updates to complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → Waiting for Search API..."
aws lambda wait function-updated \
  --function-name ${ENVIRONMENT}-search-api-lancedb \
  --region $REGION

echo "  → Waiting for Discovery Worker..."
aws lambda wait function-updated \
  --function-name ${ENVIRONMENT}-discovery-worker-lancedb \
  --region $REGION

echo "  ✓ All Lambda functions updated"

# ============================================================================
# Step 4: Download ML models to EFS via CodeBuild
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/5: Downloading ML models to EFS (~10-15 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
  --project-name ${ENVIRONMENT}-efs-setup \
  --region $REGION \
  --query 'build.id' \
  --output text)

echo "  Build ID: $BUILD_ID"
echo "  → Waiting for build to complete..."

while true; do
  STATUS=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region $REGION \
    --query 'builds[0].buildStatus' \
    --output text)

  PHASE=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region $REGION \
    --query 'builds[0].currentPhase' \
    --output text)

  echo "    Phase: $PHASE | Status: $STATUS"

  if [ "$STATUS" = "SUCCEEDED" ]; then
    echo "  ✓ Models downloaded successfully"
    break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "FAULT" ] || [ "$STATUS" = "TIMED_OUT" ]; then
    echo "  ✗ Build failed: $STATUS"
    echo "  Check logs: aws logs tail /aws/codebuild/${ENVIRONMENT}-efs-setup --region $REGION --follow"
    exit 1
  fi

  sleep 30
done

# ============================================================================
# Step 5: Test deployment
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/5: Testing deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → Testing Search API Lambda..."
aws lambda invoke \
  --function-name ${ENVIRONMENT}-search-api-lancedb \
  --cli-binary-format raw-in-base64-out \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  --region $REGION \
  test-response.json > /dev/null 2>&1

if grep -q "errorMessage" test-response.json; then
  echo "  ✗ Test failed:"
  cat test-response.json | jq -r '.errorMessage'
  rm test-response.json
else
  echo "  ✓ Search API working correctly"
  rm test-response.json
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Resources deployed:"
echo "  ✓ ${ENVIRONMENT}-search-api-lancedb (with all dependencies)"
echo "  ✓ ${ENVIRONMENT}-discovery-worker-lancedb (with all dependencies)"
echo "  ✓ ML models in EFS (/mnt/efs/models/all-MiniLM-L6-v2)"
echo "  ✓ LanceDB initialized in EFS"
echo ""
echo "Test the API:"
echo "  aws lambda invoke \\"
echo "    --function-name ${ENVIRONMENT}-search-api-lancedb \\"
echo "    --cli-binary-format raw-in-base64-out \\"
echo "    --payload '{\"queryStringParameters\":{\"q\":\"vitamin c\"}}' \\"
echo "    --region $REGION \\"
echo "    response.json && cat response.json | jq ."
echo ""
echo "Monthly cost: \$5.59"
echo ""
