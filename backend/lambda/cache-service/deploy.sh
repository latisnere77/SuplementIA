#!/bin/bash

#
# Deploy Script for Cache Service
# Builds TypeScript, runs tests, and deploys to AWS Lambda
#

set -e  # Exit on error

echo "🚀 Deploying Cache Service"
echo "================================================"

# Configuration
STACK_NAME=${STACK_NAME:-"suplementia-cache-service"}
ENVIRONMENT=${ENVIRONMENT:-"staging"}
REGION=${AWS_REGION:-"us-east-1"}
S3_BUCKET=${S3_BUCKET:-"suplementia-deployments"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not installed${NC}"
    echo "Install with: brew install awscli"
    exit 1
fi

# Verificar credenciales AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Configure with: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"
echo ""

# Verificar Node.js y npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"
echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Run linter (optional - skip if eslint not configured)
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    echo "🔍 Running linter..."
    npm run lint || echo -e "${YELLOW}⚠️  Linting warnings (continuing...)${NC}"
    echo ""
fi

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Verify S3 bucket exists
echo "🪣 Checking S3 bucket: $S3_BUCKET"
if aws s3 ls "s3://$S3_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
    echo -e "${YELLOW}⚠️  Bucket doesn't exist, creating...${NC}"
    aws s3 mb "s3://$S3_BUCKET" --region "$REGION"
else
    echo -e "${GREEN}✅ Bucket exists${NC}"
fi
echo ""

# Package Lambda
echo "📦 Packaging Lambda..."
sam package \
    --template-file template.yaml \
    --output-template-file packaged.yaml \
    --s3-bucket "$S3_BUCKET" \
    --s3-prefix "cache-service" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Package created${NC}"
else
    echo -e "${RED}❌ Packaging failed${NC}"
    exit 1
fi
echo ""

# Deploy to AWS
echo "🚀 Deploying to AWS..."
echo "   Stack: $STACK_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

sam deploy \
    --template-file packaged.yaml \
    --stack-name "$STACK_NAME" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
    --region "$REGION" \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""

    # Get API endpoint
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CacheServiceApi`].OutputValue' \
        --output text)

    if [ -n "$API_URL" ]; then
        echo "📝 API Endpoint: $API_URL"
        echo ""
        echo "🧪 Test the API:"
        echo "   curl -X GET $API_URL/ashwagandha"
        echo ""
    fi

    # Show X-Ray traces
    echo "🗺️  View X-Ray traces:"
    echo "   aws xray get-trace-summaries \\"
    echo "     --start-time \$(date -u -v-5M +%s) \\"
    echo "     --end-time \$(date -u +%s) \\"
    echo "     --filter-expression 'annotation.module = \"cache-service\"'"
    echo ""

    # Show CloudWatch logs
    echo "📊 View logs:"
    echo "   aws logs tail /aws/lambda/suplementia-cache-service-$ENVIRONMENT --follow"
    echo ""
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -f packaged.yaml

echo ""
echo -e "${GREEN}✅ Cache Service deployed successfully!${NC}"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Test GET/PUT/DELETE operations"
echo "   2. Check CloudWatch logs"
echo "   3. Verify X-Ray traces"
echo "   4. Configure alarms (if needed)"
