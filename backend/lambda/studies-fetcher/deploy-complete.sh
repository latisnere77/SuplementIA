#!/bin/bash
set -e

# Complete Deploy Script - Creates Lambda function and role
# Usage: ./deploy-complete.sh [dev|staging|prod]

ENVIRONMENT=${1:-dev}
FUNCTION_NAME="suplementia-studies-fetcher-${ENVIRONMENT}"
ROLE_NAME="suplementia-lambda-execution-role-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "================================================"
echo "Deploying Studies Fetcher Lambda"
echo "Environment: $ENVIRONMENT"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "================================================"

# 1. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --production=false --silent

# 2. Run tests
echo ""
echo "🧪 Running tests..."
npm test -- --silent 2>&1 | grep -E "Test Suites:|Tests:"

# 3. Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# 4. Prepare deployment package
echo ""
echo "📦 Preparing deployment package..."
rm -f studies-fetcher.zip
cd dist

# Install production dependencies
npm init -y --scope=suplementia > /dev/null 2>&1
npm install --production --no-save aws-xray-sdk-core xml2js --silent

# Create zip
zip -r ../studies-fetcher.zip . > /dev/null 2>&1
cd ..

echo "✅ Deployment package ready ($(du -h studies-fetcher.zip | cut -f1))"

# 5. Create or verify IAM role
echo ""
echo "🔐 Checking IAM role..."

if ! aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    echo "Creating IAM role: $ROLE_NAME"

    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --no-cli-pager > /dev/null

    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    # Attach X-Ray policy
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess

    echo "✅ IAM role created"
    echo "⏳ Waiting 10 seconds for role to propagate..."
    sleep 10
else
    echo "✅ IAM role exists: $ROLE_NAME"
fi

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# 6. Create or update Lambda function
echo ""
echo "🚀 Deploying Lambda function..."

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "Function exists. Updating code..."

    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://studies-fetcher.zip \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Code updated"

    # Update configuration
    echo "Updating configuration..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs20.x \
        --timeout 30 \
        --memory-size 512 \
        --environment "Variables={
            ENVIRONMENT=${ENVIRONMENT},
            XRAY_ENABLED=true,
            DEFAULT_MAX_RESULTS=10,
            DEFAULT_YEAR_FROM=2010,
            PUBMED_API_KEY=${PUBMED_API_KEY:-},
            CACHE_SERVICE_URL=${CACHE_SERVICE_URL:-},
            LOG_LEVEL=info
        }" \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Configuration updated"

else
    echo "Creating new function: $FUNCTION_NAME"

    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs20.x \
        --role "$ROLE_ARN" \
        --handler index.handler \
        --zip-file fileb://studies-fetcher.zip \
        --timeout 30 \
        --memory-size 512 \
        --architectures arm64 \
        --environment "Variables={
            ENVIRONMENT=${ENVIRONMENT},
            XRAY_ENABLED=true,
            DEFAULT_MAX_RESULTS=10,
            DEFAULT_YEAR_FROM=2010,
            PUBMED_API_KEY=${PUBMED_API_KEY:-},
            CACHE_SERVICE_URL=${CACHE_SERVICE_URL:-},
            LOG_LEVEL=info
        }" \
        --tracing-config Mode=Active \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Function created"
fi

# 7. Get function info
echo ""
echo "📋 Function details:"
aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query '{Name:Configuration.FunctionName,Runtime:Configuration.Runtime,Memory:Configuration.MemorySize,Timeout:Configuration.Timeout,State:Configuration.State,LastModified:Configuration.LastModified}' \
    --output table

# 8. Test the function
echo ""
echo "🧪 Testing function..."

cat > /tmp/test-payload.json <<EOF
{
  "httpMethod": "POST",
  "body": "{\"supplementName\":\"Vitamin D\",\"maxResults\":3}"
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/test-payload.json \
    --region "$REGION" \
    /tmp/response.json \
    --no-cli-pager > /dev/null 2>&1

if grep -q '"success":true' /tmp/response.json; then
    STUDY_COUNT=$(cat /tmp/response.json | grep -o '"totalFound":[0-9]*' | cut -d: -f2)
    echo "✅ Function test PASSED - Found $STUDY_COUNT studies"
else
    echo "⚠️  Function test result:"
    cat /tmp/response.json | jq '.' 2>/dev/null || cat /tmp/response.json
fi

echo ""
echo "================================================"
echo "✅ Deployment complete!"
echo "================================================"
echo ""
echo "Function ARN:"
aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'Configuration.FunctionArn' \
    --output text

echo ""
echo "To invoke manually:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"httpMethod\":\"POST\",\"body\":\"{\\\\\"supplementName\\\\\":\\\\\"Creatine\\\\\"}\"}' response.json"

echo ""
echo "To view logs:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow"

echo ""
echo "================================================"
