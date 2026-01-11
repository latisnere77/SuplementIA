#!/bin/bash
set -e

# Run CodeBuild to setup EFS (one-time execution)
ENVIRONMENT=${1:-production}
REGION="us-east-1"
STACK_NAME="${ENVIRONMENT}-lancedb"
CODEBUILD_STACK="${ENVIRONMENT}-codebuild-efs-setup"

echo "=========================================="
echo "CodeBuild EFS Setup"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

# Get VPC and subnet info from main stack
echo "Getting VPC configuration from stack..."
VPC_ID=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?LogicalResourceId==`VPC`].PhysicalResourceId' \
  --output text)

EFS_ID=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?LogicalResourceId==`EFSFileSystem`].PhysicalResourceId' \
  --output text)

# Get private subnets from stack
SUBNET1=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?LogicalResourceId==`PrivateSubnet1`].PhysicalResourceId' \
  --output text)

SUBNET2=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?LogicalResourceId==`PrivateSubnet2`].PhysicalResourceId' \
  --output text)

SUBNETS="$SUBNET1,$SUBNET2"

# Get security group
SG_ID=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?LogicalResourceId==`LambdaSecurityGroup`].PhysicalResourceId' \
  --output text)

echo "VPC ID: $VPC_ID"
echo "EFS ID: $EFS_ID"
echo "Subnets: $SUBNETS"
echo "Security Group: $SG_ID"
echo ""

# Deploy CodeBuild stack
echo "Deploying CodeBuild stack..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/codebuild-efs-setup.yml \
  --stack-name "$CODEBUILD_STACK" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    EFSFileSystemId="$EFS_ID" \
    VPCId="$VPC_ID" \
    PrivateSubnetIds="$SUBNETS" \
    SecurityGroupId="$SG_ID" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo "✓ CodeBuild stack deployed"
echo ""

# Get project name
PROJECT_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$CODEBUILD_STACK" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ProjectName`].OutputValue' \
  --output text)

echo "CodeBuild Project: $PROJECT_NAME"
echo ""

# Start build
echo "Starting CodeBuild execution..."
BUILD_ID=$(aws codebuild start-build \
  --project-name "$PROJECT_NAME" \
  --region "$REGION" \
  --query 'build.id' \
  --output text)

echo "Build ID: $BUILD_ID"
echo ""
echo "Monitoring build progress..."
echo "You can also view logs at:"
echo "https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"
echo ""

# Wait for build to complete
aws codebuild wait build-complete \
  --ids "$BUILD_ID" \
  --region "$REGION" && \
  echo "✓ Build completed successfully!" || \
  echo "✗ Build failed. Check logs above."

# Get build status
BUILD_STATUS=$(aws codebuild batch-get-builds \
  --ids "$BUILD_ID" \
  --region "$REGION" \
  --query 'builds[0].buildStatus' \
  --output text)

echo ""
echo "=========================================="
echo "Build Status: $BUILD_STATUS"
echo "=========================================="

if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
  echo ""
  echo "✅ EFS setup complete!"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy Lambda code"
  echo "  2. Test Lambda functions"
  echo ""
  exit 0
else
  echo ""
  echo "❌ Build failed. Check CloudWatch logs for details."
  exit 1
fi
