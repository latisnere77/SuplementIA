#!/bin/bash

# Enable X-Ray Tracing on Lambda and API Gateway
# This script enables X-Ray tracing for end-to-end request tracking

set -e

# Configuration
ENVIRONMENT="${1:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "🔬 Enabling X-Ray Tracing for ${ENVIRONMENT}"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Enable X-Ray on Lambda functions
echo "📦 Step 1: Enabling X-Ray on Lambda functions..."

# Get list of Lambda functions for this environment
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --query "Functions[?starts_with(FunctionName, '${ENVIRONMENT}-')].FunctionName" \
    --output text \
    --region "${AWS_REGION}")

if [ -z "$LAMBDA_FUNCTIONS" ]; then
    echo -e "${YELLOW}⚠ No Lambda functions found for environment ${ENVIRONMENT}${NC}"
    echo "   Make sure Lambda functions are deployed first"
    exit 1
fi

ENABLED_COUNT=0
FAILED_COUNT=0

for FUNCTION in $LAMBDA_FUNCTIONS; do
    echo "  Enabling X-Ray for ${FUNCTION}..."
    
    aws lambda update-function-configuration \
        --function-name "${FUNCTION}" \
        --tracing-config Mode=Active \
        --region "${AWS_REGION}" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ X-Ray enabled for ${FUNCTION}${NC}"
        ENABLED_COUNT=$((ENABLED_COUNT + 1))
    else
        echo -e "  ${RED}✗ Failed to enable X-Ray for ${FUNCTION}${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

echo ""
echo "Summary: ${ENABLED_COUNT} functions enabled, ${FAILED_COUNT} failed"

# Step 2: Create X-Ray sampling rules
echo ""
echo "📊 Step 2: Creating X-Ray sampling rules..."

# Create sampling rule configuration
cat > /tmp/xray-sampling-rule-${ENVIRONMENT}.json <<EOF
{
  "SamplingRule": {
    "RuleName": "${ENVIRONMENT}-suplementia-search",
    "Priority": 1000,
    "FixedRate": 0.05,
    "ReservoirSize": 1,
    "ServiceName": "${ENVIRONMENT}-search-api-lancedb",
    "ServiceType": "*",
    "Host": "*",
    "HTTPMethod": "*",
    "URLPath": "*",
    "Version": 1,
    "ResourceARN": "*",
    "Attributes": {}
  }
}
EOF

# Create the sampling rule
aws xray create-sampling-rule \
    --cli-input-json file:///tmp/xray-sampling-rule-${ENVIRONMENT}.json \
    --region "${AWS_REGION}" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Sampling rule created${NC}"
else
    echo -e "${YELLOW}⚠ Sampling rule may already exist or creation failed${NC}"
fi

# Clean up temp file
rm /tmp/xray-sampling-rule-${ENVIRONMENT}.json

# Step 3: Create high-priority sampling rule for errors
echo ""
echo "🚨 Step 3: Creating error sampling rule..."

cat > /tmp/xray-error-sampling-rule-${ENVIRONMENT}.json <<EOF
{
  "SamplingRule": {
    "RuleName": "${ENVIRONMENT}-suplementia-errors",
    "Priority": 100,
    "FixedRate": 1.0,
    "ReservoirSize": 10,
    "ServiceName": "*",
    "ServiceType": "*",
    "Host": "*",
    "HTTPMethod": "*",
    "URLPath": "*",
    "Version": 1,
    "ResourceARN": "*",
    "Attributes": {
      "error": "true"
    }
  }
}
EOF

aws xray create-sampling-rule \
    --cli-input-json file:///tmp/xray-error-sampling-rule-${ENVIRONMENT}.json \
    --region "${AWS_REGION}" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Error sampling rule created${NC}"
else
    echo -e "${YELLOW}⚠ Error sampling rule may already exist or creation failed${NC}"
fi

rm /tmp/xray-error-sampling-rule-${ENVIRONMENT}.json

# Step 4: Enable X-Ray on API Gateway (if exists)
echo ""
echo "🌐 Step 4: Enabling X-Ray on API Gateway..."

# Find API Gateway REST APIs
API_IDS=$(aws apigateway get-rest-apis \
    --query "items[?contains(name, '${ENVIRONMENT}')].id" \
    --output text \
    --region "${AWS_REGION}")

if [ -z "$API_IDS" ]; then
    echo -e "${YELLOW}⚠ No API Gateway found for environment ${ENVIRONMENT}${NC}"
