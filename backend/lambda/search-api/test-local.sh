#!/bin/bash

# Test optimized Lambda function locally

set -e

echo "🧪 Testing Optimized Lambda Function Locally"
echo ""

# Build Docker image
echo "Building ARM64 image..."
docker buildx build --platform linux/arm64 -t search-api-test:arm64 -f Dockerfile.arm64 .

echo ""
echo "✓ Image built successfully"
echo ""

# Run container
echo "Starting container..."
docker run --rm -p 9000:8080 search-api-test:arm64 &
CONTAINER_PID=$!

# Wait for container to start
sleep 3

echo ""
echo "Testing Lambda function..."
echo ""

# Test 1: Valid query
echo "Test 1: Valid query"
curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d '{
        "queryStringParameters": {
            "q": "vitamin d"
        }
    }' | jq '.'

echo ""
echo ""

# Test 2: Missing query
echo "Test 2: Missing query parameter"
curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d '{}' | jq '.'

echo ""
echo ""

# Test 3: Long query
echo "Test 3: Query too long"
curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d '{
        "queryStringParameters": {
            "q": "'$(python3 -c 'print("a" * 201)')'"
        }
    }' | jq '.'

# Stop container
kill $CONTAINER_PID 2>/dev/null || true

echo ""
echo "✓ Tests completed"
