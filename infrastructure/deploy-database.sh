#!/bin/bash

# Script to deploy the LanceDB on Lambda database stack via CloudFormation.

STACK_NAME="suplementia-database-stack"
TEMPLATE_FILE="infrastructure/database-stack.yml"
REGION="us-east-1" # Or your preferred region

echo "🚀 Deploying stack: $STACK_NAME..."

aws cloudformation deploy \
  --template-file $TEMPLATE_FILE \
  --stack-name $STACK_NAME \
  --region $REGION \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
  echo "✅ Stack deployment initiated successfully."
  echo "Monitor the status in the AWS CloudFormation console."
else
  echo "❌ Stack deployment failed."
fi
