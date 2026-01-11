#!/bin/bash

# Script para identificar y eliminar recursos AWS no utilizados
# ADVERTENCIA: Revisa cuidadosamente antes de ejecutar comandos de eliminación

set -e

ENVIRONMENT=${1:-staging}
REGION=${2:-us-east-1}

echo "🔍 Auditando recursos AWS en $ENVIRONMENT ($REGION)..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para calcular costos
calculate_monthly_cost() {
    local resource_type=$1
    local instance_type=$2
    
    case $resource_type in
        "rds-db.t3.micro")
            echo "~$14.71/mes"
            ;;
        "redis-cache.t3.micro")
            echo "~$37.96/mes"
            ;;
        "efs")
            echo "~$0.30/GB/mes"
            ;;
        *)
            echo "Desconocido"
            ;;
    esac
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. INSTANCIAS RDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RDS_INSTANCES=$(aws rds describe-db-instances \
    --region $REGION \
    --query "DBInstances[?contains(DBInstanceIdentifier, '$ENVIRONMENT')].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus,Engine]" \
    --output text 2>/dev/null || echo "")

if [ -z "$RDS_INSTANCES" ]; then
    echo -e "${GREEN}✓ No hay instancias RDS en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Instancias RDS encontradas:${NC}"
    echo "$RDS_INSTANCES" | while read -r line; do
        INSTANCE_ID=$(echo $line | awk '{print $1}')
        INSTANCE_CLASS=$(echo $line | awk '{print $2}')
        STATUS=$(echo $line | awk '{print $3}')
        
        COST=$(calculate_monthly_cost "rds-$INSTANCE_CLASS")
        echo "  - $INSTANCE_ID ($INSTANCE_CLASS) - Status: $STATUS - Costo: $COST"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws rds delete-db-instance --db-instance-identifier $INSTANCE_ID --skip-final-snapshot --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. CLUSTERS ELASTICACHE REDIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REDIS_CLUSTERS=$(aws elasticache describe-cache-clusters \
    --region $REGION \
    --query "CacheClusters[?contains(CacheClusterId, '$ENVIRONMENT')].[CacheClusterId,CacheNodeType,CacheClusterStatus]" \
    --output text 2>/dev/null || echo "")

if [ -z "$REDIS_CLUSTERS" ]; then
    echo -e "${GREEN}✓ No hay clusters Redis en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Clusters Redis encontrados:${NC}"
    echo "$REDIS_CLUSTERS" | while read -r line; do
        CLUSTER_ID=$(echo $line | awk '{print $1}')
        NODE_TYPE=$(echo $line | awk '{print $2}')
        STATUS=$(echo $line | awk '{print $3}')
        
        COST=$(calculate_monthly_cost "redis-$NODE_TYPE")
        echo "  - $CLUSTER_ID ($NODE_TYPE) - Status: $STATUS - Costo: $COST"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws elasticache delete-cache-cluster --cache-cluster-id $CLUSTER_ID --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. FILESYSTEMS EFS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EFS_FILESYSTEMS=$(aws efs describe-file-systems \
    --region $REGION \
    --query "FileSystems[?Tags[?Key=='Environment' && Value=='$ENVIRONMENT']].[FileSystemId,Name,SizeInBytes.Value]" \
    --output text 2>/dev/null || echo "")

if [ -z "$EFS_FILESYSTEMS" ]; then
    echo -e "${GREEN}✓ No hay filesystems EFS en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Filesystems EFS encontrados:${NC}"
    echo "$EFS_FILESYSTEMS" | while read -r line; do
        FS_ID=$(echo $line | awk '{print $1}')
        FS_NAME=$(echo $line | awk '{print $2}')
        SIZE_BYTES=$(echo $line | awk '{print $3}')
        SIZE_GB=$(echo "scale=2; $SIZE_BYTES / 1024 / 1024 / 1024" | bc)
        
        COST=$(echo "scale=2; $SIZE_GB * 0.30" | bc)
        echo "  - $FS_ID ($FS_NAME) - Size: ${SIZE_GB}GB - Costo: ~\$$COST/mes"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws efs delete-file-system --file-system-id $FS_ID --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. TABLAS DYNAMODB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DYNAMODB_TABLES=$(aws dynamodb list-tables \
    --region $REGION \
    --query "TableNames[?contains(@, '$ENVIRONMENT')]" \
    --output text 2>/dev/null || echo "")

