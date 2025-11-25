#!/bin/bash

# Deploy Intelligent Supplement Search System to Staging
# This script deploys the complete infrastructure stack

set -e

ENVIRONMENT="staging"
STACK_NAME="${ENVIRONMENT}-intelligent-search"
TEMPLATE_FILE="infrastructure/cloudformation/intelligent-search-staging.yml"
REGION="${AWS_REGION:-us-east-1}"

echo "🚀 Deploying Intelligent Supplement Search System to ${ENVIRONMENT}"
echo "=================================================="
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "Template: ${TEMPLATE_FILE}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if template file exists
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo "❌ Template file not found: ${TEMPLATE_FILE}"
    exit 1
fi

# Prompt for database password
echo "📝 Please enter the RDS Postgres master password (min 8 characters):"
read -s DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo "❌ Password must be at least 8 characters long"
    exit 1
fi

# Validate CloudFormation template
echo "✅ Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Template validation successful"
else
    echo "❌ Template validation failed"
    exit 1
fi

# Deploy the stack
echo ""
echo "🚀 Deploying CloudFormation stack..."
echo "This may take 15-20 minutes..."
echo ""

aws cloudformation deploy \
    --template-file ${TEMPLATE_FILE} \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        DBPassword=${DB_PASSWORD} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION} \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Stack deployment successful!"
    echo ""
    
    # Get stack outputs
    echo "📊 Stack Outputs:"
    echo "=================================================="
    aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Initialize RDS with pgvector extension"
    echo "2. Deploy Lambda functions"
    echo "3. Run smoke tests"
    
else
    echo ""
    echo "❌ Stack deployment failed"
    echo ""
    echo "To check the error details, run:"
    echo "aws cloudformation describe-stack-events --stack-name ${STACK_NAME} --region ${REGION}"
    exit 1
fi
