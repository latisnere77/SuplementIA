#!/bin/bash
set -e

# Deploy production-search-api-lancedb with translation fix
REGION="us-east-1"
ACCOUNT_ID="239378269775"
FUNCTION_NAME="production-search-api-lancedb"
REPO_NAME="production-search-api-lancedb"
IMAGE_TAG="translation-fix-$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "Deploying Search API Lambda (Container)"
echo "Environment: production"
echo "Function: $FUNCTION_NAME"
echo "Image Tag: $IMAGE_TAG"
echo "=========================================="

# Step 1: Create ECR repository if needed
echo ""
echo "Step 1: Ensuring ECR repository exists..."
if aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION &>/dev/null; then
  echo "  → Repository $REPO_NAME already exists"
else
  aws ecr create-repository \
    --repository-name $REPO_NAME \
    --region $REGION \
    --image-scanning-configuration scanOnPush=true \
    --no-cli-pager
  echo "  ✓ Created repository: $REPO_NAME"
fi

# Step 2: Login to ECR
echo ""
echo "Step 2: Logging in to ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Step 3: Build Docker image for x86_64 (matches Lambda architecture)
echo ""
echo "Step 3: Building Docker image for x86_64..."
docker buildx build \
  --platform linux/amd64 \
  -t ${REPO_NAME}:${IMAGE_TAG} \
  -t ${REPO_NAME}:latest \
  --load \
  .

# Step 4: Tag image for ECR
echo ""
echo "Step 4: Tagging image..."
docker tag ${REPO_NAME}:${IMAGE_TAG} ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
docker tag ${REPO_NAME}:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest

# Step 5: Push to ECR
echo ""
echo "Step 5: Pushing to ECR..."
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest

# Step 6: Update Lambda function
echo ""
echo "Step 6: Updating Lambda function..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --image-uri ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG} \
  --region $REGION \
  --no-cli-pager

# Step 7: Wait for update to complete
echo ""
echo "Step 7: Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name $FUNCTION_NAME \
  --region $REGION

echo ""
echo "=========================================="
echo "✅ Deployment complete!"
echo "Function: $FUNCTION_NAME"
echo "Image: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"
echo "=========================================="

# Test with Spanish query
echo ""
echo "Testing with Spanish query: peptidos bioactivos"
curl -s "https://y7kmfjbldddeslucthyaomytem0etqnc.lambda-url.us-east-1.on.aws/?q=peptidos%20bioactivos" | jq .

echo ""
echo "✅ Deployment and test complete!"
