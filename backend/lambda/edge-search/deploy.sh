#!/bin/bash

# ====================================
# Lambda@Edge Deployment Script
# ====================================
# This script deploys the Lambda@Edge function for CloudFront

set -e  # Exit on error

echo "🚀 Deploying Lambda@Edge function for Supplement Search..."
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production
echo "✅ Dependencies installed"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
rm -f function.zip
zip -r function.zip index.js node_modules/ package.json -q
echo "✅ Deployment package created"
echo ""

# Get DAX endpoint from environment
DAX_ENDPOINT=""
if [ -f ../../../.env.local ]; then
    DAX_ENDPOINT=$(grep -E "^DAX_ENDPOINT=" ../../../.env.local | cut -d'=' -f2 || echo "")
fi

# Create or update Lambda function
FUNCTION_NAME="supplement-search-edge"
ROLE_NAME="lambda-edge-execution-role"

echo "🔧 Creating IAM role for Lambda@Edge..."

# Create IAM role if it doesn't exist
aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null || {
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": [
                            "lambda.amazonaws.com",
                            "edgelambda.amazonaws.com"
                        ]
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }' \
        --description "Execution role for Lambda@Edge supplement search"
    
    # Attach policies
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    # Create inline policy for DynamoDB access
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "DynamoDBAccess" \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "dynamodb:GetItem",
                        "dynamodb:UpdateItem",
                        "dynamodb:Query"
                    ],
                    "Resource": "arn:aws:dynamodb:*:*:table/production-supplement-cache"
                }
            ]
        }'
    
    echo "Waiting for IAM role to propagate..."
    sleep 10
}

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "✅ IAM role ready: $ROLE_ARN"
echo ""

# Create or update Lambda function (must be in us-east-1 for Lambda@Edge)
echo "🚀 Deploying Lambda function to us-east-1..."

aws lambda get-function --function-name "$FUNCTION_NAME" --region us-east-1 2>/dev/null && {
    # Update existing function
    echo "Updating existing function..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://function.zip \
        --region us-east-1 \
        --publish
} || {
    # Create new function
    echo "Creating new function..."
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs18.x \
        --role "$ROLE_ARN" \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 5 \
        --memory-size 128 \
        --environment "Variables={DAX_ENDPOINT=$DAX_ENDPOINT,DYNAMODB_CACHE_TABLE=production-supplement-cache,AWS_REGION=us-east-1}" \
        --region us-east-1 \
        --publish
}

# Get function ARN with version
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region us-east-1 \
    --query 'Configuration.FunctionArn' \
    --output text)

FUNCTION_VERSION=$(aws lambda list-versions-by-function \
    --function-name "$FUNCTION_NAME" \
    --region us-east-1 \
    --query 'Versions[-1].Version' \
    --output text)

VERSIONED_ARN="${FUNCTION_ARN}:${FUNCTION_VERSION}"

echo "✅ Lambda function deployed"
echo "   ARN: $VERSIONED_ARN"
echo ""

# Get CloudFront distribution ID
DISTRIBUTION_ID=""
if [ -f ../../../.env.local ]; then
    DISTRIBUTION_ID=$(grep -E "^CLOUDFRONT_DISTRIBUTION_ID=" ../../../.env.local | cut -d'=' -f2 || echo "")
fi

if [ -z "$DISTRIBUTION_ID" ]; then
    echo "⚠️  CloudFront distribution ID not found in .env.local"
    echo "   Please associate this Lambda function manually:"
    echo "   Function ARN: $VERSIONED_ARN"
    echo ""
    echo "   Or run: aws cloudfront update-distribution ..."
else
    echo "🔗 Associating Lambda@Edge with CloudFront distribution..."
    echo "   Distribution ID: $DISTRIBUTION_ID"
    echo ""
    echo "⚠️  Note: CloudFront distribution update must be done manually or via CloudFormation"
    echo "   Add this Lambda ARN to your CloudFront distribution's viewer-request trigger:"
    echo "   $VERSIONED_ARN"
fi

echo ""
echo "✅ Lambda@Edge deployment complete!"
echo ""
echo "📋 Summary:"
echo "  ✓ Function: $FUNCTION_NAME"
echo "  ✓ Version: $FUNCTION_VERSION"
echo "  ✓ ARN: $VERSIONED_ARN"
echo "  ✓ Region: us-east-1 (required for Lambda@Edge)"
echo "  ✓ Runtime: Node.js 18.x"
echo "  ✓ Memory: 128 MB"
echo "  ✓ Timeout: 5 seconds"
echo ""
echo "🔧 Next steps:"
echo "  1. Associate Lambda with CloudFront distribution"
echo "  2. Test edge function: npm run test:edge"
echo "  3. Monitor CloudWatch Logs in all regions"
echo ""
echo "💰 Cost: Included in Lambda free tier (1M requests/month)"

# Cleanup
rm -f function.zip
