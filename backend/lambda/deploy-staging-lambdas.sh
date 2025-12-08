#!/bin/bash

# Deploy Lambda Functions to Staging Environment
# This script packages and deploys all Lambda functions for the intelligent search system

set -e

ENVIRONMENT="staging"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${ENVIRONMENT}-intelligent-search"

echo "🚀 Deploying Lambda Functions to ${ENVIRONMENT}"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    exit 1
fi

# Get CloudFormation outputs
echo "📡 Fetching infrastructure details from CloudFormation..."

VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
    --output text)

SUBNET1=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1Id`].OutputValue' \
    --output text)

SUBNET2=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet2Id`].OutputValue' \
    --output text)

SECURITY_GROUP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaSecurityGroupId`].OutputValue' \
    --output text)

LAMBDA_ROLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text)

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
    --output text)

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text)

CACHE_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`SupplementCacheTableName`].OutputValue' \
    --output text)

QUEUE_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DiscoveryQueueTableName`].OutputValue' \
    --output text)

EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text)

EFS_AP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSAccessPointId`].OutputValue' \
    --output text)

echo "✅ Infrastructure details fetched"
echo ""

# Function to package and deploy a Lambda function
deploy_lambda() {
    local FUNCTION_NAME=$1
    local FUNCTION_DIR=$2
    local HANDLER=$3
    local MEMORY=$4
    local TIMEOUT=$5
    local USE_EFS=$6
    
    echo "📦 Packaging ${FUNCTION_NAME}..."
    
    cd ${FUNCTION_DIR}
    
    # Create deployment package
    rm -rf package
    mkdir -p package
    
    # Install dependencies
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt -t package/ --quiet
    fi
    
    # Copy Lambda function
    cp lambda_function.py package/
    
    # Create ZIP
    cd package
    zip -r ../function.zip . -q
    cd ..
    
    echo "✅ Package created: function.zip"
    
    # Check if function exists
    FUNCTION_EXISTS=$(aws lambda get-function \
        --function-name ${FUNCTION_NAME} \
        --region ${REGION} 2>&1 || echo "NotFound")
    
    if [[ $FUNCTION_EXISTS == *"NotFound"* ]]; then
        echo "🆕 Creating new Lambda function: ${FUNCTION_NAME}"
        
        # Build VPC config
        VPC_CONFIG="SubnetIds=${SUBNET1},${SUBNET2},SecurityGroupIds=${SECURITY_GROUP}"
        
        # Build EFS config if needed
        EFS_CONFIG=""
        if [ "$USE_EFS" = "true" ]; then
            EFS_CONFIG="--file-system-configs Arn=arn:aws:elasticfilesystem:${REGION}:$(aws sts get-caller-identity --query Account --output text):access-point/${EFS_AP},LocalMountPath=/mnt/ml-models"
        fi
        
        aws lambda create-function \
            --function-name ${FUNCTION_NAME} \
            --runtime python3.11 \
            --role ${LAMBDA_ROLE} \
            --handler ${HANDLER} \
            --zip-file fileb://function.zip \
            --timeout ${TIMEOUT} \
            --memory-size ${MEMORY} \
            --vpc-config ${VPC_CONFIG} \
            ${EFS_CONFIG} \
            --region ${REGION} \
            --no-cli-pager > /dev/null
        
        echo "✅ Function created"
    else
        echo "🔄 Updating existing Lambda function: ${FUNCTION_NAME}"
        
        aws lambda update-function-code \
            --function-name ${FUNCTION_NAME} \
            --zip-file fileb://function.zip \
            --region ${REGION} \
            --no-cli-pager > /dev/null
        
        echo "✅ Function updated"
    fi
    
    # Update environment variables
    echo "🔧 Updating environment variables..."
    
    ENV_VARS="Variables={"
    ENV_VARS+="SUPPLEMENT_CACHE_TABLE=${CACHE_TABLE},"
    ENV_VARS+="DISCOVERY_QUEUE_TABLE=${QUEUE_TABLE},"
    ENV_VARS+="RDS_HOST=${RDS_ENDPOINT},"
    ENV_VARS+="REDIS_ENDPOINT=${REDIS_ENDPOINT},"
    ENV_VARS+="RDS_PASSWORD_PARAM=/suplementia/${ENVIRONMENT}/rds/password"
    
    if [ "$USE_EFS" = "true" ]; then
        ENV_VARS+=",MODEL_CACHE_DIR=/mnt/ml-models"
    fi
    
    ENV_VARS+="}"
    
    aws lambda update-function-configuration \
        --function-name ${FUNCTION_NAME} \
        --environment ${ENV_VARS} \
        --region ${REGION} \
        --no-cli-pager > /dev/null
    
    echo "✅ Environment variables updated"
    
    # Wait for function to be ready
    echo "⏳ Waiting for function to be ready..."
    aws lambda wait function-updated \
        --function-name ${FUNCTION_NAME} \
        --region ${REGION}
    
    echo "✅ ${FUNCTION_NAME} deployed successfully"
    echo ""
    
    cd - > /dev/null
}

# Deploy Embedding Generator Lambda
deploy_lambda \
    "${ENVIRONMENT}-embedding-generator" \
    "embedding-generator" \
    "lambda_function.lambda_handler" \
    1024 \
    60 \
    "true"

# Get embedding generator ARN for other functions
EMBEDDING_ARN=$(aws lambda get-function \
    --function-name ${ENVIRONMENT}-embedding-generator \
    --region ${REGION} \
    --query 'Configuration.FunctionArn' \
    --output text)

# Deploy Search API Lambda
deploy_lambda \
    "${ENVIRONMENT}-search-api" \
    "search-api" \
    "lambda_function.lambda_handler" \
    512 \
    30 \
    "false"

# Update Search API with embedding generator ARN
aws lambda update-function-configuration \
    --function-name ${ENVIRONMENT}-search-api \
    --environment Variables="{SUPPLEMENT_CACHE_TABLE=${CACHE_TABLE},DISCOVERY_QUEUE_TABLE=${QUEUE_TABLE},RDS_HOST=${RDS_ENDPOINT},REDIS_ENDPOINT=${REDIS_ENDPOINT},RDS_PASSWORD_PARAM=/suplementia/${ENVIRONMENT}/rds/password,EMBEDDING_LAMBDA_ARN=${EMBEDDING_ARN}}" \
    --region ${REGION} \
    --no-cli-pager > /dev/null

# Deploy Discovery Worker Lambda
deploy_lambda \
    "${ENVIRONMENT}-discovery-worker" \
    "discovery-worker" \
    "lambda_function.lambda_handler" \
    512 \
    300 \
    "false"

# Update Discovery Worker with embedding generator ARN
aws lambda update-function-configuration \
    --function-name ${ENVIRONMENT}-discovery-worker \
    --environment Variables="{DISCOVERY_QUEUE_TABLE=${QUEUE_TABLE},RDS_HOST=${RDS_ENDPOINT},RDS_PASSWORD_PARAM=/suplementia/${ENVIRONMENT}/rds/password,EMBEDDING_LAMBDA_ARN=${EMBEDDING_ARN}}" \
    --region ${REGION} \
    --no-cli-pager > /dev/null

# Enable DynamoDB Stream trigger for Discovery Worker
echo "🔧 Setting up DynamoDB Stream trigger..."

STREAM_ARN=$(aws dynamodb describe-table \
    --table-name ${QUEUE_TABLE} \
    --region ${REGION} \
    --query 'Table.LatestStreamArn' \
    --output text)

# Check if trigger already exists
EXISTING_TRIGGER=$(aws lambda list-event-source-mappings \
    --function-name ${ENVIRONMENT}-discovery-worker \
    --region ${REGION} \
    --query 'EventSourceMappings[?EventSourceArn==`'${STREAM_ARN}'`].UUID' \
    --output text)

if [ -z "$EXISTING_TRIGGER" ]; then
    aws lambda create-event-source-mapping \
        --function-name ${ENVIRONMENT}-discovery-worker \
        --event-source-arn ${STREAM_ARN} \
        --starting-position LATEST \
        --batch-size 10 \
        --region ${REGION} \
        --no-cli-pager > /dev/null
    
    echo "✅ DynamoDB Stream trigger created"
else
    echo "✅ DynamoDB Stream trigger already exists"
fi

echo ""
echo "🎉 All Lambda functions deployed successfully!"
echo ""
echo "Deployed functions:"
echo "  - ${ENVIRONMENT}-embedding-generator"
echo "  - ${ENVIRONMENT}-search-api"
echo "  - ${ENVIRONMENT}-discovery-worker"
echo ""
echo "Next steps:"
echo "1. Upload ML model to EFS"
echo "2. Store RDS password in Parameter Store"
echo "3. Run smoke tests"
