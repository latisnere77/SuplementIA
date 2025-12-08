#!/bin/bash
# Deploy content-enricher Lambda with 120s timeout fix

set -e

echo "🚀 Deploying content-enricher Lambda with 120s timeout..."
echo ""

cd "$(dirname "$0")"

# Build
echo "📦 Building Lambda..."
npm run build

# Package
echo "📦 Packaging Lambda..."
sam build --template-file template.yaml

# Deploy
echo "🚀 Deploying to AWS..."
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name content-enricher-stack \
  --capabilities CAPABILITY_IAM \
  --region us-east-1 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Verify timeout:"
echo "aws lambda get-function-configuration --function-name ContentEnricherFunction --region us-east-1 --query 'Timeout'"
