#!/bin/bash

# Delete ALL staging resources found
# This will eliminate ALL staging costs

set -e

REGION="us-east-1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${RED}⚠️  ELIMINAR TODOS LOS RECURSOS DE STAGING${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Se eliminarán:"
echo "  - 12 tablas DynamoDB staging"
echo "  - 12 funciones Lambda staging"
echo "  - 11 log groups staging"
echo ""
echo -e "${YELLOW}Ahorro estimado: $10-15/mes${NC}"
echo ""

read -p "¿Estás SEGURO? (escribe 'DELETE' para confirmar): " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo -e "${GREEN}✓ Cancelado${NC}"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Eliminando recursos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Delete DynamoDB tables
echo ""
echo "1. Eliminando tablas DynamoDB..."
TABLES=(
    "ankosoft-compound-analysis-staging"
    "ankosoft-demographic-knowledge-staging"
    "ankosoft-formulation-feedback-staging"
    "ankosoft-innovation-cache-staging"
    "ankosoft-market-intelligence-cache-staging"
    "ankosoft-portal-checkins-staging"
    "ankosoft-portal-quizzes-staging"
    "ankosoft-portal-recommendations-staging"
    "ankosoft-portal-referrals-staging"
    "ankosoft-portal-subscriptions-staging"
    "ankosoft-trial-results-staging"
    "tier2-study-cache-staging"
)

for TABLE in "${TABLES[@]}"; do
    echo "  Eliminando: $TABLE"
    aws dynamodb delete-table --table-name $TABLE --region $REGION 2>/dev/null || echo "    (ya eliminada o no existe)"
done

# Delete Lambda functions
echo ""
echo "2. Eliminando funciones Lambda..."
FUNCTIONS=(
    "ankosoft-problem-generator-staging"
    "ankosoft-compound-similarity-staging"
    "ankosoft-discovery-signal-validator-staging"
    "ankosoft-feedback-handler-staging"
    "ankosoft-market-intelligence-staging"
    "ankosoft-backend-staging-LogRetentionaae0aa3c5b4d4-1sIaloUtRa2V"
    "ankosoft-novel-compounds-staging"
    "ankosoft-cache-cleanup-staging"
    "TrialResultsStack-staging-LogRetentionaae0aa3c5b4d-JqnkJCZtB4Be"
    "ankosoft-trial-results-handler-staging"
    "ankosoft-cost-monitoring-staging"
    "ankosoft-innovation-analysis-staging"
)

for FUNCTION in "${FUNCTIONS[@]}"; do
    echo "  Eliminando: $FUNCTION"
    aws lambda delete-function --function-name $FUNCTION --region $REGION 2>/dev/null || echo "    (ya eliminada o no existe)"
done

# Delete CloudWatch log groups
echo ""
echo "3. Eliminando log groups..."
LOG_GROUPS=(
    "/aws/apigateway/ankosoft-staging"
    "/aws/lambda/TrialResultsStack-staging-LogRetentionaae0aa3c5b4d-JqnkJCZtB4Be"
    "/aws/lambda/ankosoft-backend-staging-LogRetentionaae0aa3c5b4d4-1sIaloUtRa2V"
    "/aws/lambda/ankosoft-cache-cleanup-staging"
    "/aws/lambda/ankosoft-compound-similarity-staging"
    "/aws/lambda/ankosoft-cost-monitoring-staging"
    "/aws/lambda/ankosoft-discovery-signal-validator-staging"
    "/aws/lambda/ankosoft-feedback-handler-staging"
    "/aws/lambda/ankosoft-innovation-analysis-staging"
    "/aws/lambda/ankosoft-market-intelligence-staging"
    "/aws/lambda/ankosoft-novel-compounds-staging"
)

for LOG_GROUP in "${LOG_GROUPS[@]}"; do
    echo "  Eliminando: $LOG_GROUP"
    aws logs delete-log-group --log-group-name "$LOG_GROUP" --region $REGION 2>/dev/null || echo "    (ya eliminado o no existe)"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Recursos de staging eliminados${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Eliminados:"
echo "  ✓ 12 tablas DynamoDB"
echo "  ✓ 12 funciones Lambda"
echo "  ✓ 11 log groups"
echo ""
echo -e "${GREEN}Ahorro mensual: ~$10-15/mes${NC}"
