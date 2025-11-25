#!/bin/bash

# Update CloudFront Traffic Routing to 100%
# This script updates the CloudFront distribution to route 100% of traffic to the new system

set -e

ENVIRONMENT="production"
CLOUDFRONT_STACK_NAME="${ENVIRONMENT}-intelligent-search-cloudfront"
REGION="${AWS_REGION:-us-east-1}"
TRAFFIC_PERCENTAGE=100

echo "🚀 Updating Traffic Routing to 100%"
echo "================================================================"
echo "Stack Name: ${CLOUDFRONT_STACK_NAME}"
echo "Region: ${REGION}"
echo "New Traffic Percentage: ${TRAFFIC_PERCENTAGE}%"
echo ""
echo "⚠️  WARNING: This will route ALL traffic to the new system!"
echo "   The legacy system will remain as a fallback for 48 hours."
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

# Confirm with user (double confirmation for 100%)
read -p "Are you sure you want to route 100% of traffic to the new system? (yes/no): " CONFIRM1

if [ "${CONFIRM1}" != "yes" ]; then
    echo "❌ Deployment cancelled by user"
    exit 0
fi

read -p "Have you verified that the system is stable at ${CURRENT_TRAFFIC}% for at least 4 hours? (yes/no): " CONFIRM2

if [ "${CONFIRM2}" != "yes" ]; then
    echo "❌ Deployment cancelled. Please monitor the system for at least 4 hours before proceeding."
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
echo "🎉 Traffic Routing Updated to 100%!"
echo "================================================================"
echo ""
echo "📊 Traffic Distribution:"
echo "   New System: ${TRAFFIC_PERCENTAGE}%"
echo "   Legacy System: 0% (kept as fallback)"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Monitor the system closely for the next 48 hours"
echo "   - Keep the legacy system running as a fallback"
echo "   - Do not delete legacy infrastructure yet"
echo "   - Be ready to rollback if issues arise"
echo ""
echo "📈 Next Steps:"
echo "   1. Monitor CloudWatch metrics for 48 hours"
echo "   2. Verify error rate < 1% consistently"
echo "   3. Verify P95 latency < 200ms consistently"
echo "   4. Verify cache hit rate >= 85% consistently"
echo "   5. After 48 hours of stability, proceed with legacy cleanup"
echo ""
echo "📊 Start Monitoring (48 hours):"
echo "   ./infrastructure/monitor-rollout.sh production 2880"
echo ""
echo "⚠️  Rollback (if needed):"
echo "   ./infrastructure/rollback-traffic.sh ${CURRENT_TRAFFIC}"
echo ""
echo "📝 After 48 hours of stability:"
echo "   - Remove legacy code (task 16.1)"
echo "   - Update documentation (task 16.2)"
echo "   - Decommission legacy infrastructure"
echo ""

