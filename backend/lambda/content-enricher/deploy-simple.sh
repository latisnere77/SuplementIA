#!/bin/bash
set -e

# Simple Deploy Script for Content Enricher (sin SAM)
# Usage: ./deploy-simple.sh [function-name]

FUNCTION_NAME=${1:-suplementia-content-enricher-dev}
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "================================================"
echo "Deploying Content Enricher Lambda (Simple)"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "================================================"

# 1. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --production=false --silent

# 2. Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# 3. Prepare deployment package
echo ""
echo "📦 Preparing deployment package..."
cd dist

# Install production dependencies in dist
echo "Installing production dependencies..."
npm init -y --scope=suplementia > /dev/null 2>&1
npm install --production --no-save @aws-sdk/client-bedrock-runtime aws-xray-sdk-core --silent

# Create zip
echo "Creating deployment package..."
zip -r ../content-enricher.zip . > /dev/null 2>&1

cd ..

echo "✅ Deployment package ready ($(du -h content-enricher.zip | cut -f1))"

# 4. Check if function exists
echo ""
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "Function exists. Updating code..."

    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://content-enricher.zip \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Function code updated"

    # Update configuration
    echo "Updating configuration..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs20.x \
        --timeout 60 \
        --memory-size 1024 \
        --environment "Variables={
            ENVIRONMENT=dev,
            XRAY_ENABLED=true,
            BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0,
            CACHE_SERVICE_URL=${CACHE_SERVICE_URL:-},
            LOG_LEVEL=info
        }" \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Configuration updated"

else
    echo "⚠️  Function does not exist."
    echo ""
    echo "Creating function requires a role. Checking for existing role..."

    ROLE_NAME="suplementia-lambda-execution-role-dev"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "")

    if [ -z "$ROLE_ARN" ]; then
        echo "Role not found. Creating role: $ROLE_NAME"

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

        # Attach policies
        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess

        # Create Bedrock policy
        cat > /tmp/bedrock-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
EOF

        aws iam put-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-name BedrockInvokePolicy \
            --policy-document file:///tmp/bedrock-policy.json

        ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
        echo "✅ Role created: $ROLE_ARN"
        echo "⏳ Waiting 10 seconds for role to propagate..."
        sleep 10
    else
        echo "✅ Using existing role: $ROLE_ARN"
    fi

    echo "Creating Lambda function..."
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs20.x \
        --role "$ROLE_ARN" \
        --handler index.handler \
        --zip-file fileb://content-enricher.zip \
        --timeout 60 \
        --memory-size 1024 \
        --architectures arm64 \
        --environment "Variables={
            ENVIRONMENT=dev,
            XRAY_ENABLED=true,
            BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0,
            CACHE_SERVICE_URL=${CACHE_SERVICE_URL:-},
            LOG_LEVEL=info
        }" \
        --tracing-config Mode=Active \
        --region "$REGION" \
        --no-cli-pager > /dev/null

    echo "✅ Function created"
fi

# 5. Get function info
echo ""
echo "📋 Function details:"
aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query '{Name:Configuration.FunctionName,Runtime:Configuration.Runtime,Memory:Configuration.MemorySize,Timeout:Configuration.Timeout,State:Configuration.State}' \
    --output table

echo ""
echo "================================================"
echo "✅ Content Enricher deployed successfully!"
echo "================================================"
echo ""
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""
echo "To test:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"supplementId\":\"vitamin-d\",\"category\":\"general\"}' response.json"