if [ -z "$DYNAMODB_TABLES" ]; then
    echo -e "${GREEN}✓ No hay tablas DynamoDB en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Tablas DynamoDB encontradas:${NC}"
    for TABLE in $DYNAMODB_TABLES; do
        TABLE_INFO=$(aws dynamodb describe-table \
            --table-name $TABLE \
            --region $REGION \
            --query "Table.[TableName,TableStatus,ItemCount,TableSizeBytes]" \
            --output text 2>/dev/null)
        
        ITEM_COUNT=$(echo $TABLE_INFO | awk '{print $3}')
        SIZE_BYTES=$(echo $TABLE_INFO | awk '{print $4}')
        SIZE_MB=$(echo "scale=2; $SIZE_BYTES / 1024 / 1024" | bc)
        
        echo "  - $TABLE - Items: $ITEM_COUNT - Size: ${SIZE_MB}MB"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws dynamodb delete-table --table-name $TABLE --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. FUNCIONES LAMBDA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region $REGION \
    --query "Functions[?contains(FunctionName, '$ENVIRONMENT')].[FunctionName,LastModified,Runtime]" \
    --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_FUNCTIONS" ]; then
    echo -e "${GREEN}✓ No hay funciones Lambda en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Funciones Lambda encontradas:${NC}"
    echo "$LAMBDA_FUNCTIONS" | while read -r line; do
        FUNCTION_NAME=$(echo $line | awk '{print $1}')
        LAST_MODIFIED=$(echo $line | awk '{print $2}')
        RUNTIME=$(echo $line | awk '{print $3}')
        
        echo "  - $FUNCTION_NAME - Runtime: $RUNTIME - Last Modified: $LAST_MODIFIED"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws lambda delete-function --function-name $FUNCTION_NAME --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. CLOUDWATCH LOG GROUPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_GROUPS=$(aws logs describe-log-groups \
    --region $REGION \
    --query "logGroups[?contains(logGroupName, '$ENVIRONMENT')].[logGroupName,storedBytes,retentionInDays]" \
    --output text 2>/dev/null || echo "")

if [ -z "$LOG_GROUPS" ]; then
    echo -e "${GREEN}✓ No hay log groups en $ENVIRONMENT${NC}"
else
    echo -e "${YELLOW}⚠ Log groups encontrados:${NC}"
    echo "$LOG_GROUPS" | while read -r line; do
        LOG_GROUP=$(echo $line | awk '{print $1}')
        STORED_BYTES=$(echo $line | awk '{print $2}')
        RETENTION=$(echo $line | awk '{print $3}')
        STORED_MB=$(echo "scale=2; $STORED_BYTES / 1024 / 1024" | bc)
        
        echo "  - $LOG_GROUP - Size: ${STORED_MB}MB - Retention: ${RETENTION} days"
        
        # Comando para eliminar (comentado por seguridad)
        echo "    # aws logs delete-log-group --log-group-name $LOG_GROUP --region $REGION"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${RED}⚠ ADVERTENCIA:${NC} Los comandos de eliminación están comentados por seguridad."
echo "Para eliminar recursos:"
echo "  1. Revisa cuidadosamente cada recurso"
echo "  2. Descomenta los comandos que quieras ejecutar"
echo "  3. Ejecuta manualmente cada comando"
echo ""
echo "Para eliminar TODO el stack de CloudFormation:"
echo "  aws cloudformation delete-stack --stack-name $ENVIRONMENT-intelligent-search --region $REGION"
echo ""
echo "Ver costos detallados en: infrastructure/AWS-COST-ANALYSIS.md"
