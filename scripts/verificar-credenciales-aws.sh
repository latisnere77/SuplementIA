#!/bin/bash

# Script de Verificación de Credenciales AWS para Vercel
# Verifica que las credenciales AWS configuradas en Vercel funcionan correctamente
# para acceder a DynamoDB y la tabla de recomendaciones del portal

set -e

echo "🔍 VERIFICACIÓN DE CREDENCIALES AWS"
echo "===================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que las variables de entorno estén configuradas
echo "1️⃣  Verificando variables de entorno..."
echo ""

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo -e "${RED}❌ AWS_ACCESS_KEY_ID no está configurada${NC}"
    echo "   Configura: export AWS_ACCESS_KEY_ID=tu_access_key_id"
    exit 1
else
    echo -e "${GREEN}✅ AWS_ACCESS_KEY_ID está configurada${NC}"
    echo "   Key ID: ${AWS_ACCESS_KEY_ID:0:8}..."
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ AWS_SECRET_ACCESS_KEY no está configurada${NC}"
    echo "   Configura: export AWS_SECRET_ACCESS_KEY=tu_secret_key"
    exit 1
else
    echo -e "${GREEN}✅ AWS_SECRET_ACCESS_KEY está configurada${NC}"
    echo "   Secret: ${AWS_SECRET_ACCESS_KEY:0:8}..."
fi

AWS_REGION=${AWS_REGION:-us-east-1}
echo -e "${GREEN}✅ AWS_REGION: $AWS_REGION${NC}"
echo ""

# Verificar identidad del usuario
echo "2️⃣  Verificando identidad AWS..."
echo ""

IDENTITY=$(aws sts get-caller-identity --region "$AWS_REGION" 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al verificar identidad:${NC}"
    echo "$IDENTITY"
    exit 1
fi

USER_ARN=$(echo "$IDENTITY" | jq -r '.Arn' 2>/dev/null || echo "unknown")
USER_ID=$(echo "$IDENTITY" | jq -r '.UserId' 2>/dev/null || echo "unknown")
ACCOUNT=$(echo "$IDENTITY" | jq -r '.Account' 2>/dev/null || echo "unknown")

echo -e "${GREEN}✅ Identidad verificada:${NC}"
echo "   ARN: $USER_ARN"
echo "   User ID: $USER_ID"
echo "   Account: $ACCOUNT"
echo ""

# Verificar que el usuario es vercel-ankosoft
if [[ "$USER_ARN" == *"vercel-ankosoft"* ]]; then
    echo -e "${GREEN}✅ Usuario correcto: vercel-ankosoft${NC}"
else
    echo -e "${YELLOW}⚠️  Advertencia: El usuario no parece ser vercel-ankosoft${NC}"
    echo "   ARN: $USER_ARN"
fi
echo ""

# Verificar permisos de DynamoDB
echo "3️⃣  Verificando permisos de DynamoDB..."
echo ""

TABLE_NAME="ankosoft-portal-recommendations-staging"
TABLE_ARN="arn:aws:dynamodb:${AWS_REGION}:${ACCOUNT}:table/${TABLE_NAME}"

echo "   Tabla: $TABLE_NAME"
echo "   ARN: $TABLE_ARN"
echo ""

# Verificar que la tabla existe
echo "   Verificando existencia de la tabla..."
TABLE_INFO=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$AWS_REGION" 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al acceder a la tabla:${NC}"
    echo "$TABLE_INFO"
    exit 1
fi

TABLE_STATUS=$(echo "$TABLE_INFO" | jq -r '.Table.TableStatus' 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ Tabla existe (Status: $TABLE_STATUS)${NC}"
echo ""

# Probar ScanCommand (el que usa el frontend)
echo "4️⃣  Probando ScanCommand (operación usada por el frontend)..."
echo ""

SCAN_RESULT=$(aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --region "$AWS_REGION" \
    --max-items 1 \
    --query 'Items[0].recommendation_id.S' \
    --output text \
    2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al ejecutar ScanCommand:${NC}"
    echo "$SCAN_RESULT"
    echo ""
    echo "Posibles causas:"
    echo "  - Permisos insuficientes (falta dynamodb:Scan)"
    echo "  - La tabla no existe o no es accesible"
    echo "  - Credenciales incorrectas"
    exit 1
fi

echo -e "${GREEN}✅ ScanCommand ejecutado exitosamente${NC}"
if [ -n "$SCAN_RESULT" ] && [ "$SCAN_RESULT" != "None" ]; then
    echo "   Primer recommendation_id encontrado: $SCAN_RESULT"
else
    echo "   Tabla vacía (esto es normal si no hay recomendaciones)"
fi
echo ""

# Probar GetItem (operación alternativa)
echo "5️⃣  Probando GetItem (operación alternativa)..."
echo ""

# Intentar GetItem con una clave de ejemplo (puede fallar si no existe, pero no debe fallar por permisos)
GET_RESULT=$(aws dynamodb get-item \
    --table-name "$TABLE_NAME" \
    --region "$AWS_REGION" \
    --key '{"recommendation_id": {"S": "test"}, "quiz_id": {"S": "test"}}' \
    --query 'Item' \
    --output json \
    2>&1)

if [ $? -ne 0 ]; then
    # Verificar si el error es por permisos o porque el item no existe
    if [[ "$GET_RESULT" == *"AccessDenied"* ]] || [[ "$GET_RESULT" == *"UnauthorizedOperation"* ]]; then
        echo -e "${RED}❌ Error de permisos al ejecutar GetItem:${NC}"
        echo "$GET_RESULT"
        exit 1
    else
        echo -e "${YELLOW}⚠️  GetItem falló (probablemente porque el item no existe, esto es normal)${NC}"
    fi
else
    echo -e "${GREEN}✅ GetItem ejecutado exitosamente${NC}"
fi
echo ""

# Resumen final
echo "===================================="
echo -e "${GREEN}✅ VERIFICACIÓN COMPLETA${NC}"
echo "===================================="
echo ""
echo "Resumen:"
echo "  ✅ Credenciales AWS configuradas"
echo "  ✅ Identidad verificada"
echo "  ✅ Tabla DynamoDB accesible"
echo "  ✅ Permisos de ScanCommand verificados"
echo ""
echo "Las credenciales están listas para usar en Vercel."
echo ""
echo "Para configurar en Vercel:"
echo "  1. Ve a Settings → Environment Variables"
echo "  2. Agrega:"
echo "     - AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
echo "     - AWS_SECRET_ACCESS_KEY=<tu_secret_key>"
echo "     - AWS_REGION=$AWS_REGION"
echo "  3. Redeploy el proyecto"
echo ""

