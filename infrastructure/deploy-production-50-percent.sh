#!/bin/bash

# Update CloudFront Traffic Routing to 50%
# This script updates the CloudFront distribution to route 50% of traffic to the new system

set -e

ENVIRONMENT="production"
CLOUDFRONT_STACK_NAME="${ENVIRONMENT}-intelligent-search-cloudfront"
REGION="${AWS_REGION:-us-east-1}"
TRAFFIC_PERCENTAGE=50

echo "🚀 Updating Traffic Routing to 50%"
echo "================================================================"
echo "Stack Name: ${CLOUDFRONT_STACK_NAME}"
echo "Region: ${REGION}"
echo "New Traffic Percentage: ${TRAFFIC_PERCENTAGE}%"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if CloudFront stack exists
echo "✅ Checking if CloudFront stack exists..."
aws cloudformation describe-stacks \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION} > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ CloudFront stack not found: ${CLOUDFRONT_STACK_NAME}"
    echo "   Please deploy the initial stack first with deploy-production-10-percent.sh"
    exit 1
fi

echo "✅ CloudFront stack found"
echo ""

# Get current traffic percentage
CURRENT_TRAFFIC=$(aws cloudformation describe-stacks \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Parameters[?ParameterKey==`TrafficPercentage`].ParameterValue' \
    --output text)

echo "📊 Current traffic to new system: ${CURRENT_TRAFFIC}%"
echo "📊 New traffic to new system: ${TRAFFIC_PERCENTAGE}%"
echo ""

# Confirm with user
read -p "Do you want to proceed with updating traffic to ${TRAFFIC_PERCENTAGE}%? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "❌ Deployment cancelled by user"
    exit 0
fi

echo ""
echo "🚀 Updating CloudFront distribution..."
echo "This may take 15-20 minutes..."
echo ""

# Update CloudFront stack
aws cloudformation update-stack \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --use-previous-template \
    --parameters \
        ParameterKey=Environment,UsePreviousValue=true \
        ParameterKey=NewSystemOriginDomain,UsePreviousValue=true \
        ParameterKey=LegacySystemOriginDomain,UsePreviousValue=true \
        ParameterKey=TrafficPercentage,ParameterValue=${TRAFFIC_PERCENTAGE} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION}

if [ $? -ne 0 ]; then
    echo "❌ CloudFront stack update failed"
    exit 1
fi

# Wait for update to complete
echo "⏳ Waiting for CloudFront distribution update to complete..."
aws cloudformation wait stack-update-complete \
    --stack-name ${CLOUDFRONT_STACK_NAME} \
    --region ${REGION}

if [ $? -eq 0 ]; then
    echo "✅ CloudFront distribution updated successfully!"
else
    echo "❌ CloudFront distribution update failed or timed out"
    exit 1
fi

echo ""
echo "🎉 Traffic Routing Updated!"
echo "================================================================"
echo ""
echo "📊 Traffic Distribution:"
echo "   New System: ${TRAFFIC_PERCENTAGE}%"
echo "   Legacy System: $((100 - TRAFFIC_PERCENTAGE))%"
echo ""
echo "📈 Next Steps:"
echo "   1. Monitor CloudWatch metrics for at least 2 hours"
echo "   2. Compare error rate and latency between systems"
echo "   3. Verify cache hit rate remains >= 85%"
echo "   4. If metrics look good, increase traffic to 100%"
echo ""
echo "📊 Start Monitoring:"
echo "   ./infrastructure/monitor-rollout.sh production 120"
echo ""
echo "⚠️  Rollback (if needed):"
echo "   ./infrastructure/rollback-traffic.sh ${CURRENT_TRAFFIC}"
echo ""

