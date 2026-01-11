#!/bin/bash

# Deploy Optimized CloudFormation Stack
# Removes Redis, enables ARM64, reduces costs by 79%

set -e

STACK_NAME="production-intelligent-search"
TEMPLATE_FILE="infrastructure/cloudformation/intelligent-search-production-optimized.yml"
REGION="us-east-1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🚀 Deploying Optimized Infrastructure${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Stack: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo "Region: $REGION"
echo ""
echo -e "${GREEN}Optimizations:${NC}"
echo "  ✅ Redis removed ($37.96/mes saved)"
echo "  ✅ DynamoDB as primary cache ($0.39/mes)"
echo "  ✅ ARM64 Lambda ready (20% cost reduction)"
echo "  ✅ Logs retention: 3 days ($2/mes saved)"
echo "  ✅ RDS Single-AZ ($12.29/mes saved)"
echo ""
echo -e "${YELLOW}Total savings: ~$52-60/mes (79% reduction)${NC}"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}❌ Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Get DB password from Parameter Store or prompt
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Retrieving RDS password..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_PASSWORD=$(aws ssm get-parameter \
    --name "/suplementia/rds/password" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text \
    --region $REGION 2>/dev/null || echo "")

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠ Password not found in Parameter Store${NC}"
    read -sp "Enter RDS password: " DB_PASSWORD
    echo ""
fi

# Validate template
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Validating CloudFormation template..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws cloudformation validate-template \
    --template-body file://$TEMPLATE_FILE \
    --region $REGION > /dev/null

echo -e "${GREEN}✓ Template is valid${NC}"

# Check if stack exists
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking stack status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_EXISTS" = "DOES_NOT_EXIST" ]; then
    ACTION="create"
    CHANGE_SET_TYPE="CREATE"
    echo -e "${YELLOW}Stack does not exist. Will create new stack.${NC}"
else
    ACTION="update"
    CHANGE_SET_TYPE="UPDATE"
    echo -e "${BLUE}Stack exists with status: $STACK_EXISTS${NC}"
    echo -e "${YELLOW}Will update existing stack.${NC}"
fi

# Create change set
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Creating change set..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CHANGE_SET_NAME="optimize-$(date +%Y%m%d-%H%M%S)"

aws cloudformation create-change-set \
    --stack-name $STACK_NAME \
    --change-set-name $CHANGE_SET_NAME \
    --change-set-type $CHANGE_SET_TYPE \
    --template-body file://$TEMPLATE_FILE \
    --parameters \
        ParameterKey=Environment,ParameterValue=production \
        ParameterKey=DBUsername,ParameterValue=postgres \
        ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

echo -e "${GREEN}✓ Change set created: $CHANGE_SET_NAME${NC}"

# Wait for change set to be created
echo ""
echo "⏳ Waiting for change set to be ready..."
aws cloudformation wait change-set-create-complete \
    --stack-name $STACK_NAME \
    --change-set-name $CHANGE_SET_NAME \
    --region $REGION

# Describe changes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Reviewing changes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CHANGES=$(aws cloudformation describe-change-set \
    --stack-name $STACK_NAME \
    --change-set-name $CHANGE_SET_NAME \
    --region $REGION \
    --query 'Changes[*].[ResourceChange.Action,ResourceChange.LogicalResourceId,ResourceChange.ResourceType]' \
    --output table)

echo "$CHANGES"

# Confirm execution
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  IMPORTANT CHANGES:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will:"
echo "  - Remove Redis cluster and related resources"
echo "  - Update DynamoDB tables with GSI for caching"
echo "  - Update Lambda IAM roles (remove Redis permissions)"
echo "  - Change log retention to 3 days"
echo "  - Convert RDS to Single-AZ (if Multi-AZ)"
echo ""
echo -e "${RED}Resources to be DELETED:${NC}"
echo "  - RedisCluster"
echo "  - RedisSecurityGroup"
echo "  - RedisSubnetGroup"
echo ""

read -p "Do you want to execute this change set? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo ""
    echo -e "${YELLOW}Deployment cancelled. Change set preserved for review.${NC}"
    echo ""
    echo "To review later:"
    echo "  aws cloudformation describe-change-set \\"
    echo "    --stack-name $STACK_NAME \\"
    echo "    --change-set-name $CHANGE_SET_NAME \\"
    echo "    --region $REGION"
    echo ""
    echo "To execute later:"
    echo "  aws cloudformation execute-change-set \\"
    echo "    --stack-name $STACK_NAME \\"
    echo "    --change-set-name $CHANGE_SET_NAME \\"
    echo "    --region $REGION"
    exit 0
fi

# Execute change set
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Executing change set..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws cloudformation execute-change-set \
    --stack-name $STACK_NAME \
    --change-set-name $CHANGE_SET_NAME \
    --region $REGION

echo -e "${GREEN}✓ Change set execution started${NC}"

# Monitor progress
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Monitoring deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ This may take 10-15 minutes..."
echo ""

if [ "$ACTION" = "create" ]; then
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $REGION
else
    aws cloudformation wait stack-update-complete \
        --stack-name $STACK_NAME \
        --region $REGION
fi

# Get outputs
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output table)

echo "$OUTPUTS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Deploy optimized Lambda functions:"
echo "   ./infrastructure/scripts/deploy-optimized-lambdas.sh"
echo ""
echo "2. Run smoke tests:"
echo "   ./infrastructure/scripts/smoke-tests-optimized.sh"
echo ""
echo "3. Monitor metrics for 24 hours"
echo ""
echo "4. Review cost savings in AWS Cost Explorer"
echo ""
echo -e "${GREEN}Expected monthly savings: $52-60 (79% reduction)${NC}"
