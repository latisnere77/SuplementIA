#!/bin/bash

# Simplified Production Deployment with 10% Traffic
# This script deploys CloudFront with traffic routing using Lambda Function URLs

set -e

ENVIRONMENT="production"
CLOUDFRONT_STACK_NAME="${ENVIRONMENT}-intelligent-search-cloudfront"
CLOUDFRONT_TEMPLATE_FILE="infrastructure/cloudformation/cloudfront-traffic-routing.yml"
REGION="${AWS_REGION:-us-east-1}"
TRAFFIC_PERCENTAGE=10

echo "🚀 Deploying Intelligent Supplement Search to Production (Simplified)"
echo "===================================================================="
echo "Stack Name: ${CLOUDFRONT_STACK_NAME}"
echo "Region: ${REGION}"
echo "Traffic Percentage: ${TRAFFIC_PERCENTAGE}%"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if CloudFront template exists
if [ ! -f "${CLOUDFRONT_TEMPLATE_FILE}" ]; then
    echo "❌ CloudFront template file not found: ${CLOUDFRONT_TEMPLATE_FILE}"
    exit 1
fi

# Step 1: Create Lambda Function URL if it doesn't exist
echo "📝 Step 1: Configuring Lambda Function URL..."
echo ""

FUNCTION_NAME="production-search-api-lancedb"

# Check if function URL already exists
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name ${FUNCTION_NAME} \
    --region ${REGION} \
    --query 'FunctionUrl' \
    --output text 2>/dev/null || echo "")

if [ -z "${FUNCTION_URL}" ]; then
    echo "Creating Lambda Function URL for ${FUNCTION_NAME}..."
    
    aws lambda create-function-url-config \
        --function-name ${FUNCTION_NAME} \
        --auth-type NONE \
        --cors '{
          "AllowOrigins": ["*"],
          "AllowMethods": ["GET", "POST", "OPTIONS"],
          "AllowHeaders": ["*"],
          "MaxAge": 86400
        }' \
        --region ${REGION} > /dev/null
    
    # Get the newly created function URL
    FUNCTION_URL=$(aws lambda get-function-url-config \
        --function-name ${FUNCTION_NAME} \
        --region ${REGION} \
        --query 'FunctionUrl' \
        --output text)
    
    echo "✅ Lambda Function URL created: ${FUNCTION_URL}"
else
    echo "✅ Lambda Function URL already exists: ${FUNCTION_URL}"
fi

# Extract domain from function URL (remove https:// and trailing /)
NEW_SYSTEM_DOMAIN=$(echo ${FUNCTION_URL} | sed 's|https://||' | sed 's|/$||')
echo "New System Domain: ${NEW_SYSTEM_DOMAIN}"
echo ""

# Step 2: Get legacy system domain
echo "📝 Step 2: Identifying Legacy System Domain..."
echo ""

# Try to get from Vercel
LEGACY_DOMAIN=$(vercel ls suplementia --prod 2>/dev/null | grep -o 'https://[^ ]*' | head -1 | sed 's|https://||' || echo "")

if [ -z "${LEGACY_DOMAIN}" ]; then
    echo "⚠️  Could not automatically detect legacy system domain."
    echo "Please enter the legacy system domain (Vercel deployment):"
    echo "Example: suplementia-abc123.vercel.app"
    read LEGACY_DOMAIN
    echo ""
fi

if [ -z "${LEGACY_DOMAIN}" ]; then
    echo "❌ Legacy domain is required"
    exit 1
fi

echo "✅ Legacy System Domain: ${LEGACY_DOMAIN}"
echo ""

# Step 3: Validate CloudFront template
echo "📝 Step 3: Validating CloudFront template..."
aws cloudformation validate-template \
    --template-body file://${CLOUDFRONT_TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

echo "✅ Template validation successful"
echo ""

# Step 4: Deploy CloudFront stack
echo "🚀 Step 4: Deploying CloudFront with traffic routing..."
echo "This may take 15-20 minutes..."
echo ""

aws cloudformation deploy \
    --template-file ${CLOUDFRONT_TEMPLATE_FILE} \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        NewSystemOriginDomain=${NEW_SYSTEM_DOMAIN} \
        LegacySystemOriginDomain=${LEGACY_DOMAIN} \
        TrafficPercentage=${TRAFFIC_PERCENTAGE} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION} \
    --no-fail-on-empty-changeset

if [ $? -ne 0 ]; then
    echo "❌ CloudFront stack deployment failed"
    exit 1
fi

echo "✅ CloudFront stack deployed successfully!"
echo ""

# Step 5: Get CloudFront distribution URL
echo "📊 Step 5: Retrieving deployment information..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment Complete!"
echo "===================================================================="
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: ${ENVIRONMENT}"
echo "   Traffic to New System: ${TRAFFIC_PERCENTAGE}%"
echo "   Traffic to Legacy System: $((100 - TRAFFIC_PERCENTAGE))%"
echo ""
echo "🌐 Endpoints:"
echo "   CloudFront URL: ${CLOUDFRONT_URL}"
echo "   Distribution ID: ${DISTRIBUTION_ID}"
echo "   New System: https://${NEW_SYSTEM_DOMAIN}"
echo "   Legacy System: https://${LEGACY_DOMAIN}"
echo ""
echo "📈 Next Steps:"
echo "   1. Test the CloudFront endpoint"
echo "   2. Monitor CloudWatch metrics for error rate and latency"
echo "   3. Compare performance between new and legacy systems"
echo "   4. Check CloudFront logs for traffic distribution"
echo "   5. If metrics look good after 24 hours, increase traffic to 50%"
echo ""
echo "🧪 Test Commands:"
echo "   # Test search endpoint"
echo "   curl -X POST \"${CLOUDFRONT_URL}/search\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"vitamin d\", \"language\": \"en\"}'"
echo ""
echo "📊 Monitoring Commands:"
echo "   # Start monitoring (2 hours)"
echo "   ./infrastructure/monitor-rollout.sh production 120"
echo ""
echo "   # View CloudWatch dashboard"
echo "   aws cloudwatch get-dashboard --dashboard-name ${ENVIRONMENT}-intelligent-search"
echo ""
echo "   # Check CloudFront distribution status"
echo "   aws cloudfront get-distribution --id ${DISTRIBUTION_ID}"
echo ""
echo "   # Download CloudFront logs"
echo "   ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)"
echo "   aws s3 sync s3://${ENVIRONMENT}-supplement-search-cloudfront-logs-\${ACCOUNT_ID}/${ENVIRONMENT}/cloudfront/ ./cloudfront-logs/"
echo ""
echo "⚠️  Important:"
echo "   - Monitor metrics closely for the first 2 hours"
echo "   - Keep legacy system running as fallback"
echo "   - Be ready to rollback if issues arise"
echo ""
echo "🔄 Rollback Command (if needed):"
echo "   ./infrastructure/rollback-traffic.sh 0"
echo ""
