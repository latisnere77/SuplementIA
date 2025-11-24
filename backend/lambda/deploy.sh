#!/bin/bash

#
# Deploy Script para Backend Lambda
# Sube el código Python a AWS Lambda
#

set -e  # Exit on error

echo "🚀 Deploying Backend Lambda (Capa 3 - Guardrails)"
echo "================================================"

# Configuración
LAMBDA_FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-"suplementia-recommendation-lambda"}
REGION=${AWS_REGION:-"us-east-1"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que AWS CLI esté instalado
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI no está instalado${NC}"
    echo "Instala con: brew install awscli"
    exit 1
fi

# Verificar credenciales AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ No se encontraron credenciales AWS${NC}"
    echo "Configura con: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configurado correctamente${NC}"
echo ""

# Crear directorio temporal
TMP_DIR=$(mktemp -d)
echo "📦 Creando paquete en: $TMP_DIR"

# Copiar archivos Python
cp query_validator.py "$TMP_DIR/"
cp lambda_function.py "$TMP_DIR/"

# Crear ZIP
cd "$TMP_DIR"
zip -r lambda-package.zip query_validator.py lambda_function.py
cd -

echo -e "${GREEN}✅ Paquete ZIP creado${NC}"
echo ""

# Subir a Lambda
echo "⬆️  Subiendo a AWS Lambda: $LAMBDA_FUNCTION_NAME"
echo "   Región: $REGION"

aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file "fileb://$TMP_DIR/lambda-package.zip" \
    --region "$REGION" \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy exitoso!${NC}"
    echo ""
    echo "📝 Verificar deployment:"
    echo "   aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION"
    echo ""
    echo "🧪 Probar Lambda:"
    echo "   ./test_lambda.sh"
else
    echo -e "${RED}❌ Deploy falló${NC}"
    exit 1
fi

# Limpiar
rm -rf "$TMP_DIR"

echo ""
echo -e "${GREEN}🎉 Deployment completado${NC}"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Verifica que el Lambda tenga permisos para llamar a Bedrock"
echo "   2. Configura las variables de entorno si es necesario"
echo "   3. Prueba el endpoint con un POST request"
