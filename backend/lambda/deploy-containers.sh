#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID="239378269775"
ENVIRONMENT="staging"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Lambda Container Deployment - Staging                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Create ECR repositories"
echo "  2. Build ARM64 Docker images (~10 min each)"
echo "  3. Push to ECR"
echo "  4. Update Lambda functions"
echo ""
echo "Total time estimate: 25-30 minutes"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Step 1: Create ECR repositories
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/5: Creating ECR repositories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for REPO in "staging-search-api-lancedb" "staging-discovery-worker-lancedb"; do
  if aws ecr describe-repositories --repository-names $REPO --region $REGION &>/dev/null; then
    echo "  → Repository $REPO already exists"
  else
    aws ecr create-repository \
      --repository-name $REPO \
      --region $REGION \
      --image-scanning-configuration scanOnPush=true \
      --no-cli-pager \
      > /dev/null
    echo "  ✓ Created repository: $REPO"
  fi
done

# Step 2: Login to ECR
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/5: Logging in to ECR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

echo "  ✓ Logged in to ECR"

# Step 3: Build and push Search API
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/5: Building Search API image (~10 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd search-api-lancedb

IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/staging-search-api-lancedb:latest"

echo "  → Building for linux/arm64..."
docker buildx build --platform linux/arm64 -t $IMAGE_URI . --load

echo "  → Pushing to ECR..."
docker push $IMAGE_URI

echo "  ✓ Search API image pushed"
cd ..

# Step 4: Build and push Discovery Worker
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/5: Building Discovery Worker image (~10 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd discovery-worker-lancedb

IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/staging-discovery-worker-lancedb:latest"

echo "  → Building for linux/arm64..."
docker buildx build --platform linux/arm64 -t $IMAGE_URI . --load

echo "  → Pushing to ECR..."
docker push $IMAGE_URI

echo "  ✓ Discovery Worker image pushed"
cd ..

# Step 5: Update Lambda functions
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/5: Updating Lambda functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → Updating staging-search-api-lancedb..."
aws lambda update-function-code \
  --function-name staging-search-api-lancedb \
  --image-uri "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/staging-search-api-lancedb:latest" \
  --region $REGION \
  --no-cli-pager \
  > /dev/null

echo "  → Waiting for Search API to update..."
aws lambda wait function-updated --function-name staging-search-api-lancedb --region $REGION

echo "  ✓ Search API updated"

echo "  → Updating staging-discovery-worker-lancedb..."
aws lambda update-function-code \
  --function-name staging-discovery-worker-lancedb \
  --image-uri "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/staging-discovery-worker-lancedb:latest" \
  --region $REGION \
  --no-cli-pager \
  > /dev/null

echo "  → Waiting for Discovery Worker to update..."
aws lambda wait function-updated --function-name staging-discovery-worker-lancedb --region $REGION

echo "  ✓ Discovery Worker updated"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✓ ECR Repositories created"
echo "✓ Docker images built and pushed"
echo "✓ Lambda functions updated to use containers"
echo ""
echo "Next: Test the functions"
echo ""
