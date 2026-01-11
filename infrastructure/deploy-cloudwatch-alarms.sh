#!/bin/bash

# Deploy CloudWatch Alarms
# Usage: ./deploy-cloudwatch-alarms.sh [environment] [alert-email]

set -e

ENVIRONMENT=${1:-production}
ALERT_EMAIL=${2:-alerts@example.com}
STACK_NAME="${ENVIRONMENT}-supplement-search-alarms"

echo "🚀 Deploying CloudWatch Alarms..."
echo "Environment: $ENVIRONMENT"
echo "Alert Email: $ALERT_EMAIL"
echo "Stack Name: $STACK_NAME"

# Validate CloudFormation template
echo "📋 Validating CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://cloudwatch-alarms.yml

# Deploy CloudFormation stack
echo "☁️  Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file cloudwatch-alarms.yml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AlertEmail="$ALERT_EMAIL" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Get stack outputs
echo "📊 Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' \
  --output table

echo "✅ CloudWatch Alarms deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Check your email ($ALERT_EMAIL) to confirm SNS subscription"
