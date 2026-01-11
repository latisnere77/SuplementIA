#!/bin/bash

# SuplementIA - Pre-Deployment Validation
# Run this before deploying to catch issues early

set -e

ENVIRONMENT=${1:-production}
REGION="us-east-1"

echo "=========================================="
echo "SuplementIA - Pre-Deployment Check"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo "✓ $1 installed"
        return 0
    else
        echo "✗ $1 NOT installed"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check AWS permission
check_aws_permission() {
    local service=$1
    local action=$2
    
    if aws $service $action --dry-run 2>&1 | grep -q "DryRunOperation\|authorized"; then
        echo "✓ AWS $service:$action permission"
        return 0
    else
        echo "✗ AWS $service:$action permission MISSING"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo "1. Checking Prerequisites"
echo "----------------------------------------"

# Check required commands
check_command "aws"
check_command "python3"
check_command "jq"
check_command "bc"
check_command "make"

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if (( $(echo "$PYTHON_VERSION >= 3.11" | bc -l) )); then
    echo "✓ Python version $PYTHON_VERSION (>= 3.11)"
else
    echo "⚠ Python version $PYTHON_VERSION (< 3.11 recommended)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

echo "2. Checking AWS Configuration"
echo "----------------------------------------"

# Check AWS credentials
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "✓ AWS credentials configured"
    echo "  Account: $ACCOUNT_ID"
    echo "  User: $USER_ARN"
else
    echo "✗ AWS credentials NOT configured"
    ERRORS=$((ERRORS + 1))
fi

# Check default region
DEFAULT_REGION=$(aws configure get region)
if [ "$DEFAULT_REGION" = "$REGION" ]; then
    echo "✓ Default region: $DEFAULT_REGION"
else
    echo "⚠ Default region: $DEFAULT_REGION (expected: $REGION)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

echo "3. Checking AWS Permissions"
echo "----------------------------------------"

# Check CloudFormation permissions
if aws cloudformation list-stacks --region $REGION &> /dev/null; then
    echo "✓ CloudFormation permissions"
else
    echo "✗ CloudFormation permissions MISSING"
    ERRORS=$((ERRORS + 1))
fi

# Check Lambda permissions
if aws lambda list-functions --region $REGION &> /dev/null; then
    echo "✓ Lambda permissions"
else
    echo "✗ Lambda permissions MISSING"
    ERRORS=$((ERRORS + 1))
fi

# Check DynamoDB permissions
if aws dynamodb list-tables --region $REGION &> /dev/null; then
    echo "✓ DynamoDB permissions"
else
    echo "✗ DynamoDB permissions MISSING"
    ERRORS=$((ERRORS + 1))
fi

# Check EFS permissions
if aws efs describe-file-systems --region $REGION &> /dev/null; then
    echo "✓ EFS permissions"
else
    echo "✗ EFS permissions MISSING"
    ERRORS=$((ERRORS + 1))
fi

echo ""

echo "4. Checking Existing Resources"
echo "----------------------------------------"

# Check if stack already exists
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lancedb" \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
    echo "✓ Stack does not exist (ready for new deployment)"
elif [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
    echo "⚠ Stack already exists with status: $STACK_STATUS"
    echo "  This will be an UPDATE operation"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✗ Stack exists with problematic status: $STACK_STATUS"
    ERRORS=$((ERRORS + 1))
fi

echo ""

echo "5. Checking Local Files"
echo "----------------------------------------"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Check CloudFormation template
if [ -f "$PROJECT_ROOT/infrastructure/cloudformation/lancedb-stack.yml" ]; then
    echo "✓ CloudFormation template exists"
    
    # Validate template
    if aws cloudformation validate-template \
        --template-body file://$PROJECT_ROOT/infrastructure/cloudformation/lancedb-stack.yml \
        --region $REGION &> /dev/null; then
        echo "✓ CloudFormation template valid"
    else
        echo "✗ CloudFormation template INVALID"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "✗ CloudFormation template NOT found"
    ERRORS=$((ERRORS + 1))
fi

# Check Lambda functions
if [ -f "$PROJECT_ROOT/backend/lambda/search-api-lancedb/lambda_function.py" ]; then
    echo "✓ Search API Lambda exists"
else
    echo "✗ Search API Lambda NOT found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/backend/lambda/discovery-worker-lancedb/lambda_function.py" ]; then
    echo "✓ Discovery Worker Lambda exists"
else
    echo "✗ Discovery Worker Lambda NOT found"
    ERRORS=$((ERRORS + 1))
fi

# Check scripts
if [ -f "$PROJECT_ROOT/backend/scripts/migrate-to-lancedb.py" ]; then
    echo "✓ Migration script exists"
else
    echo "✗ Migration script NOT found"
    ERRORS=$((ERRORS + 1))
fi

echo ""

echo "6. Checking Python Dependencies"
echo "----------------------------------------"

# Check if required Python packages are available
REQUIRED_PACKAGES=("lancedb" "sentence-transformers" "boto3")

for package in "${REQUIRED_PACKAGES[@]}"; do
    if python3 -c "import $package" 2>/dev/null; then
        echo "✓ Python package: $package"
    else
        echo "⚠ Python package: $package NOT installed (will be installed in Lambda)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

echo "7. Checking Cost Budget"
echo "----------------------------------------"

# Check if budget exists
BUDGET_EXISTS=$(aws budgets describe-budgets \
    --account-id $ACCOUNT_ID 2>/dev/null | jq -r '.Budgets[] | select(.BudgetName | contains("suplementia")) | .BudgetName' || echo "")

if [ -n "$BUDGET_EXISTS" ]; then
    echo "✓ Budget configured: $BUDGET_EXISTS"
else
    echo "⚠ No budget configured (recommended to set up)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

echo "8. Checking Alert Configuration"
echo "----------------------------------------"

# Check if SNS topic exists
SNS_TOPIC=$(aws sns list-topics --region $REGION 2>/dev/null | \
    jq -r '.Topics[] | select(.TopicArn | contains("suplementia")) | .TopicArn' || echo "")

if [ -n "$SNS_TOPIC" ]; then
    echo "✓ SNS topic exists: $SNS_TOPIC"
else
    echo "⚠ No SNS topic found (will be created during deployment)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

echo "=========================================="
echo "Pre-Deployment Check Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "Ready to deploy:"
    echo "  cd infrastructure"
    echo "  make deploy-$ENVIRONMENT"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS warning(s) found"
    echo ""
    echo "Deployment can proceed, but review warnings above."
    echo ""
    read -p "Continue with deployment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Proceeding with deployment..."
        exit 0
    else
        echo "Deployment cancelled."
        exit 1
    fi
else
    echo "❌ $ERRORS error(s) and $WARNINGS warning(s) found"
    echo ""
    echo "Please fix errors above before deploying."
    echo ""
    exit 1
fi
