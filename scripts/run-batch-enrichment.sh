#!/bin/bash

# Script para ejecutar batch enrichment manualmente
# Útil para testing y operaciones ad-hoc

set -e

FUNCTION_NAME="batch-enricher"
REGION="us-east-1"

echo "🚀 Batch Enrichment Script"
echo "=========================="
echo ""

# Parse arguments
MODE=${1:-"popular"}
LIMIT=${2:-100}

case $MODE in
  popular)
    echo "📊 Mode: Popular supplements"
    echo "📈 Limit: $LIMIT"
    PAYLOAD="{\"mode\":\"popular\",\"limit\":$LIMIT}"
    ;;
  
  missing)
    echo "🔍 Mode: Missing cache"
    echo "📈 Limit: $LIMIT"
    PAYLOAD="{\"mode\":\"missing\",\"limit\":$LIMIT}"
    ;;
  
  manual)
    echo "✍️  Mode: Manual list"
    # Read supplements from stdin or file
    if [ -f "supplements.txt" ]; then
      SUPPLEMENTS=$(cat supplements.txt | jq -R -s -c 'split("\n") | map(select(length > 0))')
      PAYLOAD="{\"supplements\":$SUPPLEMENTS}"
    else
      echo "❌ Error: supplements.txt not found"
      echo "Create a file with one supplement per line"
      exit 1
    fi
    ;;
  
  *)
    echo "❌ Invalid mode: $MODE"
    echo ""
    echo "Usage:"
    echo "  $0 popular [limit]     # Top N popular supplements"
    echo "  $0 missing [limit]     # Supplements without cache"
    echo "  $0 manual              # Read from supplements.txt"
    echo ""
    exit 1
    ;;
esac

echo ""
echo "📦 Payload: $PAYLOAD"
echo ""
echo "⏳ Invoking Lambda..."
echo ""

# Invoke Lambda
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --payload "$PAYLOAD" \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check response
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Lambda invoked successfully"
  echo ""
  echo "📄 Response:"
  cat response.json | jq '.'
  
  # Extract metrics
  PROCESSED=$(cat response.json | jq -r '.body' | jq -r '.processed // 0')
  ERRORS=$(cat response.json | jq -r '.body' | jq -r '.errors // 0')
  DURATION=$(cat response.json | jq -r '.body' | jq -r '.duration // 0')
  
  echo ""
  echo "📊 Summary:"
  echo "  ✅ Processed: $PROCESSED"
  echo "  ❌ Errors: $ERRORS"
  echo "  ⏱️  Duration: ${DURATION}s"
  
  # Calculate cost
  COST=$(echo "$PROCESSED * 0.025" | bc)
  echo "  💰 Estimated cost: \$$COST"
  
else
  echo ""
  echo "❌ Lambda invocation failed"
  exit 1
fi

echo ""
echo "🎉 Done!"
