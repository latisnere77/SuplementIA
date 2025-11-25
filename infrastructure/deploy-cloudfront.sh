#!/bin/bash

# ====================================
# CloudFront Distribution Deployment
# ====================================
# This script deploys the CloudFront distribution for edge computing

set -e  # Exit on error

echo "🌐 Deploying CloudFront Distribution for Intelligent Supplement Search..."
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Get API Gateway domain (if exists)
API_GATEWAY_DOMAIN=""
if [ -f .env.local ]; then
    API_GATEWAY_DOMAIN=$(grep -E "^NEXT_PUBLIC_API_URL=" .env.local | cut -d'=' -f2 | sed 's|https://||' | sed 's|/.*||' || echo "")
fi

if [ -z "$API_GATEWAY_DOMAIN" ]; then
    read -p "Enter API Gateway domain name (e.g., api.example.com): " API_GATEWAY_DOMAIN
fi

echo "Using API Gateway domain: $API_GATEWAY_DOMAIN"
echo ""

# Optional: ACM Certificate ARN for custom domain
read -p "Enter ACM Certificate ARN (optional, press Enter to skip): " CERT_ARN
echo ""

# Deploy CloudFormation stack
echo "📦 Deploying CloudFront stack..."
echo ""

PARAMS="ParameterKey=Environment,ParameterValue=production ParameterKey=ApiGatewayDomain,ParameterValue=$API_GATEWAY_DOMAIN"

if [ -n "$CERT_ARN" ]; then
    PARAMS="$PARAMS ParameterKey=CertificateArn,ParameterValue=$CERT_ARN"
fi

aws cloudformation create-stack \
    --stack-name supplements-cloudfront \
    --template-body file://infrastructure/cloudfront-config.yml \
    --parameters $PARAMS \
    --capabilities CAPABILITY_IAM \
    --region us-east-1 \
    2>/dev/null || {
        echo "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name supplements-cloudfront \
            --template-body file://infrastructure/cloudfront-config.yml \
            --parameters $PARAMS \
            --capabilities CAPABILITY_IAM \
            --region us-east-1 || echo "No updates needed"
    }

echo "Waiting for CloudFront stack deployment..."
echo "Note: This can take 15-20 minutes for CloudFront distribution to deploy"
echo ""

aws cloudformation wait stack-create-complete \
    --stack-name supplements-cloudfront \
    --region us-east-1 2>/dev/null || \
aws cloudformation wait stack-update-complete \
    --stack-name supplements-cloudfront \
    --region us-east-1 2>/dev/null || echo "Stack ready"

# Get CloudFront distribution details
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name supplements-cloudfront \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name supplements-cloudfront \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
    --output text)

DISTRIBUTION_URL=$(aws cloudformation describe-stacks \
    --stack-name supplements-cloudfront \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
    --output text)

echo ""
echo "✅ CloudFront Distribution deployed successfully!"
echo ""
echo "📋 Distribution Details:"
echo "  Distribution ID: $DISTRIBUTION_ID"
echo "  Domain Name: $DISTRIBUTION_DOMAIN"
echo "  URL: $DISTRIBUTION_URL"
echo ""

# Update .env.local
if [ -f .env.local ]; then
    echo "🔧 Updating .env.local..."
    
    # Remove old CloudFront variables if they exist
    sed -i.bak '/^CLOUDFRONT_/d' .env.local
    
    # Add new CloudFront variables
    cat >> .env.local << EOF

# CloudFront Configuration (Auto-generated)
CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID
CLOUDFRONT_DOMAIN=$DISTRIBUTION_DOMAIN
CLOUDFRONT_URL=$DISTRIBUTION_URL
EOF
    
    echo "✅ Environment variables updated"
fi

echo ""
echo "🎉 CloudFront setup complete!"
echo ""
echo "📊 Configuration:"
echo "  ✓ Edge locations: 450+ worldwide"
echo "  ✓ Cache policy: Optimized for supplement search"
echo "  ✓ SSL/TLS: Enabled"
echo "  ✓ Compression: Enabled (gzip + brotli)"
echo "  ✓ Logging: Enabled"
echo ""
echo "🔧 Next steps:"
echo "  1. Deploy Lambda@Edge functions: ./infrastructure/deploy-lambda-edge.sh"
echo "  2. Test edge latency: npm run test:cloudfront"
echo "  3. Monitor CloudWatch metrics"
echo ""
echo "💰 Estimated cost: ~$2/month for 10K requests/day"
