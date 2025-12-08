#!/bin/bash

# Upload Sentence Transformers Model to EFS
# This script downloads the model and uploads it to EFS via a temporary Lambda function

set -e

ENVIRONMENT="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${ENVIRONMENT}-intelligent-search"
MODEL_NAME="sentence-transformers/all-MiniLM-L6-v2"

echo "📦 Uploading ML Model to EFS"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Model: ${MODEL_NAME}"
echo ""

# Get EFS details from CloudFormation
echo "📡 Fetching EFS details..."

EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text)

EFS_AP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSAccessPointId`].OutputValue' \
    --output text)

if [ -z "$EFS_ID" ] || [ -z "$EFS_AP" ]; then
    echo "❌ Could not fetch EFS details from CloudFormation"
    exit 1
fi

echo "✅ EFS File System: ${EFS_ID}"
echo "✅ EFS Access Point: ${EFS_AP}"
echo ""

# Create a temporary Lambda function to download and upload the model
echo "🔧 Creating temporary Lambda function for model upload..."

# Create Lambda function code
cat > /tmp/model_uploader.py << 'EOF'
import os
import json
from sentence_transformers import SentenceTransformer

def lambda_handler(event, context):
    """Download model and save to EFS"""
    model_name = event.get('model_name', 'sentence-transformers/all-MiniLM-L6-v2')
    cache_dir = event.get('cache_dir', '/mnt/ml-models')
    
    print(f'Downloading model: {model_name}')
    print(f'Cache directory: {cache_dir}')
    
    try:
        # Download model (will be cached in EFS)
        model = SentenceTransformer(model_name, cache_folder=cache_dir)
        
        # Test the model
        test_embedding = model.encode('test')
        
        print(f'Model downloaded successfully')
        print(f'Embedding dimensions: {len(test_embedding)}')
        
        # List files in cache directory
        files = []
        for root, dirs, filenames in os.walk(cache_dir):
            for filename in filenames:
                filepath = os.path.join(root, filename)
                size = os.path.getsize(filepath)
                files.append({
                    'path': filepath,
                    'size': size
                })
        
        total_size = sum(f['size'] for f in files)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'model': model_name,
                'dimensions': len(test_embedding),
                'files': len(files),
                'totalSize': total_size,
                'cachePath': cache_dir
            })
        }
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
EOF

# Create requirements.txt
cat > /tmp/requirements.txt << 'EOF'
sentence-transformers>=2.2.0
torch>=2.0.0
transformers>=4.30.0
EOF

# Package Lambda function
echo "📦 Packaging Lambda function..."
cd /tmp
rm -rf package model-uploader.zip
mkdir -p package

pip install -r requirements.txt -t package/ --quiet

cp model_uploader.py package/

cd package
zip -r ../model-uploader.zip . -q
cd ..

echo "✅ Package created"

# Get Lambda role and VPC config
LAMBDA_ROLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text)

SUBNET1=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1Id`].OutputValue' \
    --output text)

SUBNET2=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet2Id`].OutputValue' \
    --output text)

SECURITY_GROUP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaSecurityGroupId`].OutputValue' \
    --output text)

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create Lambda function
FUNCTION_NAME="${ENVIRONMENT}-model-uploader-temp"

echo "🚀 Deploying temporary Lambda function..."

aws lambda create-function \
    --function-name ${FUNCTION_NAME} \
    --runtime python3.11 \
    --role ${LAMBDA_ROLE} \
    --handler model_uploader.lambda_handler \
    --zip-file fileb://model-uploader.zip \
    --timeout 900 \
    --memory-size 2048 \
    --vpc-config SubnetIds=${SUBNET1},${SUBNET2},SecurityGroupIds=${SECURITY_GROUP} \
    --file-system-configs Arn=arn:aws:elasticfilesystem:${REGION}:${ACCOUNT_ID}:access-point/${EFS_AP},LocalMountPath=/mnt/ml-models \
    --region ${REGION} \
    --no-cli-pager > /dev/null 2>&1 || true

echo "✅ Lambda function deployed"

# Wait for function to be ready
echo "⏳ Waiting for function to be ready..."
sleep 10

# Invoke Lambda to download model
echo "📥 Downloading model to EFS (this may take 5-10 minutes)..."

aws lambda invoke \
    --function-name ${FUNCTION_NAME} \
    --payload '{"model_name":"'${MODEL_NAME}'","cache_dir":"/mnt/ml-models"}' \
    --region ${REGION} \
    /tmp/model-upload-response.json \
    --no-cli-pager > /dev/null

# Check result
if [ -f /tmp/model-upload-response.json ]; then
    cat /tmp/model-upload-response.json | python3 -m json.tool
    
    SUCCESS=$(cat /tmp/model-upload-response.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('body', '{}'))" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")
    
    if [ "$SUCCESS" = "True" ]; then
        echo ""
        echo "✅ Model uploaded successfully to EFS!"
    else
        echo ""
        echo "❌ Model upload failed"
        exit 1
    fi
fi

# Clean up temporary Lambda function
echo ""
echo "🧹 Cleaning up temporary Lambda function..."
aws lambda delete-function \
    --function-name ${FUNCTION_NAME} \
    --region ${REGION} \
    --no-cli-pager > /dev/null 2>&1 || true

echo "✅ Cleanup complete"

# Clean up local files
rm -f /tmp/model_uploader.py /tmp/requirements.txt /tmp/model-uploader.zip /tmp/model-upload-response.json
rm -rf /tmp/package

echo ""
echo "🎉 Model upload complete!"
echo ""
echo "The model is now available in EFS at: /mnt/ml-models"
echo "Lambda functions can access it via the EFS mount point"
