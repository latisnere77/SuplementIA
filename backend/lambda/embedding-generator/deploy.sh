#!/bin/bash

# Deployment script for Embedding Generator Lambda
# 
# Prerequisites:
# - AWS CLI configured
# - EFS file system created and model pre-loaded
# - IAM role with EFS access

set -e

# Configuration
FUNCTION_NAME="embedding-generator"
RUNTIME="python3.11"
HANDLER="lambda_function.lambda_handler"
MEMORY_SIZE=1024
TIMEOUT=30
REGION="${AWS_REGION:-us-east-1}"

# EFS Configuration (update these)
EFS_ACCESS_POINT_ARN="${EFS_ACCESS_POINT_ARN:-}"
EFS_MOUNT_PATH="/mnt/ml-models"

# IAM Role (update this)
LAMBDA_ROLE_ARN="${LAMBDA_ROLE_ARN:-}"

echo "🚀 Deploying Embedding Generator Lambda"
echo "========================================"

# Check prerequisites
if [ -z "$LAMBDA_ROLE_ARN" ]; then
  echo "❌ Error: LAMBDA_ROLE_ARN environment variable not set"
  echo "   Set it with: export LAMBDA_ROLE_ARN=arn:aws:iam::ACCOUNT:role/lambda-efs-role"
  exit 1
fi

if [ -z "$EFS_ACCESS_POINT_ARN" ]; then
  echo "⚠️  Warning: EFS_ACCESS_POINT_ARN not set. Lambda will deploy without EFS."
  echo "   Set it with: export EFS_ACCESS_POINT_ARN=arn:aws:elasticfilesystem:REGION:ACCOUNT:access-point/fsap-xxxxx"
fi

# Step 1: Package Lambda function
echo "📦 Packaging Lambda function..."
zip -r function.zip lambda_function.py
echo "✓ Function packaged"

# Step 2: Check if function exists
echo "🔍 Checking if function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
  echo "✓ Function exists, updating..."
  
  # Update function code
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://function.zip \
    --region "$REGION"
  
  echo "✓ Function code updated"
  
  # Update function configuration
  if [ -n "$EFS_ACCESS_POINT_ARN" ]; then
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY_SIZE" \
      --environment "Variables={MODEL_CACHE_DIR=$EFS_MOUNT_PATH}" \
      --file-system-configs "Arn=$EFS_ACCESS_POINT_ARN,LocalMountPath=$EFS_MOUNT_PATH" \
      --region "$REGION"
  else
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY_SIZE" \
      --environment "Variables={MODEL_CACHE_DIR=$EFS_MOUNT_PATH}" \
      --region "$REGION"
  fi
  
  echo "✓ Function configuration updated"
else
  echo "✓ Function does not exist, creating..."
  
  # Create function
  if [ -n "$EFS_ACCESS_POINT_ARN" ]; then
    aws lambda create-function \
      --function-name "$FUNCTION_NAME" \
      --runtime "$RUNTIME" \
      --handler "$HANDLER" \
      --role "$LAMBDA_ROLE_ARN" \
      --zip-file fileb://function.zip \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY_SIZE" \
      --environment "Variables={MODEL_CACHE_DIR=$EFS_MOUNT_PATH}" \
      --file-system-configs "Arn=$EFS_ACCESS_POINT_ARN,LocalMountPath=$EFS_MOUNT_PATH" \
      --region "$REGION"
  else
    aws lambda create-function \
      --function-name "$FUNCTION_NAME" \
      --runtime "$RUNTIME" \
      --handler "$HANDLER" \
      --role "$LAMBDA_ROLE_ARN" \
      --zip-file fileb://function.zip \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY_SIZE" \
      --environment "Variables={MODEL_CACHE_DIR=$EFS_MOUNT_PATH}" \
      --region "$REGION"
  fi
  
  echo "✓ Function created"
fi

# Step 3: Create or update Lambda layer (optional)
echo "📚 Creating Lambda layer with dependencies..."
if [ ! -d "python" ]; then
  mkdir -p python/lib/python3.11/site-packages
  pip install -r requirements.txt -t python/lib/python3.11/site-packages
  zip -r layer.zip python
  
  # Publish layer
  LAYER_VERSION=$(aws lambda publish-layer-version \
    --layer-name sentence-transformers \
    --zip-file fileb://layer.zip \
    --compatible-runtimes "$RUNTIME" \
    --region "$REGION" \
    --query 'Version' \
    --output text)
  
  echo "✓ Layer published (version $LAYER_VERSION)"
  
  # Attach layer to function
  LAYER_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):layer:sentence-transformers:$LAYER_VERSION"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --layers "$LAYER_ARN" \
    --region "$REGION"
  
  echo "✓ Layer attached to function"
else
  echo "⊘ Skipping layer creation (python/ directory exists)"
fi

# Step 4: Create Function URL (optional)
echo "🌐 Creating Function URL..."
if aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
  echo "⊘ Function URL already exists"
else
  FUNCTION_URL=$(aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --region "$REGION" \
    --query 'FunctionUrl' \
    --output text)
  
  # Add resource-based policy to allow public access
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region "$REGION" || true
  
  echo "✓ Function URL created: $FUNCTION_URL"
fi

# Step 5: Test function
echo "🧪 Testing function..."
aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{"text":"vitamin d"}' \
  --region "$REGION" \
  response.json

if [ -f response.json ]; then
  echo "✓ Function test response:"
  cat response.json | python3 -m json.tool
  rm response.json
fi

# Cleanup
rm -f function.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Function ARN: arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME"
echo ""
echo "To invoke the function:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"text\":\"vitamin d\"}' response.json"
echo ""
echo "To view logs:"
echo "  aws logs tail /aws/lambda/$FUNCTION_NAME --follow"
