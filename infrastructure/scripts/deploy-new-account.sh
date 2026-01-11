#!/bin/bash

set -e

# Configuration
NEW_ACCOUNT_ID="643942183354"
MASTER_ACCOUNT_ID="239378269775"
STACK_NAME="suplementia-production"
TEMPLATE_FILE="/Users/latisnere/Documents/suplementia/infrastructure/cloudformation/new-account-production.yml"
REGION="us-east-1"

echo "🚀 Suplementia Migration - CloudFormation Deployment Script"
echo "================================================================"
echo "Source Account: $MASTER_ACCOUNT_ID (Master)"
echo "Target Account: $NEW_ACCOUNT_ID (New)"
echo "Stack Name: $STACK_NAME"
echo "Region: $REGION"
echo "================================================================"

# Step 1: Assume role in new account
echo ""
echo "📋 Step 1: Assuming OrganizationAccountAccessRole in new account..."

ASSUME_ROLE_OUTPUT=$(aws sts assume-role \
  --role-arn "arn:aws:iam::${NEW_ACCOUNT_ID}:role/OrganizationAccountAccessRole" \
  --role-session-name "suplementia-cfn-migration-$$" \
  --duration-seconds 3600 \
  --region "$REGION")

# Extract credentials
CRED_ACCESS_KEY=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.AccessKeyId')
CRED_SECRET_KEY=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
CRED_SESSION_TOKEN=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SessionToken')

# Export for this script's scope
export AWS_ACCESS_KEY_ID="$CRED_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$CRED_SECRET_KEY"
export AWS_SESSION_TOKEN="$CRED_SESSION_TOKEN"

# Verify
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text --region "$REGION")
echo "✅ Assumed role successfully in account: $CURRENT_ACCOUNT"

if [ "$CURRENT_ACCOUNT" != "$NEW_ACCOUNT_ID" ]; then
  echo "❌ ERROR: Expected to be in account $NEW_ACCOUNT_ID but in $CURRENT_ACCOUNT"
  exit 1
fi

# Step 2: Check if stack already exists
echo ""
echo "📋 Step 2: Checking for existing stack..."

STACK_EXISTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NONE")

if [ "$STACK_EXISTS" != "NONE" ]; then
  echo "⚠️ Stack already exists with status: $STACK_EXISTS"
  if [ "$STACK_EXISTS" = "CREATE_FAILED" ] || [ "$STACK_EXISTS" = "ROLLBACK_COMPLETE" ]; then
    echo "🗑️ Deleting failed stack..."
    aws cloudformation delete-stack \
      --stack-name "$STACK_NAME" \
      --region "$REGION"
    aws cloudformation wait stack-delete-complete \
      --stack-name "$STACK_NAME" \
      --region "$REGION"
    echo "✅ Stack deleted"
  else
    echo "⏭️  Skipping creation - stack already exists with status: $STACK_EXISTS"
    exit 0
  fi
fi

# Step 3: Validate template
echo ""
echo "📋 Step 3: Validating CloudFormation template..."

aws cloudformation validate-template \
  --template-body "file://$TEMPLATE_FILE" \
  --region "$REGION" > /dev/null

echo "✅ Template is valid"

# Step 4: Create stack
echo ""
echo "📋 Step 4: Creating CloudFormation stack..."
echo "(This will take 10-15 minutes)"
echo ""

STACK_ID=$(aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body "file://$TEMPLATE_FILE" \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --tags \
    Key=Project,Value=Suplementia \
    Key=Environment,Value=production \
    Key=MigratedFrom,Value="$MASTER_ACCOUNT_ID" \
  --query 'StackId' \
  --output text)

echo "✅ Stack creation initiated"
echo "   Stack ID: $STACK_ID"

# Step 5: Monitor stack creation
echo ""
echo "📊 Monitoring stack creation..."

aws cloudformation wait stack-create-complete \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

echo "✅ Stack created successfully!"

# Step 6: Display outputs
echo ""
echo "📋 Step 6: Stack Outputs"
echo "================================================================"

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey, OutputValue]' \
  --output table

# Clean up environment variables
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Verify DynamoDB exports are complete"
echo "   2. Import DynamoDB data from S3"
echo "   3. Deploy Lambda functions"
echo "   4. Test endpoints"
echo "   5. Update vercel.json with new endpoints"
