#!/bin/bash

#
# Deploy Docker-based Lambda with Intelligent Evidence System
# Builds and pushes Docker image to ECR, then updates Lambda function
#

set -e  # Exit on error

echo "🚀 Deploying Backend Lambda (Docker) - Intelligent System"
echo "=========================================================="

# Configuration
FUNCTION_NAME="ankosoft-formulation-api"
REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/ankosoft-formulation-api"
IMAGE_TAG="latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Function: $FUNCTION_NAME"
echo "   Region: $REGION"
echo "   ECR Repo: $ECR_REPO"
echo "   Image Tag: $IMAGE_TAG"
echo ""

# Verificar que AWS CLI esté instalado
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI no está instalado${NC}"
    echo "Instala con: brew install awscli"
    exit 1
fi

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Instala con: brew install docker"
    exit 1
fi

# Verificar que Docker esté corriendo
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    echo "Inicia Docker Desktop o el daemon de Docker"
    exit 1
fi

# Verificar credenciales AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ No se encontraron credenciales AWS${NC}"
    echo "Configura con: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ Todas las verificaciones pasaron${NC}"
echo ""

# Authenticate Docker to ECR
echo -e "${BLUE}🔐 Autenticando Docker con ECR...${NC}"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Autenticación exitosa${NC}"
else
    echo -e "${RED}❌ Autenticación falló${NC}"
    exit 1
fi
echo ""

# Build Docker image using buildx for better compatibility
echo -e "${BLUE}🏗️  Construyendo imagen Docker con buildx...${NC}"

# Create builder if it doesn't exist
docker buildx create --name lambda-builder --use 2>/dev/null || docker buildx use lambda-builder || docker buildx use default

# Build for linux/amd64 with OCI image format
docker buildx build \
  --platform linux/amd64 \
  --output type=docker \
  -t $FUNCTION_NAME:$IMAGE_TAG \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Imagen construida exitosamente${NC}"
else
    echo -e "${RED}❌ Build falló${NC}"
    exit 1
fi
echo ""

# Tag image for ECR
echo -e "${BLUE}🏷️  Taggeando imagen para ECR...${NC}"
docker tag $FUNCTION_NAME:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG

echo -e "${GREEN}✅ Imagen taggeada${NC}"
echo ""

# Push image to ECR
echo -e "${BLUE}⬆️  Subiendo imagen a ECR...${NC}"
docker push $ECR_REPO:$IMAGE_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Imagen subida exitosamente${NC}"
else
    echo -e "${RED}❌ Push falló${NC}"
    exit 1
fi
echo ""

# Update Lambda function
echo -e "${BLUE}🔄 Actualizando función Lambda...${NC}"
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $ECR_REPO:$IMAGE_TAG \
    --region $REGION \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Lambda actualizado exitosamente${NC}"
else
    echo -e "${RED}❌ Actualización falló${NC}"
    exit 1
fi
echo ""

# Wait for Lambda to be updated
echo -e "${BLUE}⏳ Esperando a que Lambda esté listo...${NC}"
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $REGION

echo -e "${GREEN}✅ Lambda listo${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment completado exitosamente!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Configurar ENRICH_API_URL${NC}"
echo ""
echo "El Lambda está configurado con ENRICH_API_URL=http://localhost:3000/api/portal/enrich"
echo "Esto NO funcionará en producción."
echo ""
echo "Para actualizar la URL una vez que Next.js esté deployado:"
echo ""
echo "aws lambda update-function-configuration \\"
echo "  --function-name $FUNCTION_NAME \\"
echo "  --environment \"Variables={ENRICH_API_URL=https://tu-app.vercel.app/api/portal/enrich,...}\" \\"
echo "  --region $REGION"
echo ""
echo -e "${BLUE}📝 Para probar el Lambda:${NC}"
echo ""
echo "curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"category\":\"ashwagandha\",\"age\":30,\"gender\":\"male\",\"location\":\"CDMX\"}'"
echo ""
echo -e "${BLUE}📊 Para ver logs:${NC}"
echo ""
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
echo ""
