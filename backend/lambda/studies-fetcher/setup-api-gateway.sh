#!/bin/bash
set -e

# Setup API Gateway for Studies Fetcher
# Usage: ./setup-api-gateway.sh [dev|staging|prod]

ENVIRONMENT=${1:-dev}
API_NAME="suplementia-studies-api-${ENVIRONMENT}"
FUNCTION_NAME="suplementia-studies-fetcher-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "================================================"
echo "Setting up API Gateway for Studies Fetcher"
echo "Environment: $ENVIRONMENT"
echo "API Name: $API_NAME"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "================================================"

# 1. Create or get REST API
echo ""
echo "🔍 Checking for existing API..."

API_ID=$(aws apigateway get-rest-apis --region $REGION --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ]; then
    echo "Creating new REST API: $API_NAME"
    API_ID=$(aws apigateway create-rest-api \
        --name "$API_NAME" \
        --description "Suplementia Studies Fetcher API - ${ENVIRONMENT}" \
        --endpoint-configuration types=REGIONAL \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "✅ API created: $API_ID"
else
    echo "✅ API exists: $API_ID"
fi

# 2. Get root resource ID
echo ""
echo "📋 Getting root resource..."
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[?path==`/`].id' \
    --output text)

echo "Root resource ID: $ROOT_ID"

# 3. Create /studies resource
echo ""
echo "📁 Creating /studies resource..."

STUDIES_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='studies'].id" \
    --output text)

if [ -z "$STUDIES_ID" ]; then
    STUDIES_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part studies \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "✅ Created /studies: $STUDIES_ID"
else
    echo "✅ /studies exists: $STUDIES_ID"
fi

# 4. Create /studies/search resource
echo ""
echo "📁 Creating /studies/search resource..."

SEARCH_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='search'].id" \
    --output text)

if [ -z "$SEARCH_ID" ]; then
    SEARCH_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $STUDIES_ID \
        --path-part search \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "✅ Created /studies/search: $SEARCH_ID"
else
    echo "✅ /studies/search exists: $SEARCH_ID"
fi

# 5. Create POST method
echo ""
echo "🔧 Creating POST method..."

if aws apigateway get-method \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method POST \
    --region $REGION > /dev/null 2>&1; then
    echo "POST method exists, deleting to recreate..."
    aws apigateway delete-method \
        --rest-api-id $API_ID \
        --resource-id $SEARCH_ID \
        --http-method POST \
        --region $REGION > /dev/null 2>&1 || true
fi

aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager > /dev/null

echo "✅ POST method created"

# 6. Create Lambda integration
echo ""
echo "🔗 Creating Lambda integration..."

LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION \
    --no-cli-pager > /dev/null

echo "✅ Lambda integration created"

# 7. Add Lambda permission for API Gateway
echo ""
echo "🔐 Adding Lambda permission..."

STATEMENT_ID="apigateway-${ENVIRONMENT}-invoke"

# Remove old permission if exists
aws lambda remove-permission \
    --function-name $FUNCTION_NAME \
    --statement-id $STATEMENT_ID \
    --region $REGION > /dev/null 2>&1 || true

# Add new permission
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id $STATEMENT_ID \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region $REGION \
    --no-cli-pager > /dev/null

echo "✅ Lambda permission added"

# 8. Create OPTIONS method for CORS
echo ""
echo "🌐 Setting up CORS (OPTIONS method)..."

if aws apigateway get-method \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method OPTIONS \
    --region $REGION > /dev/null 2>&1; then
    echo "OPTIONS method exists, deleting to recreate..."
    aws apigateway delete-method \
        --rest-api-id $API_ID \
        --resource-id $SEARCH_ID \
        --http-method OPTIONS \
        --region $REGION > /dev/null 2>&1 || true
fi

# Create OPTIONS method
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager > /dev/null

# Create MOCK integration for OPTIONS
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION \
    --no-cli-pager > /dev/null

# Create method response for OPTIONS
aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Headers": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Origin": true
    }' \
    --region $REGION \
    --no-cli-pager > /dev/null 2>&1 || true

# Create integration response for OPTIONS
aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $SEARCH_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID'"'"'",
        "method.response.header.Access-Control-Allow-Methods": "'"'"'POST,OPTIONS'"'"'",
        "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"
    }' \
    --region $REGION \
    --no-cli-pager > /dev/null 2>&1 || true

echo "✅ CORS configured"

# 9. Deploy API
echo ""
echo "🚀 Deploying API to $ENVIRONMENT stage..."

aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $ENVIRONMENT \
    --stage-description "Studies Fetcher API - ${ENVIRONMENT}" \
    --description "Deployment $(date '+%Y-%m-%d %H:%M:%S')" \
    --region $REGION \
    --no-cli-pager > /dev/null

echo "✅ API deployed to $ENVIRONMENT"

# 10. Get API URL
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${ENVIRONMENT}/studies/search"

echo ""
echo "================================================"
echo "✅ API Gateway setup complete!"
echo "================================================"
echo ""
echo "API ID: $API_ID"
echo "API URL: $API_URL"
echo ""
echo "Test with curl:"
echo ""
echo "curl -X POST $API_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"supplementName\":\"Vitamin D\",\"maxResults\":3}'"
echo ""
echo "================================================"

# Save API URL to file for easy access
echo "$API_URL" > /tmp/studies-api-url.txt
echo ""
echo "API URL saved to: /tmp/studies-api-url.txt"
