#!/bin/bash
# Script para monitorear el estado del portal
# Uso: ./scripts/monitorear-portal.sh [recommendation_id]

set -e

REC_ID="${1:-rec_1763421948586_57gemvkf9}"
REGION="us-east-1"
TABLE="ankosoft-portal-recommendations-staging"
API_URL="https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging"

echo "📊 MONITOREO DEL PORTAL"
echo "========================"
echo ""

# 1. Estado en DynamoDB
echo "1️⃣  Estado en DynamoDB:"
echo "   Recommendation ID: $REC_ID"
echo ""
aws dynamodb scan \
  --table-name "$TABLE" \
  --region "$REGION" \
  --filter-expression "recommendation_id = :recId" \
  --expression-attribute-values "{\":recId\":{\"S\":\"$REC_ID\"}}" \
  --query 'Items[0].{status:status.S, category:category.S, progress:progress.N, message:progressMessage.S, created:created_at.N, error:error.S}' \
  --output json 2>&1 | jq '.' 2>/dev/null || echo "   ⚠️  No encontrado o error"
echo ""

# 2. Estado del endpoint
echo "2️⃣  Estado del endpoint /portal/status:"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/portal/status/$REC_ID" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 5 2>&1)

HTTP_STATUS=$(echo "$STATUS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$STATUS_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" == "200" ]; then
  echo "   ✅ Endpoint funcionando"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "   ❌ HTTP $HTTP_STATUS"
  echo "   $BODY"
fi
echo ""

# 3. Últimos logs del Lambda
echo "3️⃣  Últimos logs del Lambda (últimos 5 minutos):"
aws logs tail /aws/lambda/ankosoft-formulation-api \
  --region "$REGION" \
  --since 5m \
  --format short \
  --filter-pattern "$REC_ID" 2>&1 | tail -10 || echo "   ⚠️  No hay logs recientes"
echo ""

# 4. Estado del CodeBuild (si hay un build en progreso)
echo "4️⃣  Estado del CodeBuild:"
LATEST_BUILD=$(aws codebuild list-builds-for-project \
  --project-name formulation-api-docker-build \
  --region "$REGION" \
  --max-items 1 \
  --query 'ids[0]' \
  --output text 2>/dev/null)

if [ -n "$LATEST_BUILD" ] && [ "$LATEST_BUILD" != "None" ]; then
  BUILD_STATUS=$(aws codebuild batch-get-builds \
    --ids "$LATEST_BUILD" \
    --region "$REGION" \
    --query 'builds[0].buildStatus' \
    --output text 2>/dev/null)
  
  if [ "$BUILD_STATUS" == "IN_PROGRESS" ]; then
    echo "   ⏳ Build en progreso: $LATEST_BUILD"
    echo "   Ver: https://console.aws.amazon.com/codesuite/codebuild/projects/formulation-api-docker-build/build/$LATEST_BUILD"
  elif [ "$BUILD_STATUS" == "SUCCEEDED" ]; then
    echo "   ✅ Último build exitoso"
  elif [ "$BUILD_STATUS" == "FAILED" ]; then
    echo "   ❌ Último build falló"
  else
    echo "   Estado: $BUILD_STATUS"
  fi
else
  echo "   ℹ️  No hay builds recientes"
fi
echo ""

echo "✅ Monitoreo completado"
echo ""
echo "💡 Para monitorear continuamente:"
echo "   watch -n 10 ./scripts/monitorear-portal.sh $REC_ID"

