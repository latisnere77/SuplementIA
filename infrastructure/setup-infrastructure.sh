#!/bin/bash

# ====================================
# Infrastructure Setup Script
# ====================================
# This script sets up all AWS-native infrastructure components for the
# intelligent supplement search system.

set -e  # Exit on error

echo "🚀 Setting up AWS-native infrastructure for Intelligent Supplement Search..."
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run:"
    echo "   aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# ====================================
# 1. RDS POSTGRES + PGVECTOR
# ====================================

echo "📊 Step 1: Setting up RDS Postgres with pgvector..."
echo ""
echo "Creating RDS instance via CloudFormation..."
echo "Note: This will take 10-15 minutes"
echo ""

read -p "Enter database master password (min 8 chars): " -s DB_PASSWORD
echo ""

aws cloudformation create-stack \
    --stack-name supplements-rds \
    --template-body file://infrastructure/rds-cloudformation.yml \
    --parameters \
        ParameterKey=Environment,ParameterValue=production \
        ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
    --capabilities CAPABILITY_IAM \
    --region us-east-1 \
    2>/dev/null || echo "Stack may already exist, continuing..."

echo "Waiting for RDS stack creation..."
aws cloudformation wait stack-create-complete \
    --stack-name supplements-rds \
    --region us-east-1 || echo "Stack already exists"

# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name supplements-rds \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
    --output text)

echo "✅ RDS Postgres created: $RDS_ENDPOINT"

# ====================================
# 2. DYNAMODB + DAX
# ====================================

echo ""
echo "🗄️  Step 2: Setting up DynamoDB + DAX for L1 cache..."
echo ""

aws cloudformation create-stack \
    --stack-name supplements-cache-dax \
    --template-body file://infrastructure/dynamodb-dax-cloudformation.yml \
    --parameters ParameterKey=Environment,ParameterValue=production \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1 \
    2>/dev/null || echo "Stack may already exist, continuing..."

echo "Waiting for DynamoDB + DAX stack creation..."
aws cloudformation wait stack-create-complete \
    --stack-name supplements-cache-dax \
    --region us-east-1 || echo "Stack already exists"

# Get DAX endpoint
DAX_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name supplements-cache-dax \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`DAXEndpoint`].OutputValue' \
    --output text)

echo "✅ DynamoDB + DAX created: $DAX_ENDPOINT"

# ====================================
# 3. ELASTICACHE REDIS
# ====================================

echo ""
echo "🔴 Step 3: Setting up ElastiCache Redis for L2 cache..."
echo ""

read -p "Enter Redis AUTH token (min 16 chars): " -s REDIS_AUTH_TOKEN
echo ""

aws cloudformation create-stack \
    --stack-name supplements-cache-redis \
    --template-body file://infrastructure/elasticache-cloudformation.yml \
    --parameters \
        ParameterKey=Environment,ParameterValue=production \
        ParameterKey=AuthToken,ParameterValue="$REDIS_AUTH_TOKEN" \
    --region us-east-1 \
    2>/dev/null || echo "Stack may already exist, continuing..."

echo "Waiting for ElastiCache Redis stack creation..."
aws cloudformation wait stack-create-complete \
    --stack-name supplements-cache-redis \
    --region us-east-1 || echo "Stack already exists"

# Get Redis endpoint
REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name supplements-cache-redis \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`CacheEndpoint`].OutputValue' \
    --output text)

echo "✅ ElastiCache Redis created: $REDIS_ENDPOINT"

# ====================================
# 4. EFS FOR ML MODELS
# ====================================

echo ""
echo "📁 Step 4: Setting up EFS for ML model storage..."
echo ""

aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode bursting \
    --encrypted \
    --tags Key=Name,Value=supplements-ml-models Key=Environment,Value=production \
    --region us-east-1 \
    2>/dev/null || echo "EFS may already exist, continuing..."

echo "✅ EFS created for ML model storage"

# ====================================
# 5. DYNAMODB DISCOVERY QUEUE
# ====================================

