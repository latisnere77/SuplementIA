#!/bin/bash
set -e
cd /Users/latisnere/documents/suplementia/backend/lambda
echo "🚀 Converting Lambda to ZIP deployment..."
rm -rf deployment && mkdir -p deployment && cd deployment
echo "📦 Installing dependencies..."
pip3 install --target . requests==2.31.0
echo "📁 Copying Lambda code..."
cp ../lambda_function.py . && cp ../query_validator.py .
echo "🗜️  Creating ZIP package..."
zip -r lambda-package.zip .
echo "🔄 Converting Lambda to ZIP package type..."
aws lambda update-function-configuration --function-name ankosoft-formulation-api --package-type Zip --runtime python3.11 --handler lambda_function.lambda_handler --region us-east-1 --no-cli-pager
echo "⏳ Waiting for Lambda to be ready..."
sleep 30
echo "⬆️  Uploading code..."
aws lambda update-function-code --function-name ankosoft-formulation-api --zip-file fileb://lambda-package.zip --region us-east-1 --no-cli-pager
echo "✅ Done!"
