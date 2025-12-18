#!/bin/bash
# Clear all DynamoDB cache - fastest approach for 164 items

set -e

TABLE_NAME="suplementia-content-enricher-cache"
REGION="us-east-1"

echo "🗑️  WARNING: This will delete ALL items from $TABLE_NAME"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo "🔍 Scanning table..."

# Scan and delete all items
aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --attributes-to-get "supplementId" \
    --output json | \
jq -r '.Items[].supplementId.S' | \
while read -r supplementId; do
    echo "🗑️  Deleting: $supplementId"
    aws dynamodb delete-item \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --key "{\"supplementId\": {\"S\": \"$supplementId\"}}"
done

echo ""
echo "✅ Cache cleared! All items deleted."
