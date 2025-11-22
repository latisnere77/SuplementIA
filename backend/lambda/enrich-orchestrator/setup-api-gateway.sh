#!/bin/bash
set -e

FUNCTION_NAME=${1:-suplementia-content-enricher-dev}
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
API_NAME="suplementia-content-enricher-api"

echo "================================================"
echo "Setting up API Gateway for Content Enricher"
echo "================================================"

# 1. Create REST API
echo "Creating API Gateway..."
API_ID=$(aws apigateway create-rest-api \
    --name "$API_NAME" \
    --description "API Gateway for Content Enricher Lambda" \
    --endpoint-configuration types=REGIONAL \
    --region "$REGION" \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-rest-apis \
    --region "$REGION" \
    --query "items[?name=='$API_NAME'].id" \
    --output text)

echo "API ID: $API_ID"

# 2. Get root resource
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --query 'items[?path==`/`].id' \
    --output text)

echo "Root Resource ID: $ROOT_ID"

# 3. Create /enrich resource
ENRICH_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_ID" \
    --path-part "enrich" \
    --region "$REGION" \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --query "items[?path=='/enrich'].id" \
    --output text)

echo "Enrich Resource ID: $ENRICH_ID"

# 4. Create POST method
aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$ENRICH_ID" \
    --http-method POST \
    --authorization-type NONE \
    --region "$REGION" \
    --no-cli-pager > /dev/null 2>&1 || echo "Method already exists"

# 5. Set up Lambda integration
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$ENRICH_ID" \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region "$REGION" \
    --no-cli-pager > /dev/null 2>&1 || echo "Integration already exists"

# 6. Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id apigateway-invoke-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region "$REGION" \
    --no-cli-pager > /dev/null 2>&1 || echo "Permission already exists"

# 7. Deploy API
echo "Deploying API..."
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name dev \
    --region "$REGION" \
    --no-cli-pager > /dev/null

# 8. Get API URL
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/dev/enrich"

echo ""
echo "================================================"
echo "✅ API Gateway setup complete!"
echo "================================================"
echo ""
echo "API URL: $API_URL"
echo ""
echo "Add this to your .env.local:"
echo "ENRICHER_API_URL=$API_URL"
echo ""
echo "Test with:"
echo "curl -X POST $API_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"supplementId\":\"vitamin-d\",\"category\":\"general\"}'"
