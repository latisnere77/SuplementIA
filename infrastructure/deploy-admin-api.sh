#!/bin/bash
# Deploy Weaviate Admin API to AWS
# This script builds the Lambda function and deploys the CloudFormation stack

set -e

STACK_NAME="weaviate-admin-api"
REGION="us-east-1"

echo "🔨 Building Lambda function..."
cd infrastructure/lambda
npm install
npm run build

echo "📦 Packaging Lambda..."
npm run package

echo "🚀 Deploying CloudFormation stack..."
cd ../..
aws cloudformation deploy \
  --stack-name $STACK_NAME \
  --template-file infrastructure/weaviate-admin-api.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION

echo "📝 Updating Admin Lambda function code..."
ADMIN_FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionArn`].OutputValue' \
  --output text | awk -F: '{print $NF}')

aws lambda update-function-code \
  --function-name $ADMIN_FUNCTION_NAME \
  --zip-file fileb://infrastructure/lambda/weaviate-admin.zip \
  --region $REGION

echo "📝 Updating Authorizer Lambda function code..."
# We need to find the authorizer function name. Since we don't have an output for it, we construct it or find it.
# Based on template: !Sub '${AWS::StackName}-authorizer'
AUTHORIZER_FUNCTION_NAME="${STACK_NAME}-authorizer"

aws lambda update-function-code \
  --function-name $AUTHORIZER_FUNCTION_NAME \
  --zip-file fileb://infrastructure/lambda/weaviate-authorizer.zip \
  --region $REGION

echo "✅ Deployment complete!"
echo ""
echo "📍 API Endpoint:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text

echo ""
echo "🔐 Add this to Vercel environment variables:"
echo "WEAVIATE_ADMIN_API_URL=<endpoint-from-above>"
