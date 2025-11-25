#!/bin/bash

# Deploy API Gateway with Rate Limiting and WAF
# This script deploys the API Gateway CloudFormation stack

set -e

# Configuration
ENVIRONMENT=${1:-production}
STACK_NAME="${ENVIRONMENT}-supplement-search-api-gateway"
TEMPLATE_FILE="api-gateway-config.yml"
REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying API Gateway with Rate Limiting${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file ${TEMPLATE_FILE} not found${NC}"
    exit 1
fi

# Validate CloudFormation template
echo -e "${YELLOW}Validating CloudFormation template...${NC}"
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Template is valid${NC}"
else
    echo -e "${RED}✗ Template validation failed${NC}"
    exit 1
fi

# Get Lambda function ARN (if exists)
LAMBDA_ARN=""
if aws lambda get-function --function-name "${ENVIRONMENT}-supplement-search" --region ${REGION} &> /dev/null; then
    LAMBDA_ARN=$(aws lambda get-function \
        --function-name "${ENVIRONMENT}-supplement-search" \
        --region ${REGION} \
        --query 'Configuration.FunctionArn' \
        --output text)
    echo -e "${GREEN}Found Lambda function: ${LAMBDA_ARN}${NC}"
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} 2>&1 || true)

if echo "$STACK_EXISTS" | grep -q "does not exist"; then
    echo -e "${YELLOW}Creating new stack...${NC}"
    OPERATION="create-stack"
    WAIT_CONDITION="stack-create-complete"
else
    echo -e "${YELLOW}Updating existing stack...${NC}"
    OPERATION="update-stack"
    WAIT_CONDITION="stack-update-complete"
fi

# Deploy stack
echo -e "${YELLOW}Deploying stack...${NC}"

PARAMETERS=""
if [ ! -z "$LAMBDA_ARN" ]; then
    PARAMETERS="ParameterKey=LambdaFunctionArn,ParameterValue=${LAMBDA_ARN}"
fi

aws cloudformation ${OPERATION} \
    --stack-name ${STACK_NAME} \
    --template-body file://${TEMPLATE_FILE} \
    --parameters \
        ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
        ${PARAMETERS} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION} \
    --tags \
        Key=Environment,Value=${ENVIRONMENT} \
        Key=Application,Value=suplementia \
        Key=Purpose,Value=api-gateway-rate-limiting \
        Key=ManagedBy,Value=CloudFormation

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Stack deployment failed${NC}"
    exit 1
fi

# Wait for stack operation to complete
echo -e "${YELLOW}Waiting for stack operation to complete...${NC}"
aws cloudformation wait ${WAIT_CONDITION} \
    --stack-name ${STACK_NAME} \
    --region ${REGION}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Stack deployed successfully${NC}"
else
    echo -e "${RED}✗ Stack deployment failed${NC}"
    exit 1
fi

# Get stack outputs
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Stack Outputs${NC}"
echo -e "${GREEN}========================================${NC}"

aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
    --output text)

# Get API Key
API_KEY_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`APIKey`].OutputValue' \
    --output text)

if [ ! -z "$API_KEY_ID" ]; then
    API_KEY_VALUE=$(aws apigateway get-api-key \
        --api-key ${API_KEY_ID} \
        --include-value \
        --region ${REGION} \
        --query 'value' \
        --output text)
    
    echo ""
    echo -e "${GREEN}API Key Value: ${API_KEY_VALUE}${NC}"
    echo -e "${YELLOW}Store this API key securely!${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "API Gateway URL: ${API_URL}"
echo ""
echo "Test the API:"
echo "  curl -X POST ${API_URL}/search \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'x-api-key: ${API_KEY_VALUE}' \\"
echo "    -d '{\"query\": \"vitamin d\"}'"
echo ""
echo "Rate Limits:"
echo "  - Per IP: 100 requests/minute"
echo "  - Per User: 1000 requests/day"
echo "  - WAF Protection: Enabled"
echo ""
