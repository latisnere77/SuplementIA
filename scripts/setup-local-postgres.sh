#!/bin/bash

# Setup Local Postgres with pgvector for Testing
# This script sets up a local Postgres database for migration testing

echo "🚀 Setting up local Postgres with pgvector..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Stop and remove existing container if it exists
echo "Cleaning up existing container..."
docker stop supplements-postgres 2>/dev/null || true
docker rm supplements-postgres 2>/dev/null || true

# Start Postgres with pgvector
echo "Starting Postgres container with pgvector..."
docker run -d \
  --name supplements-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=supplements \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Wait for Postgres to be ready
echo "Waiting for Postgres to be ready..."
sleep 5

# Test connection
echo "Testing connection..."
docker exec supplements-postgres psql -U postgres -d supplements -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Postgres is ready!"
  echo ""
  echo "Connection details:"
  echo "  Host: localhost"
  echo "  Port: 5432"
  echo "  Database: supplements"
  echo "  User: postgres"
  echo "  Password: postgres"
  echo ""
  echo "To connect: psql -h localhost -U postgres -d supplements"
  echo "To stop: docker stop supplements-postgres"
  echo "To remove: docker rm supplements-postgres"
else
  echo "❌ Failed to connect to Postgres"
  exit 1
fi