else
    for API_ID in $API_IDS; do
        # Get API name
        API_NAME=$(aws apigateway get-rest-api \
            --rest-api-id "${API_ID}" \
            --query "name" \
            --output text \
            --region "${AWS_REGION}")
        
        echo "  Enabling X-Ray for API: ${API_NAME} (${API_ID})"
        
        # Enable X-Ray tracing
        aws apigateway update-stage \
            --rest-api-id "${API_ID}" \
            --stage-name "${ENVIRONMENT}" \
            --patch-operations op=replace,path=/tracingEnabled,value=true \
            --region "${AWS_REGION}" \
            > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓ X-Ray enabled for ${API_NAME}${NC}"
        else
            echo -e "  ${YELLOW}⚠ Could not enable X-Ray for ${API_NAME}${NC}"
        fi
    done
fi

# Step 5: Update Lambda IAM roles to allow X-Ray
echo ""
echo "🔐 Step 5: Updating IAM roles for X-Ray permissions..."

# Get Lambda execution role
LAMBDA_ROLE=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-intelligent-search" \
    --query "Stacks[0].Outputs[?OutputKey=='LambdaExecutionRoleArn'].OutputValue" \
    --output text \
    --region "${AWS_REGION}" 2>/dev/null)

if [ -z "$LAMBDA_ROLE" ]; then
    echo -e "${YELLOW}⚠ Could not find Lambda execution role${NC}"
else
    ROLE_NAME=$(echo $LAMBDA_ROLE | awk -F'/' '{print $NF}')
    
    # Attach X-Ray write policy
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess" \
        --region "${AWS_REGION}" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ X-Ray permissions added to Lambda role${NC}"
    else
        echo -e "${YELLOW}⚠ X-Ray permissions may already be attached${NC}"
    fi
fi

# Step 6: Test X-Ray tracing
echo ""
echo "🧪 Step 6: Testing X-Ray tracing..."

# Invoke a Lambda function to generate a trace
TEST_FUNCTION="${ENVIRONMENT}-search-api-lancedb"

echo "  Invoking ${TEST_FUNCTION} to generate trace..."

aws lambda invoke \
    --function-name "${TEST_FUNCTION}" \
    --payload '{"queryStringParameters": {"q": "vitamin d", "limit": "5"}}' \
    --region "${AWS_REGION}" \
    /tmp/lambda-response.json \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test invocation successful${NC}"
    
    # Wait for trace to be available
    echo "  Waiting for trace to be available (10 seconds)..."
    sleep 10
    
    # Get recent traces
    START_TIME=$(date -u -v-5M +%s 2>/dev/null || date -u -d '5 minutes ago' +%s)
    END_TIME=$(date -u +%s)
    
    TRACE_COUNT=$(aws xray get-trace-summaries \
        --start-time "${START_TIME}" \
        --end-time "${END_TIME}" \
        --query "TraceSummaries | length(@)" \
        --region "${AWS_REGION}" 2>/dev/null)
    
    if [ ! -z "$TRACE_COUNT" ] && [ "$TRACE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ X-Ray traces are being generated (${TRACE_COUNT} traces found)${NC}"
    else
        echo -e "${YELLOW}⚠ No traces found yet (may take a few minutes)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Test invocation failed${NC}"
fi

# Clean up
rm -f /tmp/lambda-response.json

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}✓ X-Ray Tracing Configuration Complete!${NC}"
echo "=============================================="
echo ""
echo "📊 Configuration Summary:"
echo "   - Lambda functions: ${ENABLED_COUNT} enabled"
echo "   - Sampling rate: 5% (1 in 20 requests)"
echo "   - Error sampling: 100% (all errors traced)"
echo "   - Reservoir size: 1 request/second minimum"
echo ""
echo "🔍 View traces:"
echo "   https://console.aws.amazon.com/xray/home?region=${AWS_REGION}#/service-map"
echo ""
echo "📈 Service Map:"
echo "   https://console.aws.amazon.com/xray/home?region=${AWS_REGION}#/traces"
echo ""
echo "📝 Next steps:"
echo "   1. Generate some traffic to create traces"
echo "   2. View service map to see request flow"
echo "   3. Analyze traces to identify bottlenecks"
echo "   4. Adjust sampling rules if needed"
echo ""
echo "💡 Useful X-Ray CLI commands:"
echo "   # Get recent traces"
echo "   aws xray get-trace-summaries --start-time \$(date -u -v-1H +%s) --end-time \$(date -u +%s)"
echo ""
echo "   # Get specific trace details"
echo "   aws xray batch-get-traces --trace-ids <trace-id>"
echo ""
echo "   # List sampling rules"
echo "   aws xray get-sampling-rules"
echo ""
