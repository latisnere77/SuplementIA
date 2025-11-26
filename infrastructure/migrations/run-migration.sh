#!/bin/bash
# Script to run database migrations on RDS Postgres
# Usage: ./run-migration.sh <environment> <migration-file>

set -e

ENVIRONMENT=${1:-staging}
MIGRATION_FILE=${2:-001_setup_pgvector.sql}

echo "🔧 Running migration: $MIGRATION_FILE"
echo "📍 Environment: $ENVIRONMENT"

# Get RDS endpoint from CloudFormation stack
STACK_NAME="${ENVIRONMENT}-intelligent-search"
echo "📦 Getting RDS endpoint from stack: $STACK_NAME"

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

RDS_PORT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='RDSPort'].OutputValue" \
  --output text)

if [ -z "$RDS_ENDPOINT" ]; then
  echo "❌ Error: Could not find RDS endpoint in CloudFormation stack"
  echo "💡 Make sure the stack is deployed: cd infrastructure && ./deploy-staging.sh"
  exit 1
fi

echo "✅ RDS Endpoint: $RDS_ENDPOINT:$RDS_PORT"

# Get database credentials from AWS Secrets Manager or environment
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-supplements}

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: DB_PASSWORD environment variable not set"
  echo "💡 Set it with: export DB_PASSWORD='your-password'"
  exit 1
fi

# Run migration
echo "🚀 Executing migration..."
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -p $RDS_PORT \
  -U $DB_USERNAME \
  -d postgres \
  -f $MIGRATION_FILE

echo "✅ Migration completed successfully!"

# Verify pgvector installation
echo "🔍 Verifying pgvector installation..."
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -p $RDS_PORT \
  -U $DB_USERNAME \
  -d postgres \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"

echo "🔍 Verifying supplements table..."
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -p $RDS_PORT \
  -U $DB_USERNAME \
  -d postgres \
  -c "\d supplements"

echo "✅ All verifications passed!"
