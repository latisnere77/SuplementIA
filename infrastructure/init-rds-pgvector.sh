#!/bin/bash

# Initialize RDS Postgres with pgvector extension
# This script must be run after the CloudFormation stack is deployed

set -e

ENVIRONMENT="${1:-staging}"
STACK_NAME="${ENVIRONMENT}-intelligent-search"
REGION="${AWS_REGION:-us-east-1}"

echo "🔧 Initializing RDS Postgres with pgvector extension"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Stack: ${STACK_NAME}"
echo ""

# Get RDS endpoint from CloudFormation outputs
echo "📡 Fetching RDS endpoint..."
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
    --output text)

RDS_PORT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RDSPort`].OutputValue' \
    --output text)

if [ -z "${RDS_ENDPOINT}" ]; then
    echo "❌ Could not fetch RDS endpoint from stack outputs"
    exit 1
fi

echo "✅ RDS Endpoint: ${RDS_ENDPOINT}:${RDS_PORT}"
echo ""

# Prompt for database credentials
echo "📝 Please enter the RDS master username (default: postgres):"
read DB_USERNAME
DB_USERNAME=${DB_USERNAME:-postgres}

echo "📝 Please enter the RDS master password:"
read -s DB_PASSWORD
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed. Please install PostgreSQL client first."
    echo ""
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Create SQL initialization script
cat > /tmp/init-pgvector.sql << 'EOF'
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create supplements table
CREATE TABLE IF NOT EXISTS supplements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT,
  common_names TEXT[],
  embedding vector(384),
  metadata JSONB,
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS supplements_embedding_idx 
ON supplements 
USING hnsw (embedding vector_cosine_ops);

-- Create index on search_count for analytics
CREATE INDEX IF NOT EXISTS supplements_search_count_idx 
ON supplements (search_count DESC);

-- Create index on name for exact lookups
CREATE INDEX IF NOT EXISTS supplements_name_idx 
ON supplements (name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_supplements_updated_at ON supplements;
CREATE TRIGGER update_supplements_updated_at 
BEFORE UPDATE ON supplements 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Verify pgvector is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Show table structure
\d supplements

EOF

echo "🔧 Connecting to RDS and initializing database..."
echo ""

# Execute SQL script
PGPASSWORD=${DB_PASSWORD} psql \
    -h ${RDS_ENDPOINT} \
    -p ${RDS_PORT} \
    -U ${DB_USERNAME} \
    -d postgres \
    -f /tmp/init-pgvector.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database initialization successful!"
    echo ""
    echo "📊 pgvector extension enabled"
    echo "📊 supplements table created"
    echo "📊 HNSW index created for vector search"
    echo "📊 Indexes created for performance"
    echo ""
    
    # Clean up
    rm /tmp/init-pgvector.sql
    
    echo "🎉 RDS initialization complete!"
else
    echo ""
    echo "❌ Database initialization failed"
    rm /tmp/init-pgvector.sql
    exit 1
fi
