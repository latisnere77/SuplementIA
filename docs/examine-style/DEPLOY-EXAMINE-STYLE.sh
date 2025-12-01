#!/bin/bash

# Deploy Examine-Style Format Implementation
# Date: November 22, 2025

set -e  # Exit on error

echo "🚀 Deploying Examine-Style Format Implementation"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Lambda
echo -e "${BLUE}Step 1: Building Lambda...${NC}"
cd backend/lambda/content-enricher
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${YELLOW}❌ Build failed${NC}"
    exit 1
fi

echo ""

# Step 2: Package Lambda
echo -e "${BLUE}Step 2: Packaging Lambda...${NC}"

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy necessary files
cp package.json dist/
cp package-lock.json dist/

# Install production dependencies
cd dist
npm ci --production
cd ..

# Create zip
cd dist
zip -r ../lambda.zip . -x "*.git*" -x "*.DS_Store"
cd ..

if [ -f lambda.zip ]; then
    echo -e "${GREEN}✅ Package created: lambda.zip${NC}"
    ls -lh lambda.zip
else
    echo -e "${YELLOW}❌ Package creation failed${NC}"
    exit 1
fi

echo ""

# Step 3: Deploy to AWS
echo -e "${BLUE}Step 3: Deploying to AWS Lambda...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Get Lambda function name from environment or use default
LAMBDA_FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-"content-enricher"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "Function: $LAMBDA_FUNCTION_NAME"
echo "Region: $AWS_REGION"
echo ""

# Deploy
aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file fileb://lambda.zip \
    --region "$AWS_REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
else
    echo -e "${YELLOW}❌ Deployment failed${NC}"
    exit 1
fi

echo ""

# Step 4: Wait for update to complete
echo -e "${BLUE}Step 4: Waiting for Lambda to be ready...${NC}"
sleep 5

# Check function status
aws lambda get-function \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'Configuration.LastUpdateStatus' \
    --output text

echo ""

# Step 5: Test deployment
echo -e "${BLUE}Step 5: Testing deployment...${NC}"

# Get Lambda URL
LAMBDA_URL=$(aws lambda get-function-url-config \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'FunctionUrl' \
    --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_URL" ]; then
    echo -e "${YELLOW}⚠️  Lambda URL not found. Skipping tests.${NC}"
    echo "You can test manually using the Lambda console or API Gateway URL."
else
    echo "Lambda URL: $LAMBDA_URL"
    echo ""
    
    # Test standard format
    echo "Testing standard format..."
    curl -X POST "$LAMBDA_URL" \
        -H "Content-Type: application/json" \
        -d '{"supplementId": "magnesium"}' \
        -s | jq '.success'
    
    echo ""
    
    # Test examine-style format
    echo "Testing examine-style format..."
    curl -X POST "$LAMBDA_URL" \
        -H "Content-Type: application/json" \
        -d '{"supplementId": "magnesium", "contentType": "examine-style"}' \
        -s | jq '.success'
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check CloudWatch Logs: aws logs tail /aws/lambda/$LAMBDA_FUNCTION_NAME --follow"
echo "2. Check X-Ray Traces: https://console.aws.amazon.com/xray"
echo "3. Test both formats using the test script: npx tsx scripts/test-examine-style.ts"
echo ""
echo "Documentation:"
echo "- EXAMINE-STYLE-READY-TO-DEPLOY.md"
echo "- EXAMINE-STYLE-SUMMARY.md"
echo ""
