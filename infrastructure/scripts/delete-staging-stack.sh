#!/bin/bash

# Script para ELIMINAR DEFINITIVAMENTE el stack de staging
# ADVERTENCIA: Esta acción es IRREVERSIBLE

set -e

STACK_NAME="staging-intelligent-search"
REGION="us-east-1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${RED}⚠️  ELIMINACIÓN DEFINITIVA DE STAGING${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""
echo -e "${RED}ESTA ACCIÓN ELIMINARÁ:${NC}"
echo "  - RDS Postgres instance (~$14.71/mes)"
echo "  - ElastiCache Redis cluster (~$37.96/mes)"
echo "  - EFS filesystem"
echo "  - DynamoDB tables"
echo "  - Lambda functions"
echo "  - VPC y subnets"
echo "  - Security groups"
echo "  - CloudWatch logs"
echo ""
echo -e "${YELLOW}Ahorro mensual estimado: ~$60-70/mes${NC}"
echo ""

# Confirmación 1
read -p "¿Estás SEGURO que quieres eliminar staging? (escribe 'SI' para continuar): " confirm1
if [ "$confirm1" != "SI" ]; then
    echo -e "${GREEN}✓ Cancelado. No se eliminó nada.${NC}"
    exit 0
fi

# Confirmación 2
echo ""
echo -e "${RED}ÚLTIMA ADVERTENCIA: Esta acción es IRREVERSIBLE${NC}"
read -p "Escribe el nombre del stack '$STACK_NAME' para confirmar: " confirm2
if [ "$confirm2" != "$STACK_NAME" ]; then
    echo -e "${GREEN}✓ Cancelado. No se eliminó nada.${NC}"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Iniciando eliminación..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que el stack existe
echo "1. Verificando que el stack existe..."
if ! aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo -e "${YELLOW}⚠ El stack '$STACK_NAME' no existe o ya fue eliminado${NC}"
    exit 0
fi

# Deshabilitar protección contra eliminación si existe
echo "2. Deshabilitando protección contra eliminación..."
aws cloudformation update-termination-protection \
    --no-enable-termination-protection \
    --stack-name $STACK_NAME \
    --region $REGION 2>/dev/null || true

# Eliminar stack
echo "3. Eliminando stack de CloudFormation..."
aws cloudformation delete-stack \
    --stack-name $STACK_NAME \
    --region $REGION

echo ""
echo -e "${YELLOW}⏳ Esperando a que se complete la eliminación...${NC}"
echo "   (Esto puede tomar 5-10 minutos)"
echo ""

# Esperar a que se complete
aws cloudformation wait stack-delete-complete \
    --stack-name $STACK_NAME \
    --region $REGION

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Stack de staging eliminado exitosamente${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Recursos eliminados:"
echo "  ✓ RDS Postgres"
echo "  ✓ ElastiCache Redis"
echo "  ✓ EFS filesystem"
echo "  ✓ DynamoDB tables"
echo "  ✓ Lambda functions"
echo "  ✓ VPC y networking"
echo "  ✓ CloudWatch logs"
echo ""
echo -e "${GREEN}Ahorro mensual: ~$60-70/mes${NC}"
echo ""

# Verificar recursos huérfanos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verificando recursos huérfanos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Buscar snapshots de RDS
echo "Buscando snapshots de RDS..."
SNAPSHOTS=$(aws rds describe-db-snapshots \
    --region $REGION \
    --query "DBSnapshots[?contains(DBSnapshotIdentifier, 'staging')].DBSnapshotIdentifier" \
    --output text 2>/dev/null || echo "")

if [ -n "$SNAPSHOTS" ]; then
    echo -e "${YELLOW}⚠ Snapshots encontrados (pueden generar costos):${NC}"
    for snapshot in $SNAPSHOTS; do
        echo "  - $snapshot"
        echo "    # aws rds delete-db-snapshot --db-snapshot-identifier $snapshot --region $REGION"
    done
else
    echo -e "${GREEN}✓ No hay snapshots huérfanos${NC}"
fi

echo ""

# Buscar log groups
echo "Buscando CloudWatch log groups..."
LOG_GROUPS=$(aws logs describe-log-groups \
    --region $REGION \
    --query "logGroups[?contains(logGroupName, 'staging')].logGroupName" \
    --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    echo -e "${YELLOW}⚠ Log groups encontrados (pueden generar costos):${NC}"
    for log_group in $LOG_GROUPS; do
        echo "  - $log_group"
        echo "    # aws logs delete-log-group --log-group-name $log_group --region $REGION"
    done
else
    echo -e "${GREEN}✓ No hay log groups huérfanos${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Eliminación completada${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
