#!/bin/bash

# Deploy Content Enricher Lambda with optimizations
# Phase 1: Quick wins - Switch to Haiku + Study Summarization

set -e

echo "🚀 Deploying Content Enricher Lambda (Optimized)"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from content-enricher directory"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "❌ Error: Build failed - dist directory not found"
  exit 1
fi

# Get Lambda function name from environment or use default
FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-"suplementia-content-enricher-dev"}

echo ""
echo "📤 Deploying to Lambda: $FUNCTION_NAME"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../deployment.zip . -q
cd ..

# Add node_modules to package
echo "📦 Adding node_modules..."
cd node_modules
zip -r ../deployment.zip . -q -x "*/test/*" -x "*/tests/*" -x "*/.bin/*"
cd ..

# Update Lambda function
echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://deployment.zip \
  --region us-east-1

# Wait for update to complete
echo "⏳ Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region us-east-1

# Update environment variables
echo "⚙️  Updating environment variables..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={
    BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0,
    MAX_TOKENS=3000,
    TEMPERATURE=0.3,
    USE_TOOL_API=true,
    XRAY_ENABLED=true
  }" \
  --timeout 30 \
  --memory-size 1024 \
  --region us-east-1

# Wait for configuration update
echo "⏳ Waiting for configuration update..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region us-east-1

# Clean up
echo "🧹 Cleaning up..."
rm deployment.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Configuration:"
echo "  - Model: Claude 3.5 Haiku"
echo "  - Max Tokens: 3000"
echo "  - Timeout: 30 seconds"
echo "  - Memory: 1024 MB"
echo "  - Study Summarization: Enabled"
echo ""
echo "🧪 Test the deployment:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"supplementId\":\"vitamin d\"}' response.json"
echo ""
