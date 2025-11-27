#!/bin/bash
set -e

# Build Lambda Layer for LanceDB dependencies
# This creates a layer with lancedb, sentence-transformers, and dependencies

LAYER_NAME="lancedb-dependencies"
PYTHON_VERSION="python3.11"
REGION="us-east-1"

echo "=========================================="
echo "Building Lambda Layer: $LAYER_NAME"
echo "=========================================="

# Create layer directory structure
rm -rf layer
mkdir -p layer/python

# Install dependencies
echo "Installing dependencies..."
pip3 install \
  --target layer/python \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  lancedb sentence-transformers

# Create ZIP
echo "Creating layer package..."
cd layer
zip -r ../lancedb-layer.zip . -q
cd ..

LAYER_SIZE=$(du -h lancedb-layer.zip | cut -f1)
echo "Layer size: $LAYER_SIZE"

# Publish layer
echo "Publishing layer to AWS..."
LAYER_VERSION=$(aws lambda publish-layer-version \
  --layer-name "$LAYER_NAME" \
  --description "LanceDB and Sentence Transformers for ARM64" \
  --zip-file fileb://lancedb-layer.zip \
  --compatible-runtimes python3.11 \
  --compatible-architectures arm64 \
  --region "$REGION" \
  --query 'Version' \
  --output text)

echo "✓ Layer published: $LAYER_NAME version $LAYER_VERSION"

# Get Layer ARN
LAYER_ARN=$(aws lambda list-layer-versions \
  --layer-name "$LAYER_NAME" \
  --region "$REGION" \
  --query 'LayerVersions[0].LayerVersionArn' \
  --output text)

echo "Layer ARN: $LAYER_ARN"

# Cleanup
rm -rf layer lancedb-layer.zip

echo "=========================================="
echo "✅ Layer build complete!"
echo "=========================================="
echo ""
echo "To use this layer, add to Lambda function:"
echo "  aws lambda update-function-configuration \\"
echo "    --function-name YOUR_FUNCTION \\"
echo "    --layers $LAYER_ARN"
