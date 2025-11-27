#!/bin/bash
set -e

# Script para agregar NAT Gateway temporalmente, ejecutar CodeBuild, y limpiarlo
# Costo: ~$0.05 por 1 hora de NAT Gateway

REGION="us-east-1"
VPC_ID="vpc-0d55802c172d83593"
PRIVATE_SUBNET_1="subnet-01882a33337e406d4"
PRIVATE_SUBNET_2="subnet-023be56d705def95b"

echo "=========================================="
echo "Setup Temporal de NAT Gateway"
echo "=========================================="
echo ""

# Step 1: Crear subnet pública
echo "Step 1: Creando subnet pública..."
PUBLIC_SUBNET=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block "10.0.100.0/24" \
  --availability-zone us-east-1a \
  --region "$REGION" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✓ Subnet pública creada: $PUBLIC_SUBNET"

# Step 2: Crear Internet Gateway
echo "Step 2: Creando Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --region "$REGION" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --vpc-id "$VPC_ID" \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"

echo "✓ Internet Gateway creado y adjuntado: $IGW_ID"

# Step 3: Crear Elastic IP para NAT
echo "Step 3: Creando Elastic IP..."
EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --region "$REGION" \
  --query 'AllocationId' \
  --output text)

echo "✓ Elastic IP creado: $EIP_ALLOC"

# Step 4: Crear NAT Gateway
echo "Step 4: Creando NAT Gateway..."
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id "$PUBLIC_SUBNET" \
  --allocation-id "$EIP_ALLOC" \
  --region "$REGION" \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "✓ NAT Gateway creado: $NAT_GW"
echo "Esperando que NAT Gateway esté disponible (2-3 minutos)..."

aws ec2 wait nat-gateway-available \
  --nat-gateway-ids "$NAT_GW" \
  --region "$REGION"

echo "✓ NAT Gateway disponible"

# Step 5: Actualizar route tables de subnets privadas
echo "Step 5: Actualizando route tables..."

# Obtener route table de subnet privada 1
RT_1=$(aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=$PRIVATE_SUBNET_1" \
  --region "$REGION" \
  --query 'RouteTables[0].RouteTableId' \
  --output text)

# Agregar ruta a NAT Gateway
aws ec2 create-route \
  --route-table-id "$RT_1" \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id "$NAT_GW" \
  --region "$REGION" || echo "Ruta ya existe"

echo "✓ Route tables actualizadas"

# Step 6: Ejecutar CodeBuild
echo ""
echo "Step 6: Ejecutando CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
  --project-name production-efs-setup \
  --region "$REGION" \
  --query 'build.id' \
  --output text)

echo "✓ Build iniciado: $BUILD_ID"
echo ""
echo "Esperando que build complete..."

# Monitorear build
while true; do
  BUILD_STATUS=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region "$REGION" \
    --query 'builds[0].buildStatus' \
    --output text)
  
  if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
    echo "✓ Build completado exitosamente!"
    break
  elif [ "$BUILD_STATUS" = "FAILED" ] || [ "$BUILD_STATUS" = "FAULT" ] || [ "$BUILD_STATUS" = "TIMED_OUT" ] || [ "$BUILD_STATUS" = "STOPPED" ]; then
    echo "✗ Build falló con estado: $BUILD_STATUS"
    break
  else
    echo "Build en progreso... ($BUILD_STATUS)"
    sleep 30
  fi
done

# Step 7: Cleanup (eliminar NAT Gateway y recursos)
echo ""
echo "Step 7: Limpiando recursos temporales..."

# Eliminar ruta
aws ec2 delete-route \
  --route-table-id "$RT_1" \
  --destination-cidr-block 0.0.0.0/0 \
  --region "$REGION" || true

# Eliminar NAT Gateway
aws ec2 delete-nat-gateway \
  --nat-gateway-id "$NAT_GW" \
  --region "$REGION"

echo "Esperando que NAT Gateway se elimine..."
aws ec2 wait nat-gateway-deleted \
  --nat-gateway-ids "$NAT_GW" \
  --region "$REGION" || true

# Liberar Elastic IP
aws ec2 release-address \
  --allocation-id "$EIP_ALLOC" \
  --region "$REGION"

# Desconectar y eliminar Internet Gateway
aws ec2 detach-internet-gateway \
  --vpc-id "$VPC_ID" \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"

aws ec2 delete-internet-gateway \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"

# Eliminar subnet pública
aws ec2 delete-subnet \
  --subnet-id "$PUBLIC_SUBNET" \
  --region "$REGION"

echo "✓ Recursos temporales eliminados"
echo ""
echo "=========================================="
echo "Setup Completo"
echo "=========================================="
echo ""
echo "Costo aproximado: $0.05 (5 centavos)"
echo ""

if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
  echo "✅ EFS setup completado exitosamente"
  exit 0
else
  echo "❌ EFS setup falló"
  exit 1
fi