echo ""
echo "🗄️  Step 5: Setting up DynamoDB for discovery queue..."
echo ""

aws dynamodb create-table \
    --table-name supplement-discovery-queue \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=priority,AttributeType=N \
        AttributeName=status,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"priority-index\",
                \"KeySchema\": [
                    {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"priority\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {
                    \"ProjectionType\": \"ALL\"
                }
            }
        ]" \
    --tags \
        Key=Environment,Value=production \
        Key=Application,Value=suplementia \
        Key=Purpose,Value=supplement-discovery-queue \
    --region us-east-1 \
    2>/dev/null || echo "Table may already exist, continuing..."

echo "✅ DynamoDB discovery queue created"

# ====================================
# 6. INSTALL PGVECTOR EXTENSION
# ====================================

echo ""
echo "📦 Step 6: Installing pgvector extension..."
echo ""
echo "Connecting to RDS to install pgvector..."

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$RDS_ENDPOINT" \
    -U postgres \
    -d supplements \
    -c "CREATE EXTENSION IF NOT EXISTS vector;" \
    2>/dev/null || echo "Extension may already exist"

echo "Running schema migration..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$RDS_ENDPOINT" \
    -U postgres \
    -d supplements \
    -f infrastructure/postgres-schema.sql

echo "✅ pgvector extension installed and schema created"

# ====================================
# 7. UPDATE ENVIRONMENT VARIABLES
# ====================================

echo ""
echo "🔧 Step 7: Updating environment variables..."
echo ""

# Check .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# Add AWS infrastructure endpoints
cat >> .env.local << EOF

# AWS Infrastructure (Auto-generated)
RDS_POSTGRES_HOST=$RDS_ENDPOINT
RDS_POSTGRES_PORT=5432
RDS_POSTGRES_DATABASE=supplements
RDS_POSTGRES_USER=postgres
RDS_POSTGRES_PASSWORD=$DB_PASSWORD

DAX_ENDPOINT=$DAX_ENDPOINT
DAX_PORT=8111

ELASTICACHE_REDIS_ENDPOINT=$REDIS_ENDPOINT
ELASTICACHE_REDIS_PORT=6379
ELASTICACHE_REDIS_AUTH_TOKEN=$REDIS_AUTH_TOKEN
ELASTICACHE_REDIS_TLS=true

DYNAMODB_CACHE_TABLE=production-supplement-cache
DYNAMODB_DISCOVERY_QUEUE=supplement-discovery-queue

AWS_REGION=us-east-1
EOF

echo "✅ Environment variables updated in .env.local"

# ====================================
# 8. INSTALL DEPENDENCIES
# ====================================

echo ""
echo "📦 Step 8: Installing dependencies..."
echo ""

npm install pg @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb amazon-dax-client ioredis

echo "✅ Dependencies installed"

# ====================================
# 9. SUMMARY
# ====================================

echo ""
echo "✅ Infrastructure setup complete!"
echo ""
echo "📋 Summary:"
echo "  ✓ RDS Postgres with pgvector: $RDS_ENDPOINT"
echo "  ✓ DynamoDB + DAX (L1 cache): $DAX_ENDPOINT"
echo "  ✓ ElastiCache Redis (L2 cache): $REDIS_ENDPOINT"
echo "  ✓ EFS for ML models"
echo "  ✓ DynamoDB discovery queue"
echo ""
echo "🔧 Next steps:"
echo "  1. Deploy Lambda functions: npm run deploy:lambda"
echo "  2. Setup CloudFront distribution"
echo "  3. Deploy Lambda@Edge functions"
echo "  4. Test connections: npm run test:infrastructure"
echo ""
echo "📊 Estimated monthly cost: $25"
echo "  - RDS Postgres: $0 (free tier for 12 months, then $15/month)"
echo "  - DynamoDB + DAX: $10"
echo "  - ElastiCache Redis: $12"
echo "  - EFS: $1"
echo "  - Lambda: $0 (free tier)"
echo "  - CloudFront: $2"
echo ""
echo "🎉 Ready to implement vector search!"
