#!/bin/bash
# Check CloudFormation stack status
# Usage: ./check-stack-status.sh <environment>

set -e

ENVIRONMENT=${1:-staging}
STACK_NAME="${ENVIRONMENT}-intelligent-search"

echo "🔍 Checking stack status: $STACK_NAME"

# Check if stack exists
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].StackStatus" \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
  echo "❌ Stack not found: $STACK_NAME"
  echo ""
  echo "📝 To deploy the stack:"
  echo "   cd infrastructure"
  echo "   ./deploy-staging.sh"
  exit 1
fi

echo "✅ Stack Status: $STACK_STATUS"

# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$RDS_ENDPOINT" ]; then
  echo "✅ RDS Endpoint: $RDS_ENDPOINT"
else
  echo "⚠️  RDS Endpoint not found in stack outputs"
fi

# Get other important outputs
echo ""
echo "📊 Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table

echo ""
echo "✅ Stack is ready for migrations"
