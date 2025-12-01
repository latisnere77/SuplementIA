#!/bin/bash

# Trace "saw palmetto" search in production
# This will show the complete flow through all Lambda functions

echo "🔍 Searching for 'saw palmetto' logs in production..."
echo ""

# Get timestamp for last hour
START_TIME=$(date -u -v-1H +%s)
END_TIME=$(date -u +%s)

echo "Time range: $(date -u -v-1H) to $(date -u)"
echo ""

# Function to query logs
query_logs() {
  local LOG_GROUP=$1
  local QUERY_NAME=$2
  local QUERY=$3
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $QUERY_NAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  QUERY_ID=$(aws logs start-query \
    --log-group-name "$LOG_GROUP" \
    --start-time $START_TIME \
    --end-time $END_TIME \
    --query-string "$QUERY" \
    --output text)
  
  echo "Query ID: $QUERY_ID"
  echo "Waiting for results..."
  sleep 5
  
  aws logs get-query-results --query-id "$QUERY_ID" --output json | \
    jq -r '.results[] | .[] | select(.field == "@message") | .value' | \
    jq -r 'select(. != null)' 2>/dev/null || echo "No results found"
  
  echo ""
}

# 1. Check Next.js API Route logs
QUERY1='fields @timestamp, @message
| filter @message like /saw palmetto/i
| sort @timestamp desc
| limit 50'

query_logs "/aws/lambda/suplementia-enrich" "Next.js API Route (enrich)" "$QUERY1"

# 2. Check studies-fetcher Lambda logs
QUERY2='fields @timestamp, @message
| filter @message like /saw palmetto/i
| sort @timestamp desc
| limit 50'

query_logs "/aws/lambda/studies-fetcher" "Studies Fetcher Lambda" "$QUERY2"

# 3. Check content-enricher Lambda logs
QUERY3='fields @timestamp, @message
| filter @message like /saw palmetto/i
| sort @timestamp desc
| limit 50'

query_logs "/aws/lambda/content-enricher" "Content Enricher Lambda" "$QUERY3"

# 4. Look for any errors
QUERY4='fields @timestamp, @message
| filter @message like /saw palmetto/i and (@message like /error/i or @message like /failed/i or @message like /404/)
| sort @timestamp desc
| limit 20'

query_logs "/aws/lambda/suplementia-enrich" "Errors in Enrich Route" "$QUERY4"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Trace complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
