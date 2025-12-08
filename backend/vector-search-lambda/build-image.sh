#!/bin/bash

# Script to build the Docker container image for the vector search Lambda.

# --- Configuration ---
IMAGE_NAME="suplementia-lancedb"
IMAGE_TAG="latest"

# Get the AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Could not get AWS Account ID. Make sure you are logged in to the AWS CLI."
    exit 1
fi

# Get the AWS Region
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    echo "❌ Could not get AWS Region. Make sure it's configured in the AWS CLI."
    exit 1
fi

# Full ECR repository URI
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "🔨 Building Docker image for linux/arm64: ${ECR_REPO_URI}:${IMAGE_TAG}"
echo "---------------------------------------------------"

# Use docker buildx to build for the target architecture
docker buildx build --platform linux/arm64 -t "${ECR_REPO_URI}:${IMAGE_TAG}" . --load

if [ $? -eq 0 ]; then
  echo "✅ Docker image built successfully."
  echo "Image URI: ${ECR_REPO_URI}:${IMAGE_TAG}"
  echo "Next step: Run the push-to-ecr.sh script to upload it."
else
  echo "❌ Docker image build failed."
fi
