#!/bin/bash
set -e

REGION="us-east-1"
FUNCTION_NAME="staging-efs-setup-temp"
ROLE_ARN="arn:aws:iam::239378269775:role/staging-search-api-lambda-role"
EFS_ID="fs-0e6f9a62f873bc52c"
SUBNET_1="subnet-016f4ab10eaf2afd0"
SUBNET_2="subnet-050fcfaaab6262df0"
SECURITY_GROUP="sg-00c9d9ca209c46fa6"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  EFS Setup via Temporary Lambda Function                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Create a temporary Lambda function with EFS access"
echo "  2. Install lancedb + sentence-transformers to /mnt/efs/python"
echo "  3. Download ML model to /mnt/efs/models"
echo "  4. Delete the temporary Lambda"
echo ""
echo "Time estimate: 10-15 minutes"
echo ""

# Step 1: Package Lambda
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/4: Packaging Lambda handler"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /Users/latisnere/Documents/suplementia/backend/lambda
rm -f efs-setup.zip
zip efs-setup.zip efs-setup-handler.py

echo "  ✓ Lambda packaged ($(du -h efs-setup.zip | cut -f1))"

# Step 2: Create Lambda with EFS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/4: Creating temporary Lambda with EFS mount"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Lambda already exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
  echo "  → Lambda already exists, deleting first..."
  aws lambda delete-function --function-name $FUNCTION_NAME --region $REGION
  sleep 5
fi

aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime python3.11 \
  --role $ROLE_ARN \
  --handler efs-setup-handler.handler \
  --zip-file fileb://efs-setup.zip \
  --timeout 900 \
  --memory-size 3008 \
  --architectures arm64 \
  --file-system-configs "Arn=arn:aws:elasticfilesystem:${REGION}:239378269775:access-point/fsap-03713ad5fb9a91304,LocalMountPath=/mnt/efs" \
  --vpc-config "SubnetIds=${SUBNET_1},${SUBNET_2},SecurityGroupIds=${SECURITY_GROUP}" \
  --region $REGION \
  --no-cli-pager \
  > /dev/null 2>&1

echo "  ✓ Lambda created: $FUNCTION_NAME"
echo "  → Waiting for Lambda to be ready (EFS mount can take 30-60 seconds)..."
sleep 60

# Step 3: Invoke Lambda
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/4: Running EFS setup (this may take 10-15 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --log-type Tail \
  --query 'LogResult' \
  --output text \
  /tmp/efs-setup-response.json | base64 --decode

echo ""
echo "Response:"
cat /tmp/efs-setup-response.json | jq .

# Step 4: Cleanup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/4: Cleaning up temporary resources"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws lambda delete-function --function-name $FUNCTION_NAME --region $REGION
rm -f efs-setup.zip
rm -f /tmp/efs-setup-response.json

echo "  ✓ Temporary Lambda deleted"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  EFS Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "EFS now contains:"
echo "  • /mnt/efs/python/ - lancedb + sentence-transformers"
echo "  • /mnt/efs/models/all-MiniLM-L6-v2/ - ML model"
echo ""
echo "Next steps:"
echo "  • Test the Search API Lambda"
echo "  • Test the Discovery Worker Lambda"
echo ""
