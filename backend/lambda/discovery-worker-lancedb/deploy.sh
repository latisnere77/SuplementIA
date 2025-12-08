#!/bin/bash
set -e

# SuplementIA - Deploy Discovery Worker Lambda (LanceDB)
# Usage: ./deploy.sh [staging|production]

ENVIRONMENT=${1:-production}
FUNCTION_NAME="${ENVIRONMENT}-discovery-worker-lancedb"
REGION="us-east-1"

echo "=========================================="
echo "Deploying Discovery Worker Lambda (LanceDB)"
echo "Environment: $ENVIRONMENT"
echo "Function: $FUNCTION_NAME"
echo "=========================================="

# Create deployment package
echo "Creating deployment package..."
rm -rf package function.zip
mkdir -p package

# Install dependencies for ARM64
echo "Installing dependencies for ARM64..."
pip install \
  --platform manylinux2014_aarch64 \
  --target=package \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --upgrade \
  -r requirements.txt

# Copy Lambda function
cp lambda_function.py package/

# Create ZIP
cd package
zip -r ../function.zip . -q
cd ..

echo "Package size: $(du -h function.zip | cut -f1)"

# Upload to Lambda
echo "Uploading to Lambda..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://function.zip \
  --region "$REGION" \
  --no-cli-pager

# Wait for update to complete
echo "Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"

# Update environment variables
echo "Updating environment variables..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={
    LANCEDB_PATH=/mnt/efs/suplementia-lancedb,
    MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2,
    MIN_STUDIES=3
  }" \
  --region "$REGION" \
  --no-cli-pager

# Publish new version
echo "Publishing new version..."
VERSION=$(aws lambda publish-version \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query 'Version' \
  --output text)

echo "Published version: $VERSION"

# Cleanup
rm -rf package function.zip

echo "=========================================="
echo "✅ Deployment complete!"
echo "Function: $FUNCTION_NAME"
echo "Version: $VERSION"
echo "=========================================="
