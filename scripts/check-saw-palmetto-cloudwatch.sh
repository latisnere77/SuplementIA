#!/bin/bash

# Check CloudWatch logs for "saw palmetto" searches
# This will show what happened in production

QUERY='fields @timestamp, @message
| filter @message like /saw palmetto/i
| sort @timestamp desc
| limit 50'

echo "🔍 Searching CloudWatch for 'saw palmetto' logs..."
echo ""

aws logs start-query \
  --log-group-name /aws/lambda/suplementia-enrich \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s) \
  --query-string "$QUERY" \
  --output json | jq -r '.queryId' > /tmp/query-id.txt

QUERY_ID=$(cat /tmp/query-id.txt)
echo "Query ID: $QUERY_ID"
echo "Waiting for results..."
sleep 5

aws logs get-query-results --query-id "$QUERY_ID" --output json | jq -r '.results[] | .[] | select(.field == "@message") | .value'
