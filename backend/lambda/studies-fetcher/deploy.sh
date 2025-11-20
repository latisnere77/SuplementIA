#!/bin/bash
set -e

# Studies Fetcher Deploy Script
# Usage: ./deploy.sh [dev|staging|prod]

ENVIRONMENT=${1:-dev}
STACK_NAME="suplementia-studies-fetcher-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}

echo "================================================"
echo "Deploying Studies Fetcher Lambda"
echo "Environment: $ENVIRONMENT"
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo "================================================"

# 1. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --production=false

# 2. Run tests
echo ""
echo "🧪 Running tests..."
npm test

# 3. Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# 4. Package for Lambda
echo ""
echo "📦 Packaging Lambda..."
cd dist
npm init -y --scope=suplementia
npm install --production aws-xray-sdk-core xml2js
cd ..

# 5. SAM Build
echo ""
echo "🏗️  Running SAM build..."
sam build --use-container

# 6. Deploy
echo ""
echo "🚀 Deploying to AWS..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    PubMedApiKey="${PUBMED_API_KEY:-}" \
    CacheServiceUrl="${CACHE_SERVICE_URL:-}" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --tags \
    Project=Suplementia \
    Module=StudiesFetcher \
    Environment="$ENVIRONMENT"

# 7. Get outputs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

echo ""
echo "🔍 API URL:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`StudiesFetcherApiUrl`].OutputValue' \
  --output text

echo ""
echo "================================================"
echo "✅ Studies Fetcher deployed successfully!"
echo "================================================"
