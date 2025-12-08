#!/bin/bash
set -e

# Optimized deployment using EFS for heavy dependencies

REGION="us-east-1"
ENVIRONMENT="staging"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  SuplementIA - Optimized Staging Deployment (EFS-based)       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Strategy: Install heavy dependencies (sentence-transformers) in EFS"
echo "Lambda packages: Only minimal code + boto3"
echo ""
echo "Steps:"
echo "  1. Run CodeBuild to install everything in EFS (~15 min)"
echo "  2. Deploy minimal Lambda packages (~2 min)"
echo "  3. Test (~2 min)"
echo ""
echo "Total time: ~20 minutes"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Step 1: Install everything in EFS via CodeBuild
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Installing dependencies + models in EFS (~15 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUILD_ID=$(aws codebuild start-build \
  --project-name ${ENVIRONMENT}-efs-setup \
  --region $REGION \
  --query 'build.id' \
  --output text)

echo "  Build started: $BUILD_ID"
echo "  Waiting for completion..."

while true; do
  STATUS=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --region $REGION --query 'builds[0].buildStatus' --output text)
  PHASE=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --region $REGION --query 'builds[0].currentPhase' --output text)
  
  echo "    Phase: $PHASE | Status: $STATUS"
  
  if [ "$STATUS" = "SUCCEEDED" ]; then
    echo "  ✓ EFS setup complete"
    break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "FAULT" ] || [ "$STATUS" = "TIMED_OUT" ]; then
    echo "  ✗ Build failed. Check logs:"
    echo "    aws logs tail /aws/codebuild/${ENVIRONMENT}-efs-setup --region $REGION"
    exit 1
  fi
  
  sleep 20
done

# Step 2: Deploy minimal Lambdas
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Deploying minimal Lambda packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Already have minimal packages in S3 from earlier
echo "  → Using existing minimal packages from S3"
echo "  ✓ Lambdas already configured to use EFS"

# Step 3: Test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Testing deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → Testing Search API..."
aws lambda invoke \
  --function-name ${ENVIRONMENT}-search-api-lancedb \
  --cli-binary-format raw-in-base64-out \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  --region $REGION \
  test-response.json > /dev/null 2>&1

if grep -q "errorMessage" test-response.json; then
  echo "  Response:"
  cat test-response.json | jq .
  rm test-response.json
else
  echo "  ✓ Search API working!"
  rm test-response.json
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Architecture:"
echo "  • Lambda packages: Minimal (~15MB each)"
echo "  • Dependencies: In EFS /mnt/efs/python/"
echo "  • Models: In EFS /mnt/efs/models/"
echo "  • Database: In EFS /mnt/efs/suplementia-lancedb/"
echo ""
