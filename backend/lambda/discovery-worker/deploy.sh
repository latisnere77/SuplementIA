#!/bin/bash

# Discovery Worker Lambda Deployment Script
# Deploys the background worker that processes the discovery queue

set -e

FUNCTION_NAME="suplementia-discovery-worker"
REGION="${AWS_REGION:-us-east-1}"
ROLE_ARN="${LAMBDA_ROLE_ARN}"

echo "🚀 Deploying Discovery Worker Lambda..."

# Create deployment package
echo "📦 Creating deployment package..."
cd "$(dirname "$0")"
rm -rf package
mkdir -p package

# Install dependencies
pip install -r requirements.txt -t package/

# Copy Lambda function
cp lambda_function.py package/

# Create ZIP
cd package
zip -r ../discovery-worker.zip . -q
cd ..

echo "✅ Package created: discovery-worker.zip"

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null; then
    echo "📝 Updating existing function..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://discovery-worker.zip \
        --region "$REGION"
    
    # Update configuration
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --timeout 300 \
        --memory-size 512 \
        --region "$REGION"
else
    echo "🆕 Creating new function..."
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://discovery-worker.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={
            DISCOVERY_QUEUE_TABLE=supplement-discovery-queue,
            RDS_HOST=${RDS_HOST},
            RDS_DATABASE=supplements,
            RDS_USER=postgres,
            RDS_PASSWORD_PARAM=/suplementia/rds/password,
            EMBEDDING_LAMBDA_ARN=${EMBEDDING_LAMBDA_ARN},
            CACHE_INVALIDATION_BUS=default
        }" \
        --region "$REGION"
fi

echo "✅ Lambda function deployed successfully!"

# Setup DynamoDB Stream trigger
echo "🔗 Setting up DynamoDB Stream trigger..."

STREAM_ARN=$(aws dynamodb describe-table \
    --table-name supplement-discovery-queue \
    --region "$REGION" \
    --query 'Table.LatestStreamArn' \
    --output text)

if [ -n "$STREAM_ARN" ]; then
    # Check if event source mapping exists
    MAPPING_UUID=$(aws lambda list-event-source-mappings \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --query "EventSourceMappings[?EventSourceArn=='$STREAM_ARN'].UUID" \
        --output text)
    
    if [ -z "$MAPPING_UUID" ]; then
        echo "Creating event source mapping..."
        aws lambda create-event-source-mapping \
            --function-name "$FUNCTION_NAME" \
            --event-source-arn "$STREAM_ARN" \
            --starting-position LATEST \
            --batch-size 10 \
            --maximum-batching-window-in-seconds 5 \
            --region "$REGION"
    else
        echo "Event source mapping already exists: $MAPPING_UUID"
    fi
else
    echo "⚠️  Warning: Could not find DynamoDB Stream ARN"
    echo "   Make sure the discovery queue table has streams enabled"
fi

echo "✅ Discovery Worker Lambda deployment complete!"
echo ""
echo "Function ARN: $(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)"
