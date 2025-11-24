#!/bin/bash

# Test directo del Lambda usando AWS CLI
# Para diagnosticar el error "Cannot access 'P' before initialization"

echo "🧪 Testing Lambda: suplementia-content-enricher-dev"
echo ""

# Crear payload
cat > /tmp/lambda-test-payload.json << 'EOF'
{
  "supplementName": "ashwagandha",
  "studies": [
    {
      "pmid": "12345",
      "title": "Test study on ashwagandha",
      "abstract": "This is a test abstract about ashwagandha benefits.",
      "authors": ["Smith J"],
      "journal": "Test Journal",
      "year": 2023,
      "relevanceScore": 0.9
    }
  ]
}
EOF

echo "📤 Payload:"
cat /tmp/lambda-test-payload.json
echo ""
echo ""
echo "⏳ Invocando Lambda..."
echo ""

# Invocar Lambda con logs
aws lambda invoke \
  --function-name suplementia-content-enricher-dev \
  --payload file:///tmp/lambda-test-payload.json \
  --log-type Tail \
  --query 'LogResult' \
  --output text \
  /tmp/lambda-response.json | base64 --decode

echo ""
echo ""
echo "📋 RESPUESTA:"
echo "─────────────────────────────────────────────────────────────────────────────"
cat /tmp/lambda-response.json | jq '.' 2>/dev/null || cat /tmp/lambda-response.json
echo ""
echo "─────────────────────────────────────────────────────────────────────────────"

# Cleanup
rm -f /tmp/lambda-test-payload.json /tmp/lambda-response.json
