#!/bin/bash
set -e

# Simple Deploy Script (sin SAM)
# Usage: ./deploy-simple.sh [function-name]

FUNCTION_NAME=${1:-suplementia-studies-fetcher-dev}
REGION=${AWS_REGION:-us-east-1}

echo "================================================"
echo "Deploying Studies Fetcher Lambda (Simple)"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "================================================"

# 1. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --production=false

# 2. Run tests
echo ""
echo "🧪 Running tests..."
# npm test

# 3. Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# 4. Prepare deployment package
echo ""
echo "📦 Preparing deployment package..."
cd dist

# Install production dependencies in dist
echo "Installing production dependencies..."
npm init -y --scope=suplementia > /dev/null 2>&1
npm install --production --no-save aws-xray-sdk-core xml2js > /dev/null 2>&1

# Create zip
echo "Creating deployment package..."
zip -r ../studies-fetcher.zip . > /dev/null 2>&1

cd ..

# 5. Check if function exists
echo ""
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "Function exists. Updating code..."

    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://studies-fetcher.zip \
        --region "$REGION" \
        --no-cli-pager

    echo ""
    echo "✅ Function code updated successfully!"

else
    echo "⚠️  Function does not exist."
    echo ""
    echo "To create the function, run:"
    echo ""
    echo "aws lambda create-function \\"
    echo "  --function-name $FUNCTION_NAME \\"
    echo "  --runtime nodejs20.x \\"
    echo "  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \\"
    echo "  --handler index.handler \\"
    echo "  --zip-file fileb://studies-fetcher.zip \\"
    echo "  --timeout 30 \\"
    echo "  --memory-size 512 \\"
    echo "  --architectures arm64 \\"
    echo "  --environment Variables='{XRAY_ENABLED=true,DEFAULT_MAX_RESULTS=10}' \\"
    echo "  --tracing-config Mode=Active \\"
    echo "  --region $REGION"
    echo ""
    exit 1
fi

# 6. Update environment variables (optional)
if [ ! -z "$PUBMED_API_KEY" ]; then
    echo ""
    echo "🔧 Updating environment variables..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --environment Variables="{
            XRAY_ENABLED=true,
            DEFAULT_MAX_RESULTS=10,
            PUBMED_API_KEY=$PUBMED_API_KEY,
            CACHE_SERVICE_URL=${CACHE_SERVICE_URL:-}
        }" \
        --region "$REGION" \
        --no-cli-pager > /dev/null
fi

echo ""
echo "================================================"
echo "✅ Studies Fetcher deployed successfully!"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "================================================"
echo ""
echo "To test the function:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"httpMethod\":\"POST\",\"body\":\"{\\\"supplementName\\\":\\\"Vitamin D\\\"}\"}' response.json"
