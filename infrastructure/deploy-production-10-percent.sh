#!/bin/bash

# Deploy Intelligent Supplement Search System to Production with 10% Traffic
# This script deploys the infrastructure and routes 10% of traffic to the new system

set -e

ENVIRONMENT="production"
STACK_NAME="${ENVIRONMENT}-intelligent-search"
CLOUDFRONT_STACK_NAME="${ENVIRONMENT}-intelligent-search-cloudfront"
TEMPLATE_FILE="infrastructure/cloudformation/intelligent-search-production.yml"
CLOUDFRONT_TEMPLATE_FILE="infrastructure/cloudformation/cloudfront-traffic-routing.yml"
REGION="${AWS_REGION:-us-east-1}"
TRAFFIC_PERCENTAGE=10

echo "🚀 Deploying Intelligent Supplement Search System to Production"
echo "================================================================"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "Traffic Percentage: ${TRAFFIC_PERCENTAGE}%"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if templates exist
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo "❌ Template file not found: ${TEMPLATE_FILE}"
    exit 1
fi

if [ ! -f "${CLOUDFRONT_TEMPLATE_FILE}" ]; then
    echo "❌ CloudFront template file not found: ${CLOUDFRONT_TEMPLATE_FILE}"
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

# Prompt for legacy system domain
echo "📝 Please enter the legacy system domain (Vercel deployment):"
echo "   Example: your-app.vercel.app"
read LEGACY_DOMAIN
echo ""

if [ -z "${LEGACY_DOMAIN}" ]; then
    echo "❌ Legacy domain is required"
    exit 1
fi

# Validate CloudFormation templates
echo "✅ Validating CloudFormation templates..."
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

aws cloudformation validate-template \
    --template-body file://${CLOUDFRONT_TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

echo "✅ Template validation successful"
echo ""

# Deploy infrastructure stack
echo "🚀 Deploying infrastructure stack..."
echo "This may take 20-25 minutes..."
echo ""

aws cloudformation deploy \
    --template-file ${TEMPLATE_FILE} \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        DBPassword=${DB_PASSWORD} \
        TrafficPercentage=${TRAFFIC_PERCENTAGE} \
        LegacyOriginDomain=${LEGACY_DOMAIN} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION} \
    --no-fail-on-empty-changeset

if [ $? -ne 0 ]; then
    echo "❌ Infrastructure stack deployment failed"
    exit 1
fi

echo "✅ Infrastructure stack deployed successfully!"
echo ""

# Get API Gateway endpoint from stack outputs
echo "📊 Retrieving API Gateway endpoint..."
API_GATEWAY_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayDomain`].OutputValue' \
    --output text)

if [ -z "${API_GATEWAY_DOMAIN}" ]; then
    echo "⚠️  API Gateway domain not found in stack outputs"
    echo "   You'll need to deploy Lambda functions first"
    echo "   Then run this script again to deploy CloudFront"
    exit 0
fi

echo "✅ API Gateway Domain: ${API_GATEWAY_DOMAIN}"
echo ""

# Deploy CloudFront stack with traffic routing
echo "🚀 Deploying CloudFront with traffic routing..."
echo "This may take 15-20 minutes..."
echo ""

aws cloudformation deploy \
    --template-file ${CLOUDFRONT_TEMPLATE_FILE} \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        NewSystemOriginDomain=${API_GATEWAY_DOMAIN} \
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

# Get CloudFront distribution URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment Complete!"
echo "================================================================"
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: ${ENVIRONMENT}"
echo "   Traffic to New System: ${TRAFFIC_PERCENTAGE}%"
echo "   Traffic to Legacy System: $((100 - TRAFFIC_PERCENTAGE))%"
echo ""
echo "🌐 CloudFront URL: ${CLOUDFRONT_URL}"
echo ""
echo "📈 Next Steps:"
echo "   1. Monitor CloudWatch metrics for error rate and latency"
echo "   2. Compare performance between new and legacy systems"
echo "   3. Check CloudFront logs for traffic distribution"
echo "   4. If metrics look good, increase traffic to 50%"
echo ""
echo "📊 Monitoring Commands:"
echo "   # View CloudWatch dashboard"
echo "   aws cloudwatch get-dashboard --dashboard-name ${ENVIRONMENT}-intelligent-search"
echo ""
echo "   # Check error rate"
echo "   aws cloudwatch get-metric-statistics \\"
echo "     --namespace AWS/Lambda \\"
echo "     --metric-name Errors \\"
echo "     --start-time \$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\"
echo "     --end-time \$(date -u +%Y-%m-%dT%H:%M:%S) \\"
echo "     --period 300 \\"
echo "     --statistics Sum"
echo ""
echo "   # Check latency (P95)"
echo "   aws cloudwatch get-metric-statistics \\"
echo "     --namespace AWS/Lambda \\"
echo "     --metric-name Duration \\"
echo "     --start-time \$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\"
echo "     --end-time \$(date -u +%Y-%m-%dT%H:%M:%S) \\"
echo "     --period 300 \\"
echo "     --statistics Average \\"
echo "     --extended-statistics p95"
echo ""
echo "   # Download CloudFront logs"
echo "   aws s3 sync s3://${ENVIRONMENT}-supplement-search-cloudfront-logs-\$(aws sts get-caller-identity --query Account --output text)/${ENVIRONMENT}/cloudfront/ ./cloudfront-logs/"
echo ""

