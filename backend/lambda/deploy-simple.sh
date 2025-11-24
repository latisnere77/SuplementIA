#!/bin/bash
set -e

cd /Users/latisnere/documents/suplementia/backend/lambda

# Configuration
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ankosoft-formulation-api"
IMAGE_TAG="v$(date +%Y%m%d%H%M%S)"
FUNCTION_NAME="ankosoft-formulation-api"
REGION="us-east-1"

echo "🚀 Deploying Lambda with intelligent system..."
echo "📦 Image tag: $IMAGE_TAG"
echo ""

# Authenticate with ECR
echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build image
echo "🏗️  Building Docker image..."
docker build --platform linux/amd64 -t $FUNCTION_NAME:$IMAGE_TAG .

# Tag for ECR
echo "🏷️  Tagging image..."
docker tag $FUNCTION_NAME:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG

# Push to ECR
echo "⬆️  Pushing to ECR..."
docker push $ECR_REPO:$IMAGE_TAG

# Update Lambda
echo "🔄 Updating Lambda function..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --image-uri $ECR_REPO:$IMAGE_TAG \
  --region $REGION \
  --no-cli-pager

echo ""
echo "✅ Deployment complete!"
echo "📝 Image: $ECR_REPO:$IMAGE_TAG"
