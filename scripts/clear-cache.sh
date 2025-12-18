#!/bin/bash
# Clear all DynamoDB cache

TABLE_NAME="suplementia-content-enricher-cache"
REGION="us-east-1"

echo "🗑️  Clearing cache from $TABLE_NAME..."

aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --attributes-to-get supplementId \
    --output json | \
jq -r '.Items[].supplementId.S' | \
while read supplementId; do
    echo "Deleting: $supplementId"
    aws dynamodb delete-item \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --key "{\"supplementId\": {\"S\": \"$supplementId\"}}"
done

echo "✅ Cache cleared!"
