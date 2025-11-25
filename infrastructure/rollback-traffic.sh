#!/bin/bash

# Rollback CloudFront Traffic Routing
# This script rolls back the CloudFront distribution to a previous traffic percentage

set -e

ENVIRONMENT="production"
CLOUDFRONT_STACK_NAME="${ENVIRONMENT}-intelligent-search-cloudfront"
REGION="${AWS_REGION:-us-east-1}"
ROLLBACK_PERCENTAGE="${1:-0}"

echo "🔄 Rolling Back Traffic Routing"
echo "================================================================"
echo "Stack Name: ${CLOUDFRONT_STACK_NAME}"
echo "Region: ${REGION}"
echo "Rollback Traffic Percentage: ${ROLLBACK_PERCENTAGE}%"
echo ""

# Validate rollback percentage
if ! [[ "${ROLLBACK_PERCENTAGE}" =~ ^[0-9]+$ ]] || [ "${ROLLBACK_PERCENTAGE}" -lt 0 ] || [ "${ROLLBACK_PERCENTAGE}" -gt 100 ]; then
    echo "❌ Invalid rollback percentage: ${ROLLBACK_PERCENTAGE}"
    echo "   Usage: ./rollback-traffic.sh <percentage>"
    echo "   Example: ./rollback-traffic.sh 10"
    exit 1
fi

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
echo "📊 Rolling back to: ${ROLLBACK_PERCENTAGE}%"
echo ""

# Confirm with user
read -p "⚠️  Are you sure you want to rollback traffic to ${ROLLBACK_PERCENTAGE}%? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "❌ Rollback cancelled by user"
    exit 0
fi

echo ""
echo "🔄 Rolling back CloudFront distribution..."
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
        ParameterKey=TrafficPercentage,ParameterValue=${ROLLBACK_PERCENTAGE} \
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
    echo "✅ CloudFront distribution rolled back successfully!"
else
    echo "❌ CloudFront distribution rollback failed or timed out"
    exit 1
fi

echo ""
echo "🎉 Rollback Complete!"
echo "================================================================"
echo ""
echo "📊 Traffic Distribution:"
echo "   New System: ${ROLLBACK_PERCENTAGE}%"
echo "   Legacy System: $((100 - ROLLBACK_PERCENTAGE))%"
echo ""
echo "📈 Next Steps:"
echo "   1. Investigate the issue that caused the rollback"
echo "   2. Check CloudWatch logs for errors"
echo "   3. Review metrics and identify root cause"
echo "   4. Fix the issue in staging environment"
echo "   5. Test thoroughly before attempting rollout again"
echo ""
echo "📊 Monitor Current State:"
echo "   ./infrastructure/monitor-rollout.sh production 60"
echo ""
echo "📝 Incident Report:"
echo "   - Document what went wrong"
echo "   - Identify root cause"
echo "   - Create action items to prevent recurrence"
echo ""

