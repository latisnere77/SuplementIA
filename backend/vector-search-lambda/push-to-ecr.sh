#!/bin/bash

# Script to push the Docker image to Amazon ECR.
# Prerequisite: The build-image.sh script must be run first.

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
FULL_IMAGE_NAME="${ECR_REPO_URI}:${IMAGE_TAG}"

echo "🚀 Pushing image to ECR: ${FULL_IMAGE_NAME}"
echo "---------------------------------------------------"

# 1. Authenticate Docker to the Amazon ECR registry
echo "🔐 Authenticating Docker with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

if [ $? -ne 0 ]; then
    echo "❌ ECR login failed."
    exit 1
fi
echo "✅ Authentication successful."

# 2. Create the ECR repository if it doesn't exist
echo "🔍 Checking for ECR repository: ${IMAGE_NAME}"
aws ecr describe-repositories --repository-names "${IMAGE_NAME}" --region ${AWS_REGION} > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Repository not found. Creating it..."
    aws ecr create-repository \
        --repository-name "${IMAGE_NAME}" \
        --image-scanning-configuration scanOnPush=true \
        --region ${AWS_REGION}
    echo "✅ Repository created."
else
    echo "✅ Repository already exists."
fi

# 3. Push the Docker image to ECR
echo "⏫ Pushing image..."
docker push "${FULL_IMAGE_NAME}"

if [ $? -eq 0 ]; then
  echo "✅ Image pushed successfully to ${FULL_IMAGE_NAME}"
  echo "You can now deploy the CloudFormation stack."
else
  echo "❌ Image push failed."
  exit 1
fi